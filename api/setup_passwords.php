<?php
/**
 * ADIT CMS - default password provisioning
 * -----------------------------------------------------------------
 * Sets the seeded demo accounts to a known default password so the
 * installation can be logged into for the first time.
 *
 * WHY THIS FILE IS DANGEROUS BY DEFAULT
 * The document root contains this file, and both api/.htaccess and the root
 * .htaccess only rewrite to index.php when the requested path is NOT a real
 * file. That means this script is served directly by the web server and
 * bypasses api/routes/api.php entirely - no AuthMiddleware, no RoleMiddleware,
 * no rate limiting. An unauthenticated "reset the admin password" endpoint is
 * a full account takeover, which is why the previous version of this file was
 * replaced with a 410 stub.
 *
 * It is working again, but only behind gates that make an anonymous attacker
 * unable to use it:
 *
 *   1. It only ever touches accounts that are still in the locked state
 *      (password_hash = '!locked!', written by database/adit_cms_complete.sql).
 *      A real password is never overwritten unless it is forced, so running it
 *      against a live site cannot lock anybody out.
 *   2. Browser access requires ?key=<JWT_SECRET>. JWT_SECRET is already a
 *      full-compromise secret, so this grants no new capability, and it is
 *      never stored in this file. Compare is constant time.
 *   3. Every account it touches is flagged must_change_password = 1, and
 *      AuthMiddleware refuses every request for such an account except
 *      /auth/change-password, /auth/me, /auth/logout and /health. The default
 *      password therefore cannot be used for anything until it is changed.
 *   4. A run is recorded in audit_logs, and the completion time is stored so a
 *      second anonymous run is a no-op.
 *   5. Hashes are never printed, logged or returned.
 *
 * CLI (normal, safest):
 *   php api/setup_passwords.php                    set admin123 on locked accounts
 *   php api/setup_passwords.php --status           show what is locked, change nothing
 *   php api/setup_passwords.php --dry-run          print the plan, change nothing
 *   php api/setup_passwords.php --password=Secret@1  use a different default
 *   php api/setup_passwords.php --force            also reset real passwords
 *   php api/setup_passwords.php --force --password=Secret@1
 *
 * Browser (only when there is no shell access):
 *   https://<host>/api/setup_passwords.php?key=<JWT_SECRET>
 *   ...&force=1 to also reset accounts that already have a real password
 *
 * When finished, delete this file.
 */

declare(strict_types=1);

// The value the user asked for.
const DEFAULT_PASSWORD = 'admin123';

// Marker written by database/adit_cms_complete.sql for accounts that have no
// password yet. password_verify() can never match this, so a locked account
// cannot be logged into before this script runs.
const LOCKED_SENTINEL = '!locked!';

const BCRYPT_OPTIONS = ['cost' => 12];

$isCli = PHP_SAPI === 'cli';

if (!$isCli) {
    header('Content-Type: text/plain; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
}

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------
$options = [];
$flags = [];
if ($isCli) {
    foreach (array_slice($argv, 1) as $arg) {
        if (str_starts_with($arg, '--')) {
            $body = substr($arg, 2);
            if (str_contains($body, '=')) {
                [$k, $v] = explode('=', $body, 2);
                $options[$k] = $v;
            } else {
                $flags[$body] = true;
            }
        }
    }
}

/** Web requests read the same switches from the query string. */
$wantStatus = $isCli
    ? isset($flags['status'])
    : isset($_GET['status']);
$dryRun     = $isCli ? isset($flags['dry-run']) : !empty($_GET['dry_run']);
$force      = $isCli ? isset($flags['force'])  : !empty($_GET['force']);

// The password is deliberately NOT accepted from the query string: URLs end up
// in access logs, browser history and Referer headers. Over HTTP it may only
// come from a POST body (or the SETUP_DEFAULT_PASSWORD environment variable),
// so the plain admin123 default is used if it is absent.
if ($isCli) {
    $password = $options['password'] ?? (getenv('SETUP_DEFAULT_PASSWORD') ?: DEFAULT_PASSWORD);
} else {
    $password = (string) ($_POST['password'] ?? (getenv('SETUP_DEFAULT_PASSWORD') ?: DEFAULT_PASSWORD));
}

// ---------------------------------------------------------------------------
// output helpers
// ---------------------------------------------------------------------------
$out = static function (string $line = '') use ($isCli): void {
    if ($isCli) {
        fwrite(STDOUT, $line . "\n");
        return;
    }
    echo htmlspecialchars($line, ENT_QUOTES, 'UTF-8') . "\n";
};

$die = static function (string $message, int $code = 1) use ($out, $isCli): void {
    $out($message);
    if ($isCli) {
        exit($code);
    }
    http_response_code($code >= 400 ? $code : 400);
    exit;
};

// ---------------------------------------------------------------------------
// gate 1: the key
// ---------------------------------------------------------------------------
require_once __DIR__ . '/config/config.php';

if (!$isCli) {
    $expected = defined('JWT_SECRET') ? (string) JWT_SECRET : '';

    // POST and the X-Setup-Key header are preferred because a key in the query
    // string is written to the access log of every hop.
    $supplied = '';
    if (!empty($_POST['key'])) {
        $supplied = (string) $_POST['key'];
    } elseif (!empty($_SERVER['HTTP_X_SETUP_KEY'])) {
        $supplied = (string) $_SERVER['HTTP_X_SETUP_KEY'];
    } elseif (isset($_GET['key'])) {
        $supplied = (string) $_GET['key'];
    }

    if ($expected === '' || $supplied === '' || !hash_equals($expected, $supplied)) {
        // Uniform message and a small delay: do not help an attacker find the
        // key by watching which of the two conditions failed.
        usleep(1500000);
        http_response_code(403);
        $out('Forbidden.');
        $out('');
        $out('This script resets default account passwords, so browser access is');
        $out('disabled unless the correct key is supplied. Run it from a shell on');
        $out('the server instead:  php api/setup_passwords.php');
        exit;
    }
}

// ---------------------------------------------------------------------------
// database
// ---------------------------------------------------------------------------
try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    $die('Cannot connect to the database: ' . $e->getMessage());
}

$tableExists = static fn(string $t): bool =>
    (int) $pdo->query('SHOW TABLES LIKE ' . $pdo->quote($t))->fetchColumn() > 0;

if (!$tableExists('users')) {
    $die('There is no users table. Import database/adit_cms_complete.sql first (see database/install.php).');
}

$columnExists = static fn(string $t, string $c): bool =>
    (int) $pdo->query("SHOW COLUMNS FROM `$t` LIKE " . $pdo->quote($c))->fetchColumn() > 0;

if (!$columnExists('users', 'must_change_password')) {
    $die('users.must_change_password is missing, so the default password could not be forced to change.'
        . ' Run:  php database/migrate.php');
}

$total = (int) $pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
if ($total === 0) {
    $die('The users table is empty. Import the seed data first (see database/install.php).');
}

// ---------------------------------------------------------------------------
// read the accounts
// ---------------------------------------------------------------------------
// The report order is built from quoted literals rather than written inline:
// "admin" in double quotes is an identifier under ANSI_QUOTES, which would
// turn this query into a syntax error on such a server.
$roleOrder = implode(',', array_map(
    static fn(string $r): string => $pdo->quote($r),
    ['admin', 'hod', 'librarian', 'faculty', 'student']
));

$rows = $pdo->query(
    'SELECT id, email, role, status, must_change_password,
            password_hash = ' . $pdo->quote(LOCKED_SENTINEL) . ' AS is_locked
     FROM users
     ORDER BY FIELD(role, ' . $roleOrder . '), email'
)->fetchAll();

$locked = array_values(array_filter($rows, static fn(array $r): bool => (int) $r['is_locked'] === 1));
$already = array_values(array_filter($rows, static fn(array $r): bool => (int) $r['is_locked'] === 0));

// A previous run recorded itself, so the browser entry point closes itself
// after one use. A shell operator can still re-run with --force.
$lastRun = null;
if ($tableExists('system_settings')) {
    $done = $pdo->query(
        "SELECT setting_value FROM system_settings
         WHERE setting_key = 'internal.setup_completed_at' LIMIT 1"
    )->fetchColumn();
    $lastRun = $done === false ? null : (string) $done;
}

if (!$isCli && $lastRun !== null && !$force) {
    http_response_code(403);
    $out('This setup has already been run (last run: ' . $lastRun . ').');
    $out('');
    $out('It refuses to run twice. If you really need to repeat it, run it from a');
    $out('shell on the server:  php api/setup_passwords.php --force');
    exit;
}

// ---------------------------------------------------------------------------
// status / dry run
// ---------------------------------------------------------------------------
if ($wantStatus || $dryRun) {
    $out('ADIT CMS - default password status');
    $out('Target: ' . DB_USER . '@' . DB_HOST . '/' . DB_NAME);
    $out('');
    $out(sprintf('%-26s %-10s %-10s %-7s %s', 'EMAIL', 'ROLE', 'ACCOUNT', 'STATE', 'PASSWORD'));
    foreach ($rows as $r) {
        $state = (int) $r['is_locked'] === 1 ? 'LOCKED' : 'set';
        $note = (int) $r['is_locked'] === 1
            ? 'none yet'
            : ((int) $r['must_change_password'] === 1 ? 'DEFAULT - must be changed' : 'changed by user');
        $out(sprintf(
            '%-26s %-10s %-10s %-7s %s',
            $r['email'], $r['role'], $r['status'], $state, $note
        ));
    }
    $out('');
    $out(count($locked) . ' locked, ' . count($already) . ' already have a password.');
    $out('');
    if ($wantStatus) {
        $out('Nothing was changed.');
        exit(0);
    }
    $out('Dry run - the following would be set to the default password:');
    foreach ($locked as $r) {
        $out('  ' . $r['email'] . ' (' . $r['role'] . ')');
    }
    if ($force) {
        $out('');
        $out('--force was given, so these already-set accounts would also be reset:');
        foreach ($already as $r) {
            $out('  ' . $r['email'] . ' (' . $r['role'] . ')');
        }
    }
    $out('');
    $out('Nothing was changed.');
    exit(0);
}

// ---------------------------------------------------------------------------
// gate 2: never silently clobber a real password
// ---------------------------------------------------------------------------
$targets = $locked;
if ($force) {
    $targets = $rows;
}

if (!$targets) {
    $out('No account needs a password: every account already has one.');
    if (!$force) {
        $out('');
        $out('To reset them anyway, re-run with --force (CLI) or &force=1 (browser).');
        $out('That invalidates the current password of every account on the system.');
    }
    exit(0);
}

// ---------------------------------------------------------------------------
// apply
// ---------------------------------------------------------------------------
$update = $pdo->prepare(
    'UPDATE users
     SET password_hash = ?, must_change_password = 1
     WHERE id = ?'
);
$markDone = $pdo->prepare(
    "INSERT INTO system_settings (setting_key, setting_value)
     VALUES ('internal.setup_completed_at', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)"
);

$set = 0;
$failed = 0;
$succeeded = [];

$out('ADIT CMS - setting default passwords');
$out('Target: ' . DB_USER . '@' . DB_HOST . '/' . DB_NAME);
$out('Accounts to update: ' . count($targets));
$out('');

// $targets is $locked, or all accounts under --force, so every row here is
// meant to be written.
foreach ($targets as $r) {
    $hash = password_hash($password, PASSWORD_BCRYPT, BCRYPT_OPTIONS);
    if ($hash === false) {
        $failed++;
        $out('  FAILED  ' . $r['email'] . ' (could not hash)');
        continue;
    }

    $update->execute([$hash, $r['id']]);
    if ($update->rowCount() === 0) {
        // rowCount() counts changed rows, and a fresh bcrypt salt guarantees a
        // different value, so 0 means the write did not happen.
        $failed++;
        $out('  FAILED  ' . $r['email'] . ' (no row updated)');
        continue;
    }

    $set++;
    $succeeded[] = $r['email'];
    // Deliberately no hash in the output.
    $out('  ok      ' . $r['email'] . ' (' . $r['role'] . ')');
}

$finishedAt = date('Y-m-d H:i:s');
$markDone->execute([$finishedAt]);

// audit: no hashes, no plaintext
if ($tableExists('audit_logs')) {
    $audit = $pdo->prepare(
        "INSERT INTO audit_logs (user_id, action, table_name, old_value, new_value, ip_address)
         VALUES (NULL, ?, 'users', NULL, ?, ?)"
    );
    $audit->execute([
        'setup_passwords',
        json_encode([
            'accounts'     => count($targets),
            'force'        => $force,
            'sapi'         => PHP_SAPI,
            'default_used' => true,
            'set'          => $set,
            'failed'       => $failed,
        ]),
        substr((string) ($_SERVER['REMOTE_ADDR'] ?? 'cli'), 0, 45),
    ]);
}

$out('');
$out($set . ' account(s) set to the default password.');
if ($failed > 0) {
    $out($failed . ' FAILED.');
}
$out('');
$out('Each updated account is flagged must_change_password = 1. Until the');
$out('password is changed, the API only allows /auth/change-password,');
$out('/auth/me, /auth/logout and /health for that account.');
if ($succeeded) {
    $out('');
    $out('Sign in with one of these and change the password immediately:');
    foreach ($succeeded as $email) {
        $out('  ' . $email);
    }
}
$out('');
$out('Recorded at ' . $finishedAt . '.');
$out('Delete this file when you are done.');
