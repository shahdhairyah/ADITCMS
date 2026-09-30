<?php
/**
 * ADIT CMS - Input Validation Helper
 */

class Validation {

    /**
     * Validate $data against a pipe-delimited rule set.
     *
     *   $rules = ['email' => 'required|email', 'roll_number' => 'required|max:20'];
     *
     * Returns true when valid, otherwise an array of field => [messages].
     */
    public static function validate($data, $rules) {
        $errors = [];
        if (!is_array($data)) {
            return ['_root' => ['Payload must be an object']];
        }

        foreach ($rules as $field => $ruleSet) {
            $rulesArray = is_string($ruleSet) ? explode('|', $ruleSet) : (array) $ruleSet;
            $raw        = $data[$field] ?? null;
            $isEmpty    = $raw === null || $raw === '' || (is_array($raw) && $raw === []);

            // Only non-empty checks apply to missing values, so that a field
            // marked just "email" is not reported as a missing value.
            $required = false;
            $nullable = false;
            foreach ($rulesArray as $rule) {
                $r = explode(':', (string) $rule)[0];
                if ($r === 'required') {
                    $required = true;
                }
                if ($r === 'nullable') {
                    $nullable = true;
                }
            }
            if ($required && $isEmpty) {
                $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' is required';
                continue;
            }
            if ($isEmpty && !$required) {
                if ($nullable || $isEmpty) {
                    continue;
                }
            }

            // Everything below operates on a string form; never call strlen()
            // on an array or an int (PHP 8 TypeError).
            $value = is_array($raw) ? '' : (string) $raw;

            foreach ($rulesArray as $rule) {
                $params     = explode(':', (string) $rule, 2);
                $ruleName   = $params[0];
                $ruleParam  = $params[1] ?? null;

                if ($ruleName === 'nullable' || ($isEmpty && $ruleName !== 'required')) {
                    continue;
                }

                switch ($ruleName) {
                    case 'required':
                        if ($isEmpty) {
                            $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' is required';
                        }
                        break;

                    case 'string':
                        if (!is_array($raw) && !is_numeric($raw)) {
                            $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' must be text';
                        }
                        break;

                    case 'integer':
                        if (!is_array($raw) && !preg_match('/^-?\d+$/', trim($value))) {
                            $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' must be a whole number';
                        }
                        break;

                    case 'min':
                        if (!is_array($raw) && mb_strlen($value) < (int) $ruleParam) {
                            $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . " must be at least {$ruleParam} characters";
                        }
                        break;

                    case 'max':
                        if (!is_array($raw) && mb_strlen($value) > (int) $ruleParam) {
                            $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . " must not exceed {$ruleParam} characters";
                        }
                        break;

                    case 'numeric':
                        if (!is_array($raw) && !is_numeric($value)) {
                            $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' must be numeric';
                        }
                        break;

                    case 'in':
                        $allowed = array_map('trim', explode(',', (string) $ruleParam));
                        if (!in_array($value, $allowed, true)) {
                            $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' must be one of: ' . $ruleParam;
                        }
                        break;

                    case 'date':
                        if (!is_array($raw) && strtotime($value) === false) {
                            $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' must be a valid date';
                        }
                        break;

                    case 'after_or_equal':
                        if (!is_array($raw) && $ruleParam && isset($data[$ruleParam])
                            && strtotime($value) < strtotime((string) $data[$ruleParam])) {
                            $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . " must be on or after {$ruleParam}";
                        }
                        break;

                    case 'phone':
                        if (!is_array($raw) && !preg_match('/^[0-9]{10}$/', $value)) {
                            $errors[$field][] = 'Phone number must be 10 digits';
                        }
                        break;

                    case 'enum':
                        if (!is_array($raw) && !preg_match('/^[a-z0-9_-]+$/i', $value)) {
                            $errors[$field][] = ucfirst(str_replace('_', ' ', $field)) . ' contains invalid characters';
                        }
                        break;

                    case 'password':
                        if (!is_array($raw)) {
                            if (mb_strlen($value) < 8) {
                                $errors[$field][] = 'Password must be at least 8 characters';
                            }
                            if (!preg_match('/[A-Z]/', $value)) {
                                $errors[$field][] = 'Password must contain at least one uppercase letter';
                            }
                            if (!preg_match('/[a-z]/', $value)) {
                                $errors[$field][] = 'Password must contain at least one lowercase letter';
                            }
                            if (!preg_match('/[0-9]/', $value)) {
                                $errors[$field][] = 'Password must contain at least one number';
                            }
                        }
                        break;
                }
            }
        }

        return empty($errors) ? true : $errors;
    }

    /**
     * Strip tags/HTML from a scalar value, recursing through arrays.
     * Null is preserved so that optional columns are not turned into "".
     */
    public static function sanitize($data) {
        if (is_array($data)) {
            return array_map([self::class, 'sanitize'], $data);
        }
        if ($data === null) {
            return null;
        }
        if (is_bool($data) || is_int($data) || is_float($data)) {
            return $data;
        }
        return htmlspecialchars(strip_tags(trim((string) $data)), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Sanitize a request payload but keep numeric values numeric, which the
     * previous implementation destroyed by casting everything to string.
     */
    public static function sanitizeInput($data) {
        if (is_array($data)) {
            return array_map([self::class, 'sanitizeInput'], $data);
        }
        if ($data === null || is_bool($data) || is_int($data) || is_float($data)) {
            return $data;
        }
        $clean = htmlspecialchars(strip_tags(trim((string) $data)), ENT_QUOTES, 'UTF-8');
        // Preserve "3" and "3.5" as numbers so MySQL column types line up.
        if (preg_match('/^-?\d+(\.\d+)?$/', $clean)) {
            return strpos($clean, '.') !== false ? (float) $clean : (int) $clean;
        }
        return $clean;
    }

    public static function getJsonInput() {
        $raw = file_get_contents('php://input');
        if ($raw === false || trim($raw) === '') {
            return [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /**
     * Accepts multipart/form-data, application/json and urlencoded bodies.
     * $_POST is only non-empty for the first of those, so both are tried.
     */
    public static function getInput() {
        if (!empty($_POST)) {
            return self::sanitizeInput($_POST);
        }
        $ct = $_SERVER['CONTENT_TYPE'] ?? '';
        if (stripos($ct, 'multipart/form-data') !== false) {
            return self::sanitizeInput($_POST);
        }
        return self::sanitizeInput(self::getJsonInput());
    }

    /** Cast to a positive int ID, or null. */
    public static function id($value) {
        if ($value === null || $value === '' || is_array($value)) {
            return null;
        }
        if (!preg_match('/^\d+$/', trim((string) $value))) {
            return null;
        }
        $id = (int) $value;
        return $id > 0 ? $id : null;
    }

    /**
     * Normalise ?page / ?page_size.
     *
     * These values were previously passed straight into "LIMIT ? OFFSET ?",
     * so a non-numeric or negative page produced a SQL error (or a negative
     * OFFSET). Always use this before paginating.
     *
     * @return array{0:int,1:int} [page, pageSize]
     */
    public static function pagination(array $source = null): array {
        $source = $source ?? $_GET;
        $page = self::id($source['page'] ?? null) ?? 1;
        $size = self::id($source['page_size'] ?? $source['per_page'] ?? null)
            ?? (defined('DEFAULT_PAGE_SIZE') ? (int) DEFAULT_PAGE_SIZE : 20);
        if (defined('MAX_PAGE_SIZE') && $size > (int) MAX_PAGE_SIZE) {
            $size = (int) MAX_PAGE_SIZE;
        }
        return [$page, $size];
    }

    /** Offset for the given page/pageSize pair. */
    public static function offset(int $page, int $pageSize): int {
        return max(0, ($page - 1) * max(1, $pageSize));
    }
}
