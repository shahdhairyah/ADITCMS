<?php
/**
 * ADIT CMS - Idempotent schema migrations
 *
 * database/adit_cms_complete.sql is CREATE TABLE IF NOT EXISTS only. Running it
 * against a database that already exists adds nothing: new columns are silently
 * skipped, so a fresh install works while an existing install is missing every
 * column added since it was created. That is how
 * "Unknown column 'reviewed_by_user' in 'field list'" happens in production.
 *
 * This file brings an existing database up to the current schema. Every
 * statement is guarded, so it is safe to run repeatedly.
 *
 * Usage:
 *   php database/migrate.php                      (reads .env / environment)
 *   php database/migrate.php --host=... --user=... --pass=... --name=...
 *   php database/migrate.php --dry-run           (print SQL, change nothing)
 */

if (PHP_SAPI !== 'cli') {
    header('Content-Type: text/plain; charset=utf-8');
}

$options = getopt('', ['host::', 'port::', 'user::', 'pass::', 'name::', 'dry-run', 'help']);
if (isset($options['help'])) {
    fwrite(STDOUT, "Usage: php database/migrate.php [--host=] [--port=] [--user=] [--pass=] [--name=] [--dry-run]\n");
    exit(0);
}

$dryRun = isset($options['dry-run']);

/** Credentials from CLI flags, then the environment, then api/config/config.php. */
function adit_db_options(array $options): array {
    $get = static function (string $key, string $flag) use ($options) {
        if (isset($options[$flag]) && $options[$flag] !== false) {
            return $options[$flag];
        }
        $env = getenv($key);
        return ($env === false || $env === '') ? null : $env;
    };

    $cfg = [
        'host' => $get('DB_HOST', 'host'),
        'port' => $get('DB_PORT', 'port'),
        'user' => $get('DB_USER', 'user'),
        'pass' => $get('DB_PASS', 'pass'),
        'name' => $get('DB_NAME', 'name'),
    ];

    if ($cfg['host'] === null || $cfg['user'] === null || $cfg['name'] === null) {
        // The constants live in api/config/config.php as
        // define('DB_HOST', getenv('DB_HOST') ?: 'literal'); - the file cannot
        // simply be included because it also emits other settings.
        $config = __DIR__ . '/../api/config/config.php';
        if (is_file($config)) {
            $s = file_get_contents($config);
            foreach (['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME'] as $const) {
                // matches both `getenv('X') ?: 'literal'` and `getenv('X') ?:` + 'literal'
                $pattern = "/define\(\s*'" . $const . "'\s*,\s*getenv\('" . $const . "'\)\s*\?\s*:?\s*'([^']*)'\s*\)/";
                if (preg_match($pattern, $s, $m)) {
                    $key = strtolower(substr($const, 3));
                    if (($cfg[$key] === null || $cfg[$key] === '') && $m[1] !== '') {
                        $cfg[$key] = $m[1];
                    }
                }
            }
        }
    }

    return [
        'host' => $cfg['host'] ?: 'localhost',
        'port' => (int) ($cfg['port'] ?: 3306),
        'user' => $cfg['user'],
        'pass' => $cfg['pass'] ?? '',
        'name' => $cfg['name'],
    ];
}

$cfg = adit_db_options($options);
if (!$cfg['user'] || !$cfg['name']) {
    fwrite(STDERR, "Could not determine database credentials. Pass --host/--user/--pass/--name.\n");
    exit(1);
}

$log = static function (string $msg): void {
    fwrite(STDOUT, $msg . "\n");
};

$log('ADIT CMS migrations' . ($dryRun ? ' (dry run - nothing will change)' : ''));
$log("Target: {$cfg['user']}@{$cfg['host']}:{$cfg['port']}/{$cfg['name']}\n");

try {
    $pdo = new PDO(
        "mysql:host={$cfg['host']};port={$cfg['port']};dbname={$cfg['name']};charset=utf8mb4",
        $cfg['user'],
        $cfg['pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    fwrite(STDERR, "Cannot connect to the database: " . $e->getMessage() . "\n");
    fwrite(STDERR, "Check the host/credentials, or pass them explicitly:\n");
    fwrite(STDERR, "  php database/migrate.php --host=... --user=... --pass=... --name=...\n");
    exit(1);
}

/**
 * Statements to run, in order.
 *
 * add_column()          - add a column only when the table exists and lacks it
 * add_index()           - add an index only when it is missing
 * backfill_*            - repair rows written before a column existed
 */
$run = static function (string $sql) use ($pdo, $dryRun, $log): void {
    if ($dryRun) {
        $log('  would run: ' . preg_replace('/\s+/', ' ', $sql));
        return;
    }
    $pdo->exec($sql);
    $log('  ok');
};

$addColumn = static function (string $table, string $column, string $definition) use ($pdo, $run, $log): void {
    $tableExists = (int) $pdo->query("SHOW TABLES LIKE " . $pdo->quote($table))->fetchColumn() > 0;
    if (!$tableExists) {
        $log("  skip $table.$column (table not present)");
        return;
    }
    $has = (int) $pdo->query("SHOW COLUMNS FROM `$table` LIKE " . $pdo->quote($column))->fetchColumn() > 0;
    if ($has) {
        $log("  skip $table.$column (already present)");
        return;
    }
    $log("+ add $table.$column $definition");
    $run("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
};

$addIndex = static function (string $table, string $index, string $columns) use ($pdo, $run, $log): void {
    $tableExists = (int) $pdo->query("SHOW TABLES LIKE " . $pdo->quote($table))->fetchColumn() > 0;
    if (!$tableExists) {
        return;
    }
    $has = (int) $pdo->query("SHOW INDEX FROM `$table` WHERE Key_name = " . $pdo->quote($index))->fetchColumn() > 0;
    if ($has) {
        $log("  skip index $index (already present)");
        return;
    }
    $log("+ add index $index on $table($columns)");
    $run("ALTER TABLE `$table` ADD INDEX `$index` ($columns)");
};

$addForeignKey = static function (string $table, string $column, string $constraint, string $refColumn, string $refTable) use ($pdo, $run, $log): void {
    $tableExists = (int) $pdo->query("SHOW TABLES LIKE " . $pdo->quote($table))->fetchColumn() > 0;
    $refExists   = (int) $pdo->query("SHOW TABLES LIKE " . $pdo->quote($refTable))->fetchColumn() > 0;
    if (!$tableExists || !$refExists) {
        $log("  skip FK $constraint (missing table)");
        return;
    }
    $colHas = (int) $pdo->query("SHOW COLUMNS FROM `$table` LIKE " . $pdo->quote($column))->fetchColumn() > 0;
    if (!$colHas) {
        return;
    }
    $fkHas = (int) $pdo->query(
        "SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = " . $pdo->quote($table) .
        " AND COLUMN_NAME = " . $pdo->quote($column) . " AND REFERENCED_TABLE_NAME IS NOT NULL"
    )->fetchColumn();
    if ($fkHas > 0) {
        $log("  skip FK $constraint (already present)");
        return;
    }
    $log("+ add FK $constraint on $table.$column -> $refTable.$refColumn");
    $run("ALTER TABLE `$table` ADD CONSTRAINT `$constraint` FOREIGN KEY (`$column`) REFERENCES `$refTable`(`$refColumn`) ON DELETE SET NULL");
};

// ---------------------------------------------------------------------------
// 1. Attributable reviewers and mark entry
//
// reviewed_by / entered_by are FOREIGN KEYs to faculty(id). An admin has no
// faculty row, so those columns had to stay NULL for an admin decision and the
// record could not be traced back to a person. These *_by_user columns point at
// users(id) and are written for every role.
// ---------------------------------------------------------------------------
$log("\n1. Reviewer and mark-entry attribution");
$addColumn('leave_applications', 'faculty_reviewed_by_user', 'INT NULL');
$addColumn('leave_applications', 'hod_reviewed_by_user', 'INT NULL');
$addColumn('submissions', 'reviewed_by_user', 'INT NULL');
$addColumn('lab_submissions', 'reviewed_by_user', 'INT NULL');
$addColumn('unit_tests', 'entered_by_user', 'INT NULL');

$addForeignKey('leave_applications', 'faculty_reviewed_by_user', 'fk_leave_faculty_reviewer_user', 'id', 'users');
$addForeignKey('leave_applications', 'hod_reviewed_by_user', 'fk_leave_hod_reviewer_user', 'id', 'users');
$addForeignKey('submissions', 'reviewed_by_user', 'fk_submission_reviewer_user', 'id', 'users');
$addForeignKey('lab_submissions', 'reviewed_by_user', 'fk_lab_submission_reviewer_user', 'id', 'users');
$addForeignKey('unit_tests', 'entered_by_user', 'fk_unit_test_entered_by_user', 'id', 'users');

// Recover the actor for rows written before these columns existed, by mapping
// the faculty id back to its user.
$log("\n2. Backfill attribution from the existing faculty ids");
$backfill = [
    ['leave_applications', 'faculty_reviewed_by', 'faculty_reviewed_by_user'],
    ['leave_applications', 'hod_reviewed_by', 'hod_reviewed_by_user'],
    ['submissions', 'reviewed_by', 'reviewed_by_user'],
    ['lab_submissions', 'reviewed_by', 'reviewed_by_user'],
    ['unit_tests', 'entered_by', 'entered_by_user'],
];
foreach ($backfill as [$table, $fromCol, $toCol]) {
    $tableExists = (int) $pdo->query("SHOW TABLES LIKE " . $pdo->quote($table))->fetchColumn() > 0;
    if (!$tableExists) {
        continue;
    }
    $has = (int) $pdo->query("SHOW COLUMNS FROM `$table` LIKE " . $pdo->quote($toCol))->fetchColumn() > 0;
    if (!$has) {
        continue;
    }
    $sql = "UPDATE `$table` t
            JOIN faculty f ON f.id = t.`$fromCol`
            SET t.`$toCol` = f.user_id
            WHERE t.`$toCol` IS NULL AND t.`$fromCol` IS NOT NULL";
    $log("+ backfill $table.$toCol from $fromCol");
    $run($sql);
}

// ---------------------------------------------------------------------------
// 3. Forced password change
//
// api/setup_passwords.php provisions every seeded account with a shared default
// password, and sets users.must_change_password = 1 so AuthMiddleware refuses
// any request other than the password change itself. Existing databases are
// missing that column, and the script refuses to run without it.
// ---------------------------------------------------------------------------
$log("\n3. Forced password change support");
$addColumn('users', 'must_change_password', 'TINYINT(1) NOT NULL DEFAULT 0');

// Any account still holding the seed sentinel has no password and cannot log in
// at all. Flagging it makes the state visible instead of failing as "invalid
// email or password", and makes setup_passwords.php treat it as a target.
$log("\n3b. Flag accounts that never received a password");
$log('+ set must_change_password = 1 where password_hash is still the seed sentinel');
$run("UPDATE users SET must_change_password = 1 WHERE password_hash = '!locked!'");

// ---------------------------------------------------------------------------
// 4. Result credit totals
//
// results.total_credits / total_grade_points were added with DEFAULT 0, so
// every pre-existing result row reads 0 credits and a cumulative CGPA computed
// from it is wrong. Recompute from subjects for every published result.
// ---------------------------------------------------------------------------
$log("\n4. Recompute result credit totals");
$resultsExists = (int) $pdo->query("SHOW TABLES LIKE 'results'")->fetchColumn() > 0;
$subjectsExists = (int) $pdo->query("SHOW TABLES LIKE 'subjects'")->fetchColumn() > 0;
if ($resultsExists && $subjectsExists) {
    $hasCredits = (int) $pdo->query("SHOW COLUMNS FROM `results` LIKE 'total_credits'")->fetchColumn() > 0;
    $hasPoints = (int) $pdo->query("SHOW COLUMNS FROM `results` LIKE 'total_grade_points'")->fetchColumn() > 0;
    if (!$hasCredits || !$hasPoints) {
        $log("  skip: results is missing total_credits/total_grade_points");
    } else {
        $sql = "UPDATE results r
                LEFT JOIN (
                    SELECT sub.id AS subject_id,
                           COALESCE(SUM(sub.credits), 0) AS credits
                    FROM subjects sub
                    INNER JOIN semesters sem ON sem.id = sub.semester_id
                    WHERE sub.semester_id = r.semester_id
                      AND sub.department_id = r.department_id
                    GROUP BY sub.id
                ) sc ON sc.subject_id = r.subject_id
                SET r.total_credits = COALESCE(sc.credits, r.total_credits)
                WHERE r.total_credits = 0 AND r.subject_id IS NOT NULL";
        $log('+ recompute results.total_credits');
        $run($sql);
        $log('  (total_grade_points is derived at read time; regenerate with');
        $log('   POST /exams/publish-results for a semester if the values are wrong)');
    }
}

$log("\nDone." . ($dryRun ? ' (dry run)' : ''));
