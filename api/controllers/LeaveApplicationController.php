<?php
/**
 * ADIT CMS - Leave Application Controller
 */

class LeaveApplicationController {

    private $leaveApplicationModel;

    public function __construct() {
        $this->leaveApplicationModel = new LeaveApplication();
    }

    public function index() {
        try {
            $role   = AuthMiddleware::getUserRole();
            $userId = AuthMiddleware::getUserId();

            $filters = ['status' => $_GET['status'] ?? null];

            if ($role === 'student') {
                $student = (new Student())->findByUserId($userId);
                if (!$student) {
                    Response::success([]);
                    return;
                }
                $filters['student_id'] = $student['id'];
            } elseif (in_array($role, ['faculty', 'hod'], true)) {
                // A teacher/HOD only ever sees students in their own
                // department. Scoping in SQL avoids loading every row and
                // filtering afterwards.
                $filters['department_id'] = RoleMiddleware::scopeDepartmentId();
            } elseif ($role !== 'admin') {
                Response::forbidden('You do not have permission to view leave applications');
                return;
            }

            // A teacher may narrow to one student, but only within the
            // department already enforced above.
            $requestedStudent = Validation::id($_GET['student_id'] ?? null);
            if ($requestedStudent !== null) {
                if ($role === 'student' && $requestedStudent !== (int) $filters['student_id']) {
                    Response::forbidden('You can only view your own leave applications');
                    return;
                }
                if ($role !== 'student' && !RoleMiddleware::canAccessStudent($requestedStudent)) {
                    Response::forbidden('You do not have permission to view this student\'s leave applications');
                    return;
                }
                $filters['student_id'] = $requestedStudent;
            }

            $leaves = $this->leaveApplicationModel->getAll($filters);
            Response::success($leaves);
        } catch (Exception $e) {
            error_log("LeaveApplicationController::index Error: " . $e->getMessage());
            Response::serverError('Failed to load the requested list');
        }
    }

    public function store() {
        try {
            $userId = AuthMiddleware::getUserId();
            if (!$userId) {
                Response::unauthorized('User not authenticated');
                return;
            }

            $student = (new Student())->findByUserId($userId);
            if (!$student) {
                error_log("LeaveApplicationController::store - No student profile for user_id: " . $userId);
                Response::notFound('Student profile not found. Please contact admin to set up your student profile.');
                return;
            }

            $rules = [
                'leave_type' => 'required|in:sick,personal,official,other',
                'from_date'  => 'required|date',
                'to_date'    => 'required|date',
                'reason'     => 'required|min:10'
            ];

            // Multipart is handled by Validation::getInput(); the hand-rolled
            // boundary parser this replaced could not see $_FILES and
            // silently dropped the uploaded document.
            $data = Validation::getInput();

            if (empty($data)) {
                Response::error('No data received. Please check your form submission.', 400);
                return;
            }

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
                return;
            }

            if (strtotime($data['to_date']) < strtotime($data['from_date'])) {
                Response::error('The end date cannot be before the start date', 422);
                return;
            }

            $filePath = null;
            if (!empty($_FILES['document'])
                && (int) $_FILES['document']['error'] !== UPLOAD_ERR_NO_FILE) {
                try {
                    $filePath = Upload::store($_FILES['document'], 'leaves');
                } catch (RuntimeException $e) {
                    Response::error($e->getMessage(), 400);
                    return;
                }
            }

            // Never let the client set these.
            $data['student_id']    = $student['id'];
            $data['document_path'] = $filePath;
            unset($data['id'], $data['status'], $data['faculty_reviewed_by'],
                  $data['hod_reviewed_by'], $data['faculty_comments'], $data['hod_comments']);

            $id = $this->leaveApplicationModel->create($data);

            if (!$id) {
                Response::serverError('Failed to create leave application');
                return;
            }

            try {
                $studentEmail = AuthMiddleware::getUserEmail();
                $studentName  = ($student['first_name'] ?? '') . ' ' . ($student['last_name'] ?? '');
                if (!empty($studentEmail)) {
                    EmailHelper::sendLeaveApplication($studentEmail, $studentName, $data);
                }
            } catch (Exception $e) {
                error_log("LeaveApplicationController::store - Email failed: " . $e->getMessage());
            }

            Response::success(['id' => $id], 'Leave application submitted successfully', 201);
        } catch (PDOException $e) {
            error_log("LeaveApplicationController::store PDO Error: " . $e->getMessage());
            Response::serverError('Database error while submitting the leave application');
        } catch (Exception $e) {
            error_log("LeaveApplicationController::store Error: " . $e->getMessage() . " | File: " . $e->getFile() . ":" . $e->getLine());
            Response::serverError('Failed to submit leave application');
        }
    }

    public function update($id) {
        try {
            $userId = AuthMiddleware::getUserId();
            $role   = AuthMiddleware::getUserRole();
            $data   = Validation::getJsonInput();

            $leave = $this->leaveApplicationModel->getById($id);
            if (!$leave) {
                Response::notFound('Leave application not found');
                return;
            }

            // Reviewer columns are FOREIGN KEYs to faculty(id), and an admin
            // has no faculty row - resolve explicitly instead of indexing a
            // missing key.
            $facultyId = Faculty::facultyIdForUser($userId);

            if ($role === 'faculty') {
                if ($facultyId === null) {
                    Response::notFound('Faculty profile not found');
                    return;
                }
                $errors = Validation::validate($data, [
                    'action'   => 'required|in:forward,reject',
                    'comments' => 'max:1000'
                ]);
                if ($errors !== true) {
                    Response::validationError($errors);
                    return;
                }
                $this->assertSameDepartment($leave);
                $result = $this->leaveApplicationModel->facultyReview(
                    $id, $facultyId, $data['action'], $data['comments'] ?? null, $userId
                );
                $actionLabel = ($data['action'] === 'forward') ? 'forwarded to HOD' : 'rejected';

            } elseif (in_array($role, ['hod', 'admin'], true)) {
                $errors = Validation::validate($data, [
                    'action'   => 'required|in:approve,reject',
                    'comments' => 'max:1000'
                ]);
                if ($errors !== true) {
                    Response::validationError($errors);
                    return;
                }
                // An HOD may only decide leaves from their own department.
                if ($role === 'hod') {
                    $this->assertSameDepartment($leave);
                    if ($facultyId === null) {
                        Response::notFound('Faculty profile not found');
                        return;
                    }
                }
                // An admin has no faculty row, so $facultyId is null and
                // hod_reviewed_by was written NULL - the decision was
                // unattributable. The users(id) column records the actor for
                // every role.
                $reviewerId = $facultyId;
                $result = $this->leaveApplicationModel->hodReview(
                    $id, $reviewerId, $data['action'], $data['comments'] ?? null, $userId
                );
                $actionLabel = ($data['action'] === 'approve') ? 'approved' : 'rejected';

            } else {
                Response::forbidden('You are not allowed to review leave applications');
                return;
            }

            if (!$result) {
                Response::serverError('Failed to update leave application. It may have already been reviewed.');
                return;
            }

            try {
                if (!empty($leave['student_email'])) {
                    $leave['comments'] = $data['comments'] ?? '';
                    EmailHelper::sendLeaveStatusNotification(
                        $leave['student_email'],
                        ($leave['first_name'] ?? '') . ' ' . ($leave['last_name'] ?? ''),
                        $leave
                    );
                }
            } catch (Exception $e) {
                error_log("LeaveApplicationController::update - Email failed: " . $e->getMessage());
            }

            Response::success(null, 'Leave application ' . $actionLabel . ' successfully');
        } catch (Exception $e) {
            error_log("LeaveApplicationController::update Error: " . $e->getMessage());
            Response::serverError('Failed to update leave application');
        }
    }

    /** The reviewing HOD/teacher must belong to the student's department. */
    private function assertSameDepartment(array $leave) {
        $student = (new Student())->findById((int) $leave['student_id']);
        if (!$student) {
            Response::notFound('Student profile not found');
        }
        if (!RoleMiddleware::canAccessDepartment($student['department_id'])) {
            Response::forbidden('This leave application belongs to another department');
        }
    }

    /**
     * Stream a leave attachment.
     * Previously any authenticated user could fetch any document by id.
     */
    public function getDocument($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid application id', 400);
                return;
            }

            $leave = $this->leaveApplicationModel->getById($id);
            if (!$leave) {
                Response::notFound('Leave application not found');
                return;
            }
            if (empty($leave['document_path'])) {
                Response::notFound('No document attached');
                return;
            }

            $studentId = (int) $leave['student_id'];
            $role      = AuthMiddleware::getUserRole();

            $allowed = false;
            if ($role === 'student') {
                // Only the student who owns the leave.
                $mine = (new Student())->findByUserId(AuthMiddleware::getUserId());
                $allowed = $mine && (int) $mine['id'] === $studentId;
            } elseif (in_array($role, ['faculty', 'hod'], true)) {
                $allowed = $this->isSameDepartment($leave);
            } elseif ($role === 'admin') {
                $allowed = true;
            }

            if (!$allowed) {
                Response::forbidden('You do not have permission to view this document');
                return;
            }

            $filePath = Upload::resolvePath($leave['document_path']);
            if ($filePath === null) {
                Response::notFound('Document file not found');
                return;
            }

            while (ob_get_level() > 0) {
                ob_end_clean();
            }
            header('Content-Type: ' . (mime_content_type($filePath) ?: 'application/octet-stream'));
            header('Content-Disposition: inline; filename="' . str_replace('"', '', basename($filePath)) . '"');
            header('X-Content-Type-Options: nosniff');
            readfile($filePath);
            exit;
        } catch (Exception $e) {
            error_log("LeaveApplicationController::getDocument Error: " . $e->getMessage());
            Response::serverError('Failed to load the document');
        }
    }

    private function isSameDepartment(array $leave) {
        $student = (new Student())->findById((int) $leave['student_id']);
        return $student && RoleMiddleware::canAccessDepartment($student['department_id']);
    }

    public function withdraw($id) {
        try {
            $userId = AuthMiddleware::getUserId();
            if (!$userId) {
                Response::unauthorized('User not authenticated');
                return;
            }

            $student = (new Student())->findByUserId($userId);
            if (!$student) {
                Response::forbidden('Student profile not found');
                return;
            }

            $leave = $this->leaveApplicationModel->getById($id);
            if (!$leave) {
                Response::notFound('Leave application not found');
                return;
            }

            if ((int) $leave['student_id'] !== (int) $student['id']) {
                Response::forbidden('You can only withdraw your own leave applications');
                return;
            }

            if ($leave['status'] !== 'pending') {
                Response::error('Only pending leave applications can be withdrawn', 400);
                return;
            }

            $result = $this->leaveApplicationModel->withdraw($id, $student['id']);
            if (!$result) {
                Response::serverError('Failed to withdraw leave application');
                return;
            }

            try {
                $studentEmail = AuthMiddleware::getUserEmail();
                $studentName  = ($student['first_name'] ?? '') . ' ' . ($student['last_name'] ?? '');
                if (!empty($studentEmail)) {
                    $leave['status'] = 'withdrawn';
                    EmailHelper::sendLeaveStatusNotification($studentEmail, $studentName, $leave);
                }
            } catch (Exception $e) {
                error_log("LeaveApplicationController::withdraw - Email failed: " . $e->getMessage());
            }

            Response::success(null, 'Leave application withdrawn successfully');
        } catch (PDOException $e) {
            error_log("LeaveApplicationController::withdraw PDO Error: " . $e->getMessage());
            Response::serverError('Database error while withdrawing the application');
        } catch (Exception $e) {
            error_log("LeaveApplicationController::withdraw Error: " . $e->getMessage());
            Response::serverError('Failed to withdraw leave application');
        }
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
