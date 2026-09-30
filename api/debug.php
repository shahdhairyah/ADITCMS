<?php
/**
 * REMOVED SCRIPT
 * -------------
 * This file was a standalone endpoint that sat outside the router, so it
 * bypassed every middleware in api/routes/api.php. It has been disabled.
 *
 * All of its functionality is served by the real routes:
 *   POST   /api/auth/login
 *   POST   /api/auth/register
 *   GET    /api/auth/me
 *   PUT    /api/auth/profile
 *   POST   /api/auth/change-password
 *   POST   /api/auth/forgot-password
 *   POST   /api/auth/reset-password
 *   GET    /api/health
 *
 * To reinstall the database and set passwords, use database/install.php
 * (requires ?key=INSTALL_KEY in the browser, or run it from the CLI).
 */

http_response_code(410);
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Retry-After: 86400');

echo json_encode([
    'success' => false,
    'message' => 'This script has been removed. Use the /api routes instead.'
], JSON_UNESCAPED_SLASHES);
exit;
