<?php
/**
 * ADIT CMS - Short-lived download token
 *
 * A browser cannot set an Authorization header on a plain <a href> or
 * window.open(), so attachments are fetched through a signed, expiring URL
 * instead of a long-lived session JWT.
 *
 * These tokens are deliberately narrow: they carry only a resource id, they
 * expire in minutes, and they are signed with a key derived from JWT_SECRET
 * so a leaked token cannot be replayed as an API credential.
 */

class DownloadToken {

    private const DEFAULT_TTL = 300; // 5 minutes

    public static function issue(string $resource, int $id, int $userId, ?int $ttl = null): string {
        $ttl = $ttl ?? self::DEFAULT_TTL;
        $now = time();

        $payload = [
            'r'  => $resource,      // e.g. 'material'
            'id' => $id,
            'uid' => $userId,
            'iat' => $now,
            'exp' => $now + $ttl,
        ];
        $payload['sig'] = self::sign($payload);

        return rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    }

    /**
     * @return array|null Decoded claims, or null when invalid/expired.
     */
    public static function validate(string $token): ?array {
        $token = strtr(trim($token), '-_', '+/');
        $padded = str_pad($token, (int) (ceil(strlen($token) / 4) * 4), '=', STR_PAD_RIGHT);
        $json = base64_decode($padded, true);
        if ($json === false) {
            return null;
        }
        $payload = json_decode($json, true);
        if (!is_array($payload) || !isset($payload['sig'], $payload['exp'], $payload['id'], $payload['r'])) {
            return null;
        }
        if ((int) $payload['exp'] < time()) {
            return null;
        }

        $signature = $payload['sig'];
        unset($payload['sig']);
        if (!hash_equals(self::sign($payload), $signature)) {
            return null;
        }

        return [
            'resource' => (string) $payload['r'],
            'id'       => (int) $payload['id'],
            'user_id'  => (int) ($payload['uid'] ?? 0),
        ];
    }

    private static function sign(array $payload): string {
        $secret = defined('JWT_SECRET') ? JWT_SECRET : 'adit';
        // Key separation: a download token can never be replayed as a JWT.
        ksort($payload);
        $body = json_encode($payload, JSON_UNESCAPED_SLASHES);
        return hash_hmac('sha256', (string) $body, 'download|' . $secret);
    }
}
