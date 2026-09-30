<?php
/**
 * ADIT CMS - JWT Helper
 * 
 * Simple JWT implementation for authentication
 */

class JWT {

    public static function generate($userId, $email, $role) {
        $header = self::base64UrlEncode(json_encode([
            'typ' => 'JWT',
            'alg' => 'HS256'
        ]));

        $payload = self::base64UrlEncode(json_encode([
            'iss' => JWT_ISSUER,
            'iat' => time(),
            'exp' => time() + JWT_EXPIRY,
            'user_id' => $userId,
            'email' => $email,
            'role' => $role
        ]));

        $signature = self::base64UrlEncode(
            hash_hmac('sha256', "{$header}.{$payload}", JWT_SECRET, true)
        );

        return "{$header}.{$payload}.{$signature}";
    }

    public static function validate($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return false;
        }

        [$header, $payload, $signature] = $parts;

        // Verify signature
        $expectedSignature = self::base64UrlEncode(
            hash_hmac('sha256', "{$header}.{$payload}", JWT_SECRET, true)
        );

        if (!hash_equals($expectedSignature, $signature)) {
            return false;
        }

        $payloadData = json_decode(self::base64UrlDecode($payload), true);

        // Check expiry
        if (isset($payloadData['exp']) && $payloadData['exp'] < time()) {
            return false;
        }

        return $payloadData;
    }

    public static function getPayload($token) {
        $parts = explode('.', $token);
        if (count($parts) !== 3) {
            return null;
        }
        return json_decode(self::base64UrlDecode($parts[1]), true);
    }

    public static function getUserIdFromToken($token) {
        $payload = self::getPayload($token);
        return $payload ? $payload['user_id'] ?? null : null;
    }

    public static function getRoleFromToken($token) {
        $payload = self::getPayload($token);
        return $payload ? $payload['role'] ?? null : null;
    }

    private static function base64UrlEncode($data) {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function base64UrlDecode($data) {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
