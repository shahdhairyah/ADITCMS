<?php
/**
 * ADIT CMS - Authentication Middleware
 *
 * Validates the JWT from the Authorization header.
 *
 * The decoded identity is kept in a private static property rather than in
 * $_REQUEST. $_REQUEST merges GET, POST and COOKIE, so a request to
 * "?user_id=1" on any route that forgot to call handle() would otherwise
 * let the caller impersonate user 1.
 */

class AuthMiddleware {

    private static $payload = null;
    private static $userStatusChecked = false;
    private static $mustChangePassword = false;
    private static $flagColumnKnown = null;

    /**
     * Requests an account is still allowed to make while it holds a
     * provisioning password. Everything else is refused so that a shared
     * default password cannot be used to read or change real data.
     */
    private const PASSWORD_CHANGE_ALLOWED = [
        '/auth/change-password',
        '/auth/me',
        '/auth/logout',
        '/health',
    ];

    public static function handle() {
        if (self::$payload !== null) {
            return self::$payload; // already validated in this request
        }

        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

        if (empty($header)) {
            // Apache with mod_php / CGI strips HTTP_AUTHORIZATION, so
            // fall back to the raw header and other server vars.
            if (!empty($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
                $header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
            } else {
                $headers = function_exists('getallheaders') ? getallheaders() : [];
                foreach ($headers as $key => $value) {
                    if (strtolower($key) === 'authorization') {
                        $header = $value;
                        break;
                    }
                }
            }
        }

        if (empty($header) || !preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
            Response::unauthorized('No token provided');
        }

        $payload = JWT::validate(trim($matches[1]));

        if (!$payload) {
            Response::unauthorized('Invalid or expired token');
        }

        // The account must still exist and be active - a token issued before
        // a deactivation must stop working immediately.
        if (!self::isUserActive((int) $payload['user_id'], (string) $payload['role'])) {
            Response::unauthorized('Your account is inactive. Please contact the administrator.');
        }

        if (self::$mustChangePassword && !self::isPasswordChangeRequest()) {
            Response::forbidden('You must change your temporary password before you can use the system.');
        }

        self::$payload = $payload;
        return $payload;
    }

    /**
     * True when the current request targets one of the endpoints an account
     * with a forced password change may still reach.
     *
     * index.php publishes the already-normalized route path (it has already
     * stripped the /api prefix, any index.php and trailing slashes). Reusing it
     * keeps this check in step with the router: if the two derived the path
     * differently, a mismatch here would block the very endpoint that releases
     * the lock. The REQUEST_URI fallback mirrors index.php for the rare case
     * where the middleware is reached without it.
     */
    private static function isPasswordChangeRequest(): bool {
        if (defined('ADIT_ROUTE_URI')) {
            $path = '/' . trim((string) ADIT_ROUTE_URI, '/');
        } else {
            $raw = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH) ?: '/';
            $raw = preg_replace('#^/api#', '', $raw);
            $raw = preg_replace('#.*index\.php#', '', (string) $raw);
            $path = '/' . trim(rtrim((string) $raw, '/'), '/');
        }

        if ($path === '/' || $path === '') {
            return true;
        }

        return in_array($path, self::PASSWORD_CHANGE_ALLOWED, true);
    }

    /**
     * Whether the caller still has to replace a provisioning password.
     * Populated as a side effect of isUserActive().
     */
    public static function mustChangePassword(): bool {
        return self::$mustChangePassword;
    }

    private static function isUserActive(int $userId, string $tokenRole): bool {
        if (self::$userStatusChecked) {
            return true;
        }
        try {
            $db   = Database::getInstance()->getConnection();
            if (self::$flagColumnKnown === null) {
                // Checked once per request, not once per query: an
                // information_schema lookup on every statement is wasteful.
                self::$flagColumnKnown = (int) $db->query(
                    "SELECT COUNT(*) FROM information_schema.COLUMNS
                     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
                       AND COLUMN_NAME = 'must_change_password'"
                )->fetchColumn() > 0;
            }
            $flagSql = self::$flagColumnKnown ? ', must_change_password' : '';
            $stmt = $db->prepare("SELECT role, status{$flagSql} FROM users WHERE id = ? LIMIT 1");
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
        } catch (Throwable $e) {
            error_log('ADIT CMS: could not verify user status: ' . $e->getMessage());
            // Do not lock everyone out if the database hiccups.
            return true;
        }

        if (!$row) {
            return false;
        }
        if ($row['status'] !== 'active') {
            return false;
        }
        // A role change must not leave the old token usable at the old level.
        if ($row['role'] !== $tokenRole) {
            return false;
        }

        self::$mustChangePassword = isset($row['must_change_password'])
            && (int) $row['must_change_password'] === 1;
        self::$userStatusChecked = true;
        return true;
    }

    public static function getUserId(): ?int {
        if (self::$payload === null) {
            return null;
        }
        $id = (int) self::$payload['user_id'];
        return $id > 0 ? $id : null;
    }

    public static function getUserRole(): ?string {
        return self::$payload['role'] ?? null;
    }

    public static function getUserEmail(): ?string {
        return self::$payload['email'] ?? null;
    }

    /** Whole decoded token, for controllers that need extra claims. */
    public static function getPayload(): ?array {
        return self::$payload;
    }
}
