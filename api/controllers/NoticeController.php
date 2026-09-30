<?php
/**
 * ADIT CMS - Notice Controller
 */

class NoticeController {
    
    private $noticeModel;

    public function __construct() {
        $this->noticeModel = new Notice();
    }

    public function index() {
        try {
            $role   = AuthMiddleware::getUserRole();
            $userId = AuthMiddleware::getUserId();

            $types     = ['college', 'department', 'exam', 'event', 'general'];
            $audiences = ['all', 'student', 'faculty', 'staff'];

            $filters = [
                'type'            => in_array($_GET['type'] ?? '', $types, true) ? $_GET['type'] : null,
                'target_audience' => in_array($_GET['target_audience'] ?? '', $audiences, true) ? $_GET['target_audience'] : null,
            ];

            if ($role === 'student') {
                $student = (new Student())->findByUserId($userId);
                if (!$student) {
                    Response::forbidden('No student profile is linked to this account');
                }
                $filters['department_id'] = $student['department_id'];
                $filters['target_audience'] = 'student';
            } elseif ($role === 'faculty' || $role === 'hod' || $role === 'librarian') {
                // department_id used to be read straight from the query string
                // for these roles, so ?department_id=4 pulled another
                // department's internal notices. It is now derived from the
                // caller's own profile and the parameter is ignored.
                $deptId = RoleMiddleware::scopeDepartmentId();
                if ($deptId === null || $deptId < 1) {
                    Response::forbidden('No department scope for this account');
                }
                $filters['department_id'] = $deptId;
                unset($filters['target_audience']);
            } elseif ($role === 'admin') {
                // admins may filter across departments
                $filters['department_id'] = Validation::id($_GET['department_id'] ?? null);
            } else {
                Response::forbidden('You do not have permission to view notices');
            }

            $notices = $this->noticeModel->getAll($filters);
            Response::success($notices);
        } catch (Exception $e) {
            error_log("NoticeController::index Error: " . $e->getMessage());
            Response::serverError('Failed to load notices');
        }
    }

    public function store() {
        try {
            $data = Validation::getJsonInput();
            $data['created_by'] = AuthMiddleware::getUserId();

            $rules = [
                'title' => 'required|max:255',
                'content' => 'required'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $data = $this->applyAudienceScope($data, true);

            $id = $this->noticeModel->create($data);
            
            if (!$id) {
                Response::serverError('Failed to create notice');
            }

            Response::success(['id' => $id], 'Notice created successfully', 201);
        } catch (Exception $e) {
            error_log("NoticeController::store Error: " . $e->getMessage());
            Response::serverError('Failed to create notice');
        }
    }

    public function update($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid notice id', 400);
            }

            $existing = $this->noticeModel->getById($id);
            if (!$existing) {
                Response::notFound('Notice not found');
            }

            // An HOD was previously able to rewrite any notice in the college,
            // because Notice::update's allowlist includes department_id and
            // target_audience and nothing checked the notice's department.
            if (AuthMiddleware::getUserRole() !== 'admin'
                && !RoleMiddleware::canAccessDepartment($existing['department_id'])) {
                Response::forbidden('That notice belongs to another department');
            }

            $data = Validation::getJsonInput();
            $errors = Validation::validate($data, [
                'title'   => 'required|max:255',
                'content' => 'required',
            ]);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $data = $this->applyAudienceScope($data, false);

            // created_by must never be reassignable.
            unset($data['created_by']);

            $result = $this->noticeModel->update($id, $data);
            
            if (!$result) {
                Response::serverError('Failed to update notice');
            }

            Response::success(null, 'Notice updated successfully');
        } catch (Exception $e) {
            error_log("NoticeController::update Error: " . $e->getMessage());
            Response::serverError('Failed to update notice');
        }
    }

    public function destroy($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid notice id', 400);
            }

            $existing = $this->noticeModel->getById($id);
            if (!$existing) {
                Response::notFound('Notice not found');
            }
            if (AuthMiddleware::getUserRole() !== 'admin'
                && !RoleMiddleware::canAccessDepartment($existing['department_id'])) {
                Response::forbidden('That notice belongs to another department');
            }

            $result = $this->noticeModel->delete($id);
            
            if (!$result) {
                Response::serverError('Failed to delete notice');
            }

            Response::success(null, 'Notice deleted successfully');
        } catch (Exception $e) {
            error_log("NoticeController::destroy Error: " . $e->getMessage());
            Response::serverError('Failed to delete notice');
        }
    }

    /**
     * Constrain department_id / target_audience to what the caller may set.
     *
     * An HOD can only post inside their own department, and cannot escalate
     * the audience to "all" (which would re-broadcast a departmental notice
     * college-wide). Admins are unrestricted.
     */
    private function applyAudienceScope(array $data, bool $isCreate): array {
        $audiences = ['all', 'student', 'faculty', 'staff'];
        if (isset($data['target_audience'])) {
            if (!in_array($data['target_audience'], $audiences, true)) {
                Response::error('Invalid target audience', 400);
            }
        }

        if (AuthMiddleware::getUserRole() === 'admin') {
            if (isset($data['department_id'])) {
                $deptId = Validation::id($data['department_id']);
                if ($deptId === null) {
                    Response::error('Invalid department id', 400);
                }
                $data['department_id'] = $deptId;
            }
            return $data;
        }

        $deptId = RoleMiddleware::scopeDepartmentId();
        if ($deptId === null || $deptId < 1) {
            Response::forbidden('No department scope for this account');
        }
        $data['department_id'] = $deptId;

        if (($data['target_audience'] ?? null) === 'all') {
            Response::forbidden('Only an admin may post a college-wide notice');
        }

        return $data;
    }

    public function studentNotices() {
        try {
            $userId = AuthMiddleware::getUserId();
            $studentModel = new Student();
            $student = $studentModel->findByUserId($userId);

            $filters = [
                'type' => $_GET['type'] ?? null,
                'department_id' => $student['department_id'] ?? null,
                'target_audience' => 'student',
            ];

            $notices = $this->noticeModel->getAll($filters);
            Response::success($notices);
        } catch (Exception $e) {
            error_log("NoticeController::studentNotices Error: " . $e->getMessage());
            Response::serverError('Failed to load student notices');
        }
    }
}
