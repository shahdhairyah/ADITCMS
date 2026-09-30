<?php
/**
 * ADIT College Management System - API Entry Point
 * Fixed for InfinityFree hosting
 */

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// Load configuration
require_once __DIR__ . '/config/config.php';
require_once __DIR__ . '/config/database.php';

// Load helpers
require_once __DIR__ . '/helpers/Response.php';
require_once __DIR__ . '/helpers/JWT.php';
require_once __DIR__ . '/helpers/Validation.php';
require_once __DIR__ . '/helpers/Upload.php';
require_once __DIR__ . '/helpers/DownloadToken.php';
require_once __DIR__ . '/helpers/EmailHelper.php';

// Load middleware
require_once __DIR__ . '/middleware/AuthMiddleware.php';
require_once __DIR__ . '/middleware/RoleMiddleware.php';

// --------------------------------------------------------------- CORS
// Auth is sent as an Authorization header (not a cookie), so the origin
// list is simply checked and the exact origin echoed back.
$requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = defined('CORS_ORIGINS') && is_array(CORS_ORIGINS)
    ? CORS_ORIGINS
    : [];

if ($requestOrigin !== '' && in_array($requestOrigin, $allowedOrigins, true)) {
    header('Access-Control-Allow-Origin: ' . $requestOrigin);
    header('Vary: Origin');
} else {
    // No Origin header (same-origin, curl, mobile app) or an unknown origin.
    // Same-origin requests do not need the header at all.
    header('Access-Control-Allow-Origin: ' . (defined('FRONTEND_URL') ? FRONTEND_URL : ''));
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Access-Control-Max-Age: 86400');
header('X-Content-Type-Options: nosniff');
header('Content-Type: application/json; charset=UTF-8');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ------------------------------------------------------------- request
$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if (!$uri) $uri = '/';

// Remove /api prefix and any trailing slashes
$uri = preg_replace('#^/api#', '', $uri);
$uri = rtrim($uri, '/');
if (empty($uri)) $uri = '/';

// Fallback: if URI still contains index.php, extract the path after it
if (strpos($uri, 'index.php') !== false) {
    $uri = preg_replace('#.*index\.php#', '', $uri);
    $uri = rtrim($uri, '/');
    if (empty($uri)) $uri = '/';
}

// Publish the normalized route path so AuthMiddleware can apply the
// forced-password-change allow-list against exactly this value instead of
// re-deriving it from REQUEST_URI and risking a mismatch that would lock an
// account out of /auth/change-password.
define('ADIT_ROUTE_URI', $uri);

// Debug log
error_log("ADIT CMS: Method=$method URI=$uri");

// Wrap everything in a global try-catch
try {
    require_once __DIR__ . '/routes/api.php';
} catch (Throwable $e) {
    error_log("ADIT CMS Uncaught Error: " . $e->getMessage() . " in " . $e->getFile() . ":" . $e->getLine());
    http_response_code(500);
    // Only leak diagnostics outside production.
    $payload = [
        'success' => false,
        'message' => 'Internal server error'
    ];
    if (defined('IS_PRODUCTION') && !IS_PRODUCTION) {
        $payload['error'] = $e->getMessage();
        $payload['file'] = basename($e->getFile());
        $payload['line'] = $e->getLine();
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
