<?php
/**
 * ADIT CMS - Lab Manual Controller
 */

class LabManualController {

    private $labManualModel;

    public function __construct() {
        $this->labManualModel = new LabManual();
    }

    public function index() {
        try {
            $role   = AuthMiddleware::getUserRole();
            $userId = AuthMiddleware::getUserId();

            $filters = [
                'subject_id' => Validation::id($_GET['subject_id'] ?? null)
            ];

            if ($role === 'faculty') {
                $facultyId = Faculty::facultyIdForUser($userId);
                if ($facultyId === null) {
                    Response::forbidden('No faculty profile is linked to this account');
                }
                $filters['faculty_id'] = $facultyId;
            } elseif ($role === 'student') {
                // The route has no role list, so a student previously received
                // every lab manual in the college.
                $student = (new Student())->findByUserId($userId);
                if (!$student) {
                    Response::forbidden('No student profile is linked to this account');
                }
                $filters['subject_ids'] = array_column(
                    (new Student())->getSubjects($student['id']),
                    'id'
                );
            } elseif ($role === 'hod') {
                $deptId = RoleMiddleware::scopeDepartmentId();
                if ($deptId === null || $deptId < 1) {
                    Response::forbidden('No department scope for this account');
                }
                $filters['department_id'] = $deptId;
            } elseif ($role !== 'admin') {
                Response::forbidden('You do not have permission to view lab manuals');
            }

            $labManuals = $this->labManualModel->getAll($filters);
            Response::success($labManuals);
        } catch (Exception $e) {
            error_log("LabManualController::index Error: " . $e->getMessage());
            Response::serverError('Failed to load lab manuals');
        }
    }

    public function store() {
        try {
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

            // faculty_id comes from the session, never from the payload.
            $facultyId = Faculty::facultyIdForUser($userId);
            if (!$facultyId) {
                Response::forbidden('Only faculty can create lab manuals');
            }

            // subject_id is attacker-controlled, so confirm the teacher
            // actually owns that subject.
            if (!RoleMiddleware::teachesSubject($facultyId, (int) $data['subject_id'])) {
                Response::forbidden('You are not assigned to that subject');
            }

            $data['faculty_id'] = $facultyId;
            $id = $this->labManualModel->create($data);
            
            if (!$id) {
                Response::serverError('Failed to create lab manual');
            }

            Response::success(['id' => $id], 'Lab manual created successfully', 201);
        } catch (Exception $e) {
            error_log("LabManualController::store Error: " . $e->getMessage());
            Response::serverError('Failed to create lab manual');
        }
    }

    public function update($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid lab manual id', 400);
            }

            $data = Validation::getJsonInput();
            $this->assertCanManage($id);

            $errors = Validation::validate($data, ['title' => 'required|max:255']);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            // LabManual::update's allowlist includes subject_id, so a teacher
            // could re-file their own manual under another department's
            // subject. Ownership does not change on edit.
            unset($data['subject_id'], $data['faculty_id']);

            $result = $this->labManualModel->update($id, $data);
            
            if (!$result) {
                Response::serverError('Failed to update lab manual');
            }

            Response::success(null, 'Lab manual updated successfully');
        } catch (Exception $e) {
            error_log("LabManualController::update Error: " . $e->getMessage());
            Response::serverError('Failed to update lab manual');
        }
    }

    public function destroy($id) {
        try {
            $this->assertCanManage($id);
            $result = $this->labManualModel->delete($id);
            
            if (!$result) {
                Response::serverError('Failed to delete lab manual');
            }

            Response::success(null, 'Lab manual deleted successfully');
        } catch (Exception $e) {
            error_log("LabManualController::destroy Error: " . $e->getMessage());
            Response::serverError('Failed to delete lab manual');
        }
    }

    public function submit($labManualId) {
        try {
            $userId = AuthMiddleware::getUserId();
            $studentModel = new Student();
            $student = $studentModel->findByUserId($userId);

            if (!$student) {
                Response::notFound('Student profile not found');
            }

            $labManual = $this->labManualModel->getById($labManualId);
            if (!$labManual) {
                Response::notFound('Lab manual not found');
            }

            // Multipart: the file arrives with the request body.
            $filePath = null;
            $upload = $_FILES['lab_file'] ?? $_FILES['file'] ?? null;
            if ($upload && (int) ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
                try {
                    $filePath = Upload::store($upload, 'lab_submissions');
                } catch (RuntimeException $e) {
                    Response::error($e->getMessage(), 400);
                }
            }

            $data = [
                'lab_manual_id' => $labManualId,
                'student_id' => $student['id'],
                'file_path' => $filePath
            ];

            $id = $this->labManualModel->submitLab($data);
            
            if (!$id) {
                Response::serverError('Failed to submit lab manual');
            }

            Response::success(['id' => $id], 'Lab submitted successfully', 201);
        } catch (Exception $e) {
            error_log("LabManualController::submit Error: " . $e->getMessage());
            Response::serverError('Failed to submit lab manual');
        }
    }

    public function submissions($labManualId) {
        try {
            // Only the teacher who owns the manual, their HOD, or an admin.
            $this->assertCanManage($labManualId);

            $submissions = $this->labManualModel->getSubmissions($labManualId);
            Response::success($submissions);
        } catch (Exception $e) {
            error_log("LabManualController::submissions Error: " . $e->getMessage());
            Response::serverError('Failed to load submissions');
        }
    }

    public function reviewSubmission($submissionId) {
        try {
            $submissionId = Validation::id($submissionId);
            if ($submissionId === null) {
                Response::error('Invalid submission id', 400);
            }

            // The route allows ['faculty','admin'] and previously wrote marks
            // with no check at all, so any teacher could award full marks to
            // any submission id in the college. The submission has to belong
            // to a manual the reviewer manages, and to a student they may
            // reach.
            $submission = $this->labManualModel->getSubmissionById($submissionId);
            if (!$submission) {
                Response::notFound('Submission not found');
            }
            $this->assertCanManage($submission['lab_manual_id']);
            if (!RoleMiddleware::canAccessStudent($submission['student_id'])) {
                Response::forbidden('You do not have permission to grade this student');
            }

            $data = Validation::getJsonInput();

            $rules = [
                'marks' => 'required|numeric',
                'status' => 'required|in:accepted,rejected'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            // lab_submissions.reviewed_by is a FOREIGN KEY to faculty(id), and
            // an admin has no faculty row, so for them the reviewer column is
            // left untouched instead of writing NULL, and reviewed_by_user
            // records who actually performed the review. (lab_manuals has no
            // max_marks column, so marks are only bounded to a sane range.)
            $marks = (float) $data['marks'];
            if ($marks < 0 || $marks > 1000) {
                Response::error('Marks must be between 0 and 1000', 400);
            }

            $userId = AuthMiddleware::getUserId();
            $data['reviewed_by_user'] = $userId;
            $facultyId = Faculty::facultyIdForUser($userId);
            if ($facultyId !== null) {
                $data['reviewed_by'] = $facultyId;
            }

            $result = $this->labManualModel->reviewSubmission($submissionId, $data);
            
            if (!$result) {
                Response::serverError('Failed to review submission');
            }

            Response::success(null, 'Submission reviewed successfully');
        } catch (Exception $e) {
            error_log("LabManualController::reviewSubmission Error: " . $e->getMessage());
            Response::serverError('Failed to review submission');
        }
    }

    public function studentSubmissions() {
        try {
            $userId = AuthMiddleware::getUserId();
            $studentModel = new Student();
            $student = $studentModel->findByUserId($userId);

            if (!$student) {
                Response::success([]);
                return;
            }

            $submissions = $this->labManualModel->getStudentSubmissions($student['id']);
            Response::success($submissions);
        } catch (Exception $e) {
            error_log("LabManualController::studentSubmissions Error: " . $e->getMessage());
            Response::serverError('Failed to load student submissions');
        }
    }

    /** Owner, admin, or the HOD of the subject's department. */
    private function assertCanManage($id) {
        $labManual = $this->labManualModel->getById($id);
        if (!$labManual) {
            Response::notFound('Lab manual not found');
        }
        $facultyId = Faculty::facultyIdForUser(AuthMiddleware::getUserId());
        if ($facultyId !== null && (int) $labManual['faculty_id'] === $facultyId) {
            return;
        }
        $role = AuthMiddleware::getUserRole();
        if ($role === 'admin') {
            return;
        }
        $deptId = (new Subject())->getDepartmentId((int) $labManual['subject_id']);
        if ($role === 'hod' && RoleMiddleware::canAccessDepartment($deptId)) {
            return;
        }
        Response::forbidden('You do not have permission to manage this lab manual');
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
