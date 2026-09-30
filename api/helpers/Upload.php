<?php
/**
 * ADIT CMS - File Upload Helper
 *
 * Centralises upload handling so every endpoint validates the same way and
 * a .php (or .htaccess) file can never land in the web-accessible uploads
 * directory. Replaces five near-duplicate private uploadFile() methods.
 */

class Upload {

    /**
     * @param array  $file     One entry from $_FILES.
     * @param string $subfolder Sub-directory of UPLOAD_PATH, e.g. 'assignments'.
     * @param bool   $imageOnly Restrict to image types (profile photos).
     * @return string           Relative path, e.g. "assignments/1699_ab12cd.pdf".
     * @throws RuntimeException on any invalid / rejected upload.
     */
    public static function store(array $file, string $subfolder, bool $imageOnly = false): string {
        $error = $file['error'] ?? UPLOAD_ERR_NO_FILE;
        if ($error !== UPLOAD_ERR_OK) {
            throw new RuntimeException(self::errorMessage((int) $error));
        }

        $tmp = $file['tmp_name'] ?? '';
        if ($tmp === '' || !is_uploaded_file($tmp)) {
            throw new RuntimeException('Invalid upload: temporary file is missing');
        }

        $size = (int) ($file['size'] ?? 0);
        $max  = defined('MAX_FILE_SIZE') ? (int) MAX_FILE_SIZE : (5 * 1024 * 1024);
        if ($size <= 0) {
            throw new RuntimeException('Invalid upload: file is empty');
        }
        if ($size > $max) {
            throw new RuntimeException(
                'File is too large (' . self::humanSize($size) . '). Maximum is ' . self::humanSize($max) . '.'
            );
        }

        $original = (string) ($file['name'] ?? 'upload');
        $ext      = strtolower((string) pathinfo($original, PATHINFO_EXTENSION));

        // 1) Never allow a name that the web server would execute.
        $blocked = defined('BLOCKED_EXTENSIONS') ? BLOCKED_EXTENSIONS : ['php', 'phtml', 'phar', 'htaccess'];
        if (in_array($ext, $blocked, true) || $ext === '') {
            throw new RuntimeException('Files of this type are not allowed');
        }

        // 2) Extension allow-list, so a double extension cannot sneak through.
        if ($imageOnly) {
            $allowed = defined('ALLOWED_IMAGE_EXTENSIONS') ? ALLOWED_IMAGE_EXTENSIONS : ['jpg', 'jpeg', 'png'];
        } else {
            $allowed = array_merge(
                defined('ALLOWED_DOC_EXTENSIONS') ? ALLOWED_DOC_EXTENSIONS : ['pdf', 'doc', 'docx', 'txt'],
                defined('ALLOWED_IMAGE_EXTENSIONS') ? ALLOWED_IMAGE_EXTENSIONS : ['jpg', 'jpeg', 'png']
            );
        }
        if (!in_array($ext, $allowed, true)) {
            throw new RuntimeException(
                'File type ".' . htmlspecialchars($ext) . '" is not allowed. Allowed: ' . implode(', ', $allowed)
            );
        }

        // 3) Confirm the real MIME type, not the client-supplied one.
        $finfo    = new finfo(FILEINFO_MIME_TYPE);
        $realMime = (string) $finfo->file($tmp);
        $realExt  = strtolower((string) $finfo->file($tmp, FILEINFO_EXTENSION));
        $realExt  = ltrim($realExt, '.');

        if ($imageOnly) {
            $mimes = defined('ALLOWED_IMAGE_TYPES') ? ALLOWED_IMAGE_TYPES : ['image/jpeg', 'image/png'];
            if (!in_array($realMime, $mimes, true)) {
                throw new RuntimeException('Only JPEG and PNG images are allowed (detected: ' . $realMime . ')');
            }
        } elseif (!in_array($realMime, self::allowedMimes(), true)) {
            throw new RuntimeException('Unsupported file content type: ' . $realMime);
        }

        // 4) The detected extension must agree with the requested one.
        if ($realExt !== '' && $realExt !== $ext) {
            throw new RuntimeException(
                'File extension ".' . $ext . '" does not match its real content ("' . $realMime . '")'
            );
        }

        // 5) Destination.
        $base = defined('UPLOAD_PATH') ? UPLOAD_PATH : __DIR__ . '/../uploads/';
        $dir  = rtrim($base, '/\\') . '/' . trim($subfolder, '/\\');
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            // The absolute path is logged, never returned: this message is
            // echoed straight back to the client as a 400.
            error_log('ADIT CMS: upload directory is not writable: ' . $dir);
            throw new RuntimeException('Upload destination is not writable');
        }

        // 6) Generated name only - the client filename is never reused.
        $safeStem = preg_replace('/[^A-Za-z0-9._-]/', '_', (string) pathinfo($original, PATHINFO_FILENAME));
        $safeStem = substr($safeStem, 0, 40) ?: 'file';
        $name     = date('Ymd_His') . '_' . bin2hex(random_bytes(6)) . '_' . $safeStem . '.' . $ext;
        $dest     = $dir . '/' . $name;

        if (!move_uploaded_file($tmp, $dest)) {
            throw new RuntimeException('Failed to save the uploaded file');
        }
        @chmod($dest, 0644);

        return trim($subfolder, '/\\') . '/' . $name;
    }

    /**
     * Store an upload, returning null instead of throwing.
     * Use for optional attachments.
     */
    public static function storeOrNull(?array $file, string $subfolder, bool $imageOnly = false): ?string {
        if (!$file || (int) ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return null;
        }
        return self::store($file, $subfolder, $imageOnly);
    }

    /**
     * Delete a previously stored file, refusing any path that escapes uploads.
     */
    public static function delete(?string $relativePath): bool {
        if (!$relativePath) {
            return false;
        }
        $base = realpath(defined('UPLOAD_PATH') ? UPLOAD_PATH : '');
        if ($base === false) {
            return false;
        }
        $target = realpath($base . '/' . ltrim(str_replace('\\', '/', $relativePath), '/'));
        if ($target === false || strpos($target, $base) !== 0 || is_dir($target)) {
            return false;
        }
        return @unlink($target);
    }

    /**
     * Store an image supplied as a base64 data URI or bare base64 string.
     *
     * Used by the profile-photo endpoints, which accept either multipart or
     * JSON. The decoded bytes go through the same finfo MIME check as a
     * normal upload, so a data: URI that merely claims to be an image cannot
     * be used to write arbitrary content into the web root.
     *
     * @return string Relative path.
     * @throws RuntimeException when the payload is not a valid image.
     */
    public static function storeBase64Image(string $payload, string $subfolder): string {
        $max = defined('MAX_FILE_SIZE') ? (int) MAX_FILE_SIZE : (5 * 1024 * 1024);

        // Reject before decoding if the encoded form alone is over the limit.
        if (strlen($payload) > (int) ceil($max * 4 / 3) + 1024) {
            throw new RuntimeException('Image is too large (maximum ' . self::humanSize($max) . ')');
        }

        if (preg_match('#^data:([\w.+/-]+);base64,#i', $payload, $m)) {
            $declaredMime = strtolower($m[1]);
            $payload = substr($payload, strpos($payload, ',') + 1);
        } else {
            $declaredMime = '';
        }

        $payload = preg_replace('/\s+/', '', $payload);
        if ($payload === '' || !preg_match('#^[A-Za-z0-9+/]*={0,2}$#', $payload)) {
            throw new RuntimeException('Invalid base64 image data');
        }

        $binary = base64_decode($payload, true);
        if ($binary === false || $binary === '') {
            throw new RuntimeException('Failed to decode base64 image');
        }
        if (strlen($binary) > $max) {
            throw new RuntimeException('Image is too large (maximum ' . self::humanSize($max) . ')');
        }

        $finfo = new finfo(FILEINFO_MIME_TYPE);
        $realMime = (string) $finfo->buffer($binary);
        $allowed = defined('ALLOWED_IMAGE_TYPES') ? ALLOWED_IMAGE_TYPES : ['image/jpeg', 'image/png'];

        if (!in_array($realMime, $allowed, true)) {
            throw new RuntimeException(
                'The uploaded data is not an allowed image (detected: ' . $realMime . ')'
            );
        }
        if ($declaredMime !== '' && strpos($realMime, 'image/') !== 0) {
            throw new RuntimeException('The data URI does not contain an image');
        }

        $ext = [
            'image/jpeg' => 'jpg',
            'image/jpg'  => 'jpg',
            'image/png'  => 'png',
            'image/gif'  => 'gif',
            'image/webp' => 'webp',
        ][$realMime] ?? 'jpg';

        $base = defined('UPLOAD_PATH') ? UPLOAD_PATH : __DIR__ . '/../uploads/';
        $dir  = rtrim($base, '/\\') . '/' . trim($subfolder, '/\\');
        if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
            error_log('ADIT CMS: image upload directory is not writable: ' . $dir);
            throw new RuntimeException('Upload destination is not writable');
        }

        $name = date('Ymd_His') . '_' . bin2hex(random_bytes(6));
        $dest = $dir . '/' . $name . '.' . $ext;
        if (@file_put_contents($dest, $binary, LOCK_EX) === false) {
            throw new RuntimeException('Failed to save the image to disk');
        }
        @chmod($dest, 0644);

        return trim($subfolder, '/\\') . '/' . $name . '.' . $ext;
    }

    /**
     * Turn a stored relative path into an absolute path inside UPLOAD_PATH.
     * Returns null for anything that escapes the upload root (../ traversal)
     * or does not exist, so download endpoints cannot be used to read
     * arbitrary files.
     */
    public static function resolvePath(?string $relativePath): ?string {
        if ($relativePath === null || $relativePath === '') {
            return null;
        }
        $base = realpath(defined('UPLOAD_PATH') ? UPLOAD_PATH : '');
        if ($base === false) {
            return null;
        }
        $candidate = $base . '/' . ltrim(str_replace('\\', '/', $relativePath), '/');
        $real = realpath($candidate);
        if ($real === false || strpos($real, $base) !== 0) {
            return null;
        }
        return is_file($real) ? $real : null;
    }

    /** Public web URL for a stored relative path. */
    public static function url(?string $relativePath): ?string {
        if (!$relativePath) {
            return null;
        }
        $base = defined('FRONTEND_URL') ? FRONTEND_URL : '';
        return $base . '/uploads/' . ltrim(str_replace('\\', '/', $relativePath), '/');
    }

    private static function allowedMimes(): array {
        return [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'application/rtf',
            'application/x-rtf',
            'text/rtf',
            'text/plain',
            'text/csv',
            'text/html',                 // stripped to .txt by the allow-list
            'application/octet-stream',  // only survives if the detected ext matches
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
        ];
    }

    private static function errorMessage(int $code): string {
        switch ($code) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                return 'File is too large for the server upload limit';
            case UPLOAD_ERR_PARTIAL:
                return 'File was only partially uploaded, please try again';
            case UPLOAD_ERR_NO_FILE:
                return 'No file was uploaded';
            case UPLOAD_ERR_NO_TMP_DIR:
                return 'Server has no temporary folder for uploads';
            case UPLOAD_ERR_CANT_WRITE:
                return 'Server failed to write the file to disk';
            case UPLOAD_ERR_EXTENSION:
                return 'A PHP extension stopped the upload';
            default:
                return 'Upload failed (error code ' . $code . ')';
        }
    }

    private static function humanSize(int $bytes): string {
        return $bytes >= 1048576
            ? round($bytes / 1048576, 1) . ' MB'
            : round($bytes / 1024) . ' KB';
    }
}
