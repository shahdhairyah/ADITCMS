<?php
/**
 * ADIT College Management System - Database Installer
 * ----------------------------------------------------
 * Creates every table, seeds demo data, and generates REAL bcrypt
 * password hashes (the .sql seed file cannot contain valid hashes,
 * because bcrypt output is salted by PHP's password_hash()).
 *
 * CLI   :  php database/install.php
 * Web   :  https://<your-host>/database/install.php?key=<INSTALL_KEY>
 *
 * The web form is refused unless ?key= matches INSTALL_KEY, and it
 * refuses to run twice unless ?force=1 is also supplied. A lock file
 * is written on success so the installer cannot be replayed.
 */

declare(strict_types=1);

const IS_CLI = PHP_SAPI === 'cli';

// ---------------------------------------------------------------- config
$configPath = __DIR__ . '/../api/config/config.php';
if (!is_file($configPath)) {
    exit("ERROR: cannot find api/config/config.php\n");
}
require_once $configPath;

$dsn  = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
$log  = [];
$fail = 0;

function say(string $line): void { echo $line . PHP_EOL; }
function step(string $line): void { echo "  -> $line" . PHP_EOL; }
function fail(string $line): void { echo "  !! $line" . PHP_EOL; }

/**
 * Split a SQL script into individual statements.
 *
 * A plain explode(';') is not good enough here: the schema contains
 * semicolons inside quoted strings and inside a one-line
 * "PREPARE ...; EXECUTE ...; DEALLOCATE ..." block, and PDO with
 * EMULATE_PREPARES=false rejects multi-statement exec(). This tokenizer
 * understands single/double quoted literals, backtick identifiers,
 * -- / # line comments and slash-star block comments, so semicolons are
 * only honoured at true statement boundaries.
 *
 * @return string[]
 */
function splitSqlStatements(string $sql): array {
    $out     = [];
    $current = '';
    $len     = strlen($sql);
    $i       = 0;
    $inSingle = false;
    $inDouble = false;
    $inBacktick = false;

    while ($i < $len) {
        $ch   = $sql[$i];
        $next = $i + 1 < $len ? $sql[$i + 1] : '';

        if ($inSingle || $inDouble) {
            $current .= $ch;
            if ($ch === '\\' && $next !== '') {           // escaped char
                $current .= $next;
                $i += 2;
                continue;
            }
            if ($ch === ($inSingle ? "'" : '"')) {       // '' or "" doubling
                if ($next === $ch) {
                    $current .= $next;
                    $i += 2;
                    continue;
                }
                $inSingle = $inDouble = false;
            }
            $i++;
            continue;
        }

        if ($inBacktick) {
            $current .= $ch;
            if ($ch === '`') {
                if ($next === '`') {                     // `` escape
                    $current .= $next;
                    $i += 2;
                    continue;
                }
                $inBacktick = false;
            }
            $i++;
            continue;
        }

        // line comment: "--" followed by whitespace, or "#"
        if (($ch === '-' && $next === '-' && $i + 2 < $len && ctype_space($sql[$i + 2])) || $ch === '#') {
            while ($i < $len && $sql[$i] !== "\n") {
                $i++;
            }
            continue;
        }
        // block comment
        if ($ch === '/' && $next === '*') {
            $end = strpos($sql, '*/', $i + 2);
            $i   = ($end === false) ? $len : $end + 2;
            $current .= "\n";
            continue;
        }
        if ($ch === "'")  { $inSingle   = true; $current .= $ch; $i++; continue; }
        if ($ch === '"')  { $inDouble   = true; $current .= $ch; $i++; continue; }
        if ($ch === '`')  { $inBacktick = true; $current .= $ch; $i++; continue; }

        if ($ch === ';') {
            $trimmed = trim($current);
            if ($trimmed !== '') {
                $out[] = $trimmed;
            }
            $current = '';
            $i++;
            continue;
        }

        $current .= $ch;
        $i++;
    }

    $trimmed = trim($current);
    if ($trimmed !== '') {
        $out[] = $trimmed;
    }

    return $out;
}

// ------------------------------------------------------- guard (web mode)
if (!IS_CLI) {
    header('Content-Type: text/plain; charset=utf-8');

    $lockFile = __DIR__ . '/.installed.lock';
    $supplied = $_GET['key'] ?? '';

    if (!hash_equals((string) INSTALL_KEY, (string) $supplied)) {
        http_response_code(403);
        exit("403 Forbidden\n\nInvalid or missing install key.\n");
    }
    if (is_file($lockFile) && empty($_GET['force'])) {
        http_response_code(409);
        exit("409 Already installed\n\nThe installer has already run on this server.\n"
           . "Delete database/.installed.lock to re-run it.\n");
    }
    // Never let PHP render engine notices into the output.
    @ini_set('display_errors', '0');
}

say('');
say('=====================================================');
say(' ADIT CMS - Database Installer');
say(' Host: ' . DB_HOST . '   DB: ' . DB_NAME);
say('=====================================================');
say('');

// ------------------------------------------------------------- 1. connect
try {
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]);
    say('[1/5] Connected to MySQL ' . $pdo->getAttribute(PDO::ATTR_SERVER_VERSION));
} catch (PDOException $e) {
    exit("\nCONNECTION FAILED: " . $e->getMessage() . "\n");
}
say('');

// ------------------------------------------------------ 2. run the schema
$sqlFile = __DIR__ . '/adit_cms_complete.sql';
if (!is_file($sqlFile)) {
    exit("ERROR: missing database/adit_cms_complete.sql\n");
}
$sql = (string) file_get_contents($sqlFile);

say('[2/5] Applying schema + seed data');

// Strip the database-level statements: the host may not allow CREATE DATABASE.
$sql = preg_replace('/^\s*CREATE\s+DATABASE[^;]*;/mi', '', $sql);
$sql = preg_replace('/^\s*USE\s+[`\w]+\s*;/mi', '', $sql);

$statements = splitSqlStatements($sql);

$executed = 0;
try {
    foreach ($statements as $stmtText) {
        if (stripos($stmtText, 'SET FOREIGN_KEY_CHECKS') === 0) {
            continue; // handled separately
        }
        if (stripos($stmtText, 'SET ') === 0 && stripos($stmtText, 'SQL_MODE') !== false) {
            continue; // server defaults only; a restricted host may reject these
        }

        try {
            $pdo->exec($stmtText);
            $executed++;
        } catch (PDOException $e) {
            $msg  = $e->getMessage();
            $head = strtok($stmtText, " \n\t(") ?: substr($stmtText, 0, 60);

            // Tolerate the situations that are expected on a re-run. These
            // are matched narrowly so a genuinely broken statement is not
            // silently swallowed.
            $benign = [
                1060, // ER_TABLE_EXISTS_ERROR
                1061, // ER_DUP_KEYNAME
                1062, // ER_DUP_ENTRY
                1050, // ER_TABLE_EXISTS_ERROR (alternate code)
                1022, // ER_DUP_KEY
                1826, // ER_FK_DUP_NAME
                1830, // ER_FK_NO_INDEX? (index already present)
            ];
            $code = (int) ($e->errorInfo[1] ?? 0);
            $isBenign = in_array($code, $benign, true);

            if ($isBenign) {
                step('skip (already applied): ' . substr($head, 0, 60));
            } else {
                $fail++;
                fail(substr($head, 0, 60) . ' -> ' . substr($msg, 0, 200));
            }
        }
    }
} finally {
    $pdo->exec('SET FOREIGN_KEY_CHECKS = 1');
}
say('     ' . $executed . ' statements executed, ' . $fail . ' failed');
say('');

// ------------------------------------------------- 3. real password hashes
say('[3/5] Setting real bcrypt password hashes');

$demoAccounts = [
    'admin@adit.edu'        => 'Admin@123',
    'hod.ce@adit.edu'       => 'Hod@123',
    'ravi.sharma@adit.edu'  => 'Faculty@123',
    'priya.patel@adit.edu'  => 'Faculty@123',
    'amit.trivedi@adit.edu' => 'Faculty@123',
    'librarian@adit.edu'    => 'Lib@123',
    'student01@adit.edu'    => 'Student@123',
    'student02@adit.edu'    => 'Student@123',
    'student03@adit.edu'    => 'Student@123',
    'student04@adit.edu'    => 'Student@123',
    'student05@adit.edu'    => 'Student@123',
    'student06@adit.edu'    => 'Student@123',
];

$update = $pdo->prepare('UPDATE users SET password_hash = ? WHERE email = ?');
$touched = 0;

foreach ($demoAccounts as $email => $plain) {
    $hash = password_hash($plain, PASSWORD_BCRYPT, ['cost' => 12]);
    if ($hash === false) {
        fail("could not hash password for $email");
        $fail++;
        continue;
    }
    $update->execute([$hash, $email]);
    if ($update->rowCount() === 0) {
        fail("no users row matched $email - is the seed data present?");
        $fail++;
        continue;
    }
    $touched++;
    // Never echo the hash: bcrypt hashes are password-cracking material and
    // this script can be run over the web.
    step(sprintf('%-24s hash set (cost 12)', $email));
}
say('     ' . $touched . ' of ' . count($demoAccounts) . ' account(s) updated');
say('');

// ------------------------------------------------------------- 4. verify
say('[4/5] Verifying');
$checks = [];
foreach ($demoAccounts as $email => $plain) {
    $row = $pdo->query("SELECT password_hash FROM users WHERE email = "
        . $pdo->quote($email))->fetch();
    $checks[$email] = $row ? password_verify($plain, $row['password_hash']) : false;
}
$bad = array_keys(array_filter($checks, static fn($ok) => !$ok));
if ($bad) {
    foreach ($bad as $e) {
        fail("password_verify FAILED for $e");
    }
    $fail++;
} else {
    say('     password_verify passed for all ' . count($checks) . ' accounts');
}

say('[5/5] Finalising');

$counts = [];
foreach (['users', 'students', 'faculty', 'subjects', 'departments', 'assignments',
          'attendance', 'unit_tests', 'external_marks', 'results', 'fee_structures',
          'fee_payments', 'books', 'book_issues', 'notices', 'timetables',
          'lab_manuals', 'study_materials', 'syllabus'] as $table) {
    try {
        $counts[$table] = (int) $pdo->query("SELECT COUNT(*) FROM `$table`")->fetchColumn();
    } catch (PDOException $e) {
        $counts[$table] = -1;
        fail("could not count $table -> " . $e->getMessage());
        $fail++;
    }
}
foreach ($counts as $table => $n) {
    step(sprintf('%-18s %s', $table, $n < 0 ? 'MISSING' : $n . ' rows'));
}
say('');

// ------------------------------------------------------------------ done
if (IS_CLI) {
    say('Demo credentials:');
    foreach ($demoAccounts as $email => $plain) {
        say(sprintf('  %-24s %s', $email, $plain));
    }
}

if ($fail > 0) {
    // Do NOT write the lock file on a partial install: the operator needs to
    // be able to fix the "!!" lines and run this again.
    say('');
    say('FINISHED WITH ' . $fail . ' PROBLEM(S) - review the "!!" lines above.');
    say('No lock file was written, so you can fix the issues and re-run.');
    exit(1);
}

@file_put_contents(__DIR__ . '/.installed.lock', 'installed at ' . date('c'));

say('');
say('=====================================================');
say(' INSTALL COMPLETE - all ' . count($demoAccounts) . ' accounts unlocked');
say('=====================================================');
exit(0);
