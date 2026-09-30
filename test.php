<?php
/**
 * ADIT CMS - Server Diagnostic Script
 *
 * This used to be an unauthenticated page in the web root that printed the
 * PHP version, document root, absolute paths and live database contents to
 * anyone who asked for it. It now requires the same key as the installer and
 * answers 404 without it, so it cannot be used to fingerprint the host.
 *
 *   https://adit.shahdhairyah.in/test.php?key=<INSTALL_KEY>
 *
 * DELETE THIS FILE once the deployment is confirmed working.
 */

header('Content-Type: text/plain; charset=utf-8');

$configPath = __DIR__ . '/api/config/config.php';
$expectedKey = 'change-me-install-key';
if (is_file($configPath)) {
    // Read INSTALL_KEY without executing the rest of the config.
    if (preg_match("/define\(\s*'INSTALL_KEY'\s*,\s*getenv\('ADIT_INSTALL_KEY'\)\s*\?\?\s*'([^']*)'/", (string) file_get_contents($configPath), $m)) {
        $expectedKey = $m[1];
    }
}

$supplied = (string) ($_GET['key'] ?? '');
if (!hash_equals($expectedKey, $supplied)) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'message' => 'Not found']);
    exit;
}

echo "=== ADIT CMS Server Diagnostics ===\n\n";

echo "1. PHP Version: " . PHP_VERSION . "\n";
echo "2. Server Software: " . ($_SERVER['SERVER_SOFTWARE'] ?? 'Unknown') . "\n";
echo "3. Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'Unknown') . "\n";
echo "4. REQUEST_URI: " . ($_SERVER['REQUEST_URI'] ?? 'Unknown') . "\n\n";

$apiPath = __DIR__ . '/api/index.php';
echo "5. api/index.php exists: " . (file_exists($apiPath) ? 'YES' : 'NO - UPLOAD IT!') . "\n";
echo "6. api/config/config.php exists: " . (is_file($configPath) ? 'YES' : 'NO') . "\n";

if (is_file($configPath)) {
    require_once $configPath;
    require_once __DIR__ . '/api/config/database.php';
    try {
        $pdo = Database::getInstance()->getConnection();
        echo "7. Database connection: SUCCESS\n";

        $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
        echo "8. Database tables: " . count($tables) . "\n";

        if (in_array('users', $tables)) {
            // Counts only - never dump rows, hashes or emails.
            echo "9. Users in database: " . (int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn() . "\n";
        }
    } catch (Throwable $e) {
        echo "7. Database connection: FAILED - " . $e->getMessage() . "\n";
    }
}

echo "\n10. Directory structure:\n";
$dirs = ['api', 'api/config', 'api/controllers', 'api/helpers',
         'api/middleware', 'api/models', 'api/routes', 'uploads', 'database'];
foreach ($dirs as $dir) {
    echo "    $dir/: " . (is_dir(__DIR__ . '/' . $dir) ? 'OK' : 'MISSING') . "\n";
}

echo "\n=== If all checks pass, DELETE this file ===\n";
