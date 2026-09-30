<?php
/**
 * ADIT CMS - JSON Response Helper
 */

class Response {

    private static function encode($data) {
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($json === false) {
            // Invalid UTF-8 (emoji typed into a name field, etc.) would otherwise
            // produce an empty 200 with a zero-length body.
            error_log('ADIT CMS: json_encode failed: ' . json_last_error_msg());
            $json = json_encode([
                'success' => false,
                'message' => 'Response could not be encoded (invalid text data).',
            ]);
        }
        return $json;
    }

    public static function json($data, $statusCode = 200) {
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=UTF-8');
            header('X-Content-Type-Options: nosniff');
        }
        echo self::encode($data);
        exit;
    }

    public static function success($data = null, $message = 'Success', $statusCode = 200) {
        self::json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $statusCode);
    }

    public static function error($message = 'Error', $statusCode = 400, $errors = null) {
        $response = [
            'success' => false,
            'message' => $message
        ];
        if ($errors) {
            $response['errors'] = $errors;
        }
        self::json($response, $statusCode);
    }

    public static function paginated($data, $total, $page, $pageSize) {
        $total     = (int) $total;
        $page      = max(1, (int) $page);
        $pageSize  = (int) $pageSize;

        // Guard against ?page_size=0 which would raise DivisionByZeroError.
        if ($pageSize < 1) {
            $pageSize = defined('DEFAULT_PAGE_SIZE') ? DEFAULT_PAGE_SIZE : 20;
        }
        if (defined('MAX_PAGE_SIZE') && $pageSize > MAX_PAGE_SIZE) {
            $pageSize = MAX_PAGE_SIZE;
        }

        self::json([
            'success' => true,
            'data' => $data,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'page_size' => $pageSize,
                'total_pages' => (int) ceil($total / $pageSize)
            ]
        ], 200);
    }

    public static function unauthorized($message = 'Unauthorized') {
        self::error($message, 401);
    }

    public static function forbidden($message = 'Forbidden') {
        self::error($message, 403);
    }

    public static function notFound($message = 'Not found') {
        self::error($message, 404);
    }

    public static function validationError($errors) {
        self::error('Validation failed', 422, $errors);
    }

    public static function serverError($message = 'Internal server error') {
        self::error($message, 500);
    }
}
