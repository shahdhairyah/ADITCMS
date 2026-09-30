<?php
/**
 * ADIT CMS - Study Material Controller
 */

class StudyMaterialController {

    /** Resource name embedded in signed download links. */
    private const DOWNLOAD_RESOURCE = 'material';

    private $studyMaterialModel;

    public function __construct() {
        $this->studyMaterialModel = new StudyMaterial();
    }

    public function index() {
        $role   = AuthMiddleware::getUserRole();
        $userId = AuthMiddleware::getUserId();

        $filters = [
            'subject_id' => Validation::id($_GET['subject_id'] ?? null)
        ];

        if ($role === 'faculty') {
            $facultyId = Faculty::facultyIdForUser($userId);
            if ($facultyId) {
                $filters['faculty_id'] = $facultyId;
            }
        } elseif ($role === 'student') {
            // A student only sees material for subjects in their own
            // department and semester, not the whole catalogue.
            $student = (new Student())->findByUserId($userId);
            if (!$student) {
                Response::forbidden('No student profile is linked to this account');
            }
            $filters['department_id'] = $student['department_id'];
            $filters['semester']      = $student['semester'];
        } elseif ($role === 'hod') {
            $scope = RoleMiddleware::scopeDepartmentId();
            if ($scope === null) {
                Response::forbidden('No department is linked to this HOD account');
            }
            $filters['department_id'] = $scope;
        } elseif ($role !== 'admin') {
            Response::forbidden('Not permitted');
        }

        $materials = $this->studyMaterialModel->getAll($filters);
        Response::success($materials);
    }

    public function store() {
        // Multipart: the body carries both fields and the file, so getInput()
        // (not getJsonInput()) is required or $_FILES never arrives.
        $data = Validation::getInput();
        $userId = AuthMiddleware::getUserId();

        $rules = [
            'title' => 'required|max:255',
            'subject_id' => 'required|numeric'
        ];

        $errors = Validation::validate($data, $rules);
        if ($errors !== true) {
            Response::validationError($errors);
        }

        $facultyId = Faculty::facultyIdForUser($userId);
        if (!$facultyId) {
            Response::forbidden('Only faculty can upload study materials');
        }

        // A teacher may only file material under a subject they actually own.
        if (!RoleMiddleware::teachesSubject($facultyId, (int) $data['subject_id'])) {
            Response::forbidden('You are not assigned to that subject');
        }

        $filePath = null;
        if (!empty($_FILES['file'])) {
            try {
                $filePath = Upload::store($_FILES['file'], 'materials');
            } catch (RuntimeException $e) {
                Response::error($e->getMessage(), 400);
            }
        }

        $data['faculty_id'] = $facultyId;
        $data['file_path'] = $filePath;
        $id = $this->studyMaterialModel->create($data);

        if (!$id) {
            // Don't leave an orphaned file behind on a failed insert.
            if ($filePath !== null) {
                Upload::delete($filePath);
            }
            Response::serverError('Failed to create study material');
        }

        Response::success(['id' => $id], 'Study material created successfully', 201);
    }

    public function update($id) {
        $id = Validation::id($id);
        if ($id === null) {
            Response::error('Invalid study material id', 400);
        }

        // A material may only be edited by the teacher who uploaded it,
        // an admin, or the HOD of the subject's department.
        //
        // This check used to run AFTER the upload, so any teacher could POST a
        // large file to PUT /materials/<someone-elses-id>, be refused with 403,
        // and still leave the file on disk - an unreferenced-file storage DoS.
        $material = $this->studyMaterialModel->getById($id);
        if (!$material) {
            Response::notFound('Study material not found');
        }
        if (!self::canModify($material)) {
            Response::forbidden('You do not have permission to edit this material');
        }

        $data = Validation::getInput();
        $errors = Validation::validate($data, [
            'title' => 'required|max:255',
        ]);
        if ($errors !== true) {
            Response::validationError($errors);
        }

        // StudyMaterial::update's allowlist includes subject_id, so a teacher
        // could re-point their own material at another department's subject
        // and have canRead() then serve it to that department's students.
        // subject_id and faculty_id are pinned to the stored values instead.
        unset($data['subject_id'], $data['faculty_id'], $data['file_path'],
              $data['department_id'], $data['uploaded_by']);

        $filePath = null;
        if (!empty($_FILES['file'])) {
            try {
                $filePath = Upload::store($_FILES['file'], 'materials');
            } catch (RuntimeException $e) {
                Response::error($e->getMessage(), 400);
            }
            $data['file_path'] = $filePath;
        }

        $result = $this->studyMaterialModel->update($id, $data);

        if (!$result) {
            // Don't leave the freshly uploaded file orphaned.
            if ($filePath !== null) {
                Upload::delete($filePath);
            }
            Response::serverError('Failed to update study material');
        }

        // Remove the file that was just replaced.
        if ($filePath !== null && !empty($material['file_path']) && $material['file_path'] !== $filePath) {
            Upload::delete($material['file_path']);
        }

        Response::success(null, 'Study material updated successfully');
    }

    public function destroy($id) {
        $id = Validation::id($id);
        if ($id === null) {
            Response::error('Invalid study material id', 400);
        }

        $material = $this->studyMaterialModel->getById($id);
        if (!$material) {
            Response::notFound('Study material not found');
        }

        $role = AuthMiddleware::getUserRole();
        $ownFacultyId = Faculty::facultyIdForUser(AuthMiddleware::getUserId());
        $isOwner = $ownFacultyId !== null && (int) $material['faculty_id'] === $ownFacultyId;
        $isHod = $role === 'hod'
            && RoleMiddleware::canAccessDepartment($material['department_id'] ?? null);
        if ($role !== 'admin' && !$isOwner && !$isHod) {
            Response::forbidden('You do not have permission to delete this material');
        }

        $result = $this->studyMaterialModel->delete($id);

        if (!$result) {
            Response::serverError('Failed to delete study material');
        }

        Upload::delete($material['file_path']);

        Response::success(null, 'Study material deleted successfully');
    }

    /**
     * Stream an attachment.
     *
     * The old version accepted a ?token= query parameter, trusted
     * $_REQUEST['user_id'] (which any caller can set with ?user_id=1 to skip
     * the check entirely) and re-seeded the identity globals by hand.
     * Authentication now goes through a validated JWT in a real header, and
     * a short-lived signed download token is the only query-string path.
     */
    public function download($id) {
        $id = Validation::id($id);
        if ($id === null) {
            Response::error('Invalid material id', 400);
        }

        $downloadToken = $_GET['dl_token'] ?? null;
        $tokenUserId = null;

        if ($downloadToken !== null) {
            $payload = DownloadToken::validate((string) $downloadToken);
            // DownloadToken::validate() returns the canonical claim names
            // 'resource' and 'id' - not 'mid'.
            if (!$payload
                || $payload['resource'] !== self::DOWNLOAD_RESOURCE
                || (int) $payload['id'] !== $id) {
                Response::unauthorized('Invalid or expired download link');
            }
            // The signature is the credential on this path, but a token minted
            // for an account that has since been suspended must stop working.
            $user = (new User())->findById((int) $payload['user_id']);
            if (!$user || ($user['status'] ?? '') !== 'active') {
                Response::unauthorized('Invalid or expired download link');
            }
            $tokenUserId = (int) $user['id'];
        } else {
            // Throws 401 when the Authorization header is missing/invalid.
            AuthMiddleware::handle();
        }

        $material = $this->studyMaterialModel->getById($id);
        if (!$material) {
            Response::notFound('Study material not found');
        }
        if (empty($material['file_path'])) {
            Response::notFound('No file attached');
        }

        // On the JWT path the session still has to be entitled to the
        // material. On the token path the signature, the resource, the id and
        // the issuing account have already been checked, and there is no
        // session to evaluate canRead() against.
        if ($downloadToken === null && !self::canRead($material)) {
            Response::forbidden('You do not have permission to download this material');
        }

        // Never let a stored path escape the uploads directory.
        $filePath = Upload::resolvePath($material['file_path']);
        if ($filePath === null || !is_file($filePath)) {
            Response::notFound('File not found');
        }

        if ($tokenUserId !== null) {
            $this->studyMaterialModel->recordDownload($id, $tokenUserId);
        } else {
            $this->trackDownload($id);
        }

        $fileName = basename($material['file_path']);
        $fileSize = filesize($filePath);
        $mimeType = mime_content_type($filePath) ?: 'application/octet-stream';

        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        header('Content-Type: ' . $mimeType);
        header('Content-Disposition: attachment; filename="' . str_replace('"', '', $fileName) . '"');
        header('Content-Length: ' . $fileSize);
        header('X-Content-Type-Options: nosniff');
        header('Cache-Control: private, max-age=0, must-revalidate');
        header('Pragma: public');

        readfile($filePath);
        exit;
    }

    /**
     * A material is visible to admin, to the HOD of its department, to the
     * uploading teacher, and to students/faculty of the subject it belongs to.
     * Everything else is refused.
     */
    private static function canRead(array $material): bool {
        $role = AuthMiddleware::getUserRole();
        if ($role === 'admin') {
            return true;
        }

        $ownFacultyId = Faculty::facultyIdForUser(AuthMiddleware::getUserId());
        if ($ownFacultyId !== null && (int) $material['faculty_id'] === $ownFacultyId) {
            return true;
        }
        if ($role === 'hod') {
            return RoleMiddleware::canAccessDepartment($material['department_id'] ?? null);
        }

        // Students (and teachers reading colleagues' material) must be
        // attached to the subject the material is filed under.
        $subjectId = $material['subject_id'] ?? null;
        if ($subjectId === null) {
            return false;
        }
        $subject = (new Subject())->findById($subjectId);
        if (!$subject) {
            return false;
        }
        if ($role === 'student') {
            $student = (new Student())->findByUserId(AuthMiddleware::getUserId());
            return $student
                && (int) $subject['semester'] === (int) $student['semester']
                && (int) $subject['department_id'] === (int) $student['department_id'];
        }
        if ($role === 'faculty') {
            return RoleMiddleware::canAccessDepartment($subject['department_id'] ?? null);
        }
        return false;
    }

    private function trackDownload($materialId) {
        $userId = AuthMiddleware::getUserId();
        $this->studyMaterialModel->recordDownload($materialId, $userId);
    }

    /**
     * Owner (the uploading teacher), admin, or the HOD of the subject's
     * department may change a material.
     */
    private static function canModify(array $material): bool {
        $role = AuthMiddleware::getUserRole();
        if ($role === 'admin') {
            return true;
        }
        $ownFacultyId = Faculty::facultyIdForUser(AuthMiddleware::getUserId());
        if ($ownFacultyId !== null && (int) $material['faculty_id'] === $ownFacultyId) {
            return true;
        }
        if ($role === 'hod') {
            return RoleMiddleware::canAccessDepartment($material['department_id'] ?? null);
        }
        return false;
    }

    /**
     * Delegates to the shared Upload helper, which validates the size,
     * extension allow-list and the real MIME type, and generates a safe
     * filename. A rejected upload raises, so callers must not ignore it.
     */
    private function uploadFile($file, $subfolder) {
        return Upload::store($file, $subfolder);
    }
}
