<?php
/**
 * ADIT CMS - Assignment Controller
 */

class AssignmentController {
    
    private $assignmentModel;

    public function __construct() {
        $this->assignmentModel = new Assignment();
    }

    public function index() {
        try {
            $role = AuthMiddleware::getUserRole();
            $userId = AuthMiddleware::getUserId();

            if ($role === 'student') {
                $student = (new Student())->findByUserId($userId);
                if (!$student) {
                    Response::forbidden('No student profile is linked to this account');
                }

                // Restricted to the student's own subjects. The route has no
                // role list and no filter was applied, so a student could
                // enumerate every assignment in the college.
                $mySubjects = (new Student())->getSubjects($student['id']);
                $filters = [
                    'subject_ids' => array_column($mySubjects, 'id'),
                    'subject_id'  => Validation::id($_GET['subject_id'] ?? null),
                ];
                $assignments = $this->assignmentModel->getAll($filters);

                $submissions = $this->assignmentModel->getStudentSubmissions($student['id']);
                $submissionMap = [];
                foreach ($submissions as $sub) {
                    $submissionMap[$sub['assignment_id']] = $sub;
                }
                
                foreach ($assignments as &$assignment) {
                    $assignment['submission'] = $submissionMap[$assignment['id']] ?? null;
                }
                
                Response::success($assignments);
            } elseif ($role === 'faculty') {
                $facultyId = $this->getFacultyId($userId);
                if ($facultyId === null) {
                    Response::forbidden('No faculty profile is linked to this account');
                }
                $assignments = $this->assignmentModel->getAll([
                    'subject_id'  => Validation::id($_GET['subject_id'] ?? null),
                    'faculty_id'  => $facultyId,
                ]);
                Response::success($assignments);
            } elseif ($role === 'hod') {
                $deptId = RoleMiddleware::scopeDepartmentId();
                if ($deptId === null || $deptId < 1) {
                    Response::forbidden('No department scope for this account');
                }
                $assignments = $this->assignmentModel->getAll([
                    'subject_id'     => Validation::id($_GET['subject_id'] ?? null),
                    'department_id'  => $deptId,
                ]);
                Response::success($assignments);
            } elseif ($role === 'admin') {
                $assignments = $this->assignmentModel->getAll([
                    'subject_id' => Validation::id($_GET['subject_id'] ?? null),
                ]);
                Response::success($assignments);
            } else {
                Response::forbidden('You do not have permission to view assignments');
            }
        } catch (Exception $e) {
            error_log("AssignmentController::index Error: " . $e->getMessage());
            Response::serverError('Failed to load assignments');
        }
    }

    public function store() {
        try {
            $data = Validation::getInput();
            $userId = AuthMiddleware::getUserId();

            $rules = [
                'title' => 'required|max:255',
                'subject_id' => 'required|numeric',
                'deadline' => 'required|date',
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            // faculty_id is derived from the session, never from the payload.
            $facultyId = Faculty::facultyIdForUser($userId);
            if (!$facultyId) {
                Response::forbidden('Only faculty can create assignments');
            }
            if (!$this->teachesSubject($facultyId, (int) $data['subject_id'])) {
                Response::forbidden('You can only create assignments for a subject you teach');
            }

            $data['faculty_id'] = $facultyId;
            $id = $this->assignmentModel->create($data);
            
            if (!$id) {
                Response::serverError('Failed to create assignment');
            }

            Response::success(['id' => $id], 'Assignment created successfully', 201);
        } catch (Exception $e) {
            error_log("AssignmentController::store Error: " . $e->getMessage());
            Response::serverError('Failed to create assignment');
        }
    }

    public function update($id) {
        try {
            $data = Validation::getJsonInput();
            $this->assertCanManage($id);
            $result = $this->assignmentModel->update($id, $data);
            
            if (!$result) {
                Response::serverError('Failed to update assignment');
            }

            Response::success(null, 'Assignment updated successfully');
        } catch (Exception $e) {
            error_log("AssignmentController::update Error: " . $e->getMessage());
            Response::serverError('Failed to update assignment');
        }
    }

    /** Owner, admin, or the HOD of the subject's department. */
    private function assertCanManage($id) {
        $assignment = $this->assignmentModel->getById($id);
        if (!$assignment) {
            Response::notFound('Assignment not found');
        }
        $facultyId = Faculty::facultyIdForUser(AuthMiddleware::getUserId());
        if ($facultyId !== null && (int) $assignment['faculty_id'] === $facultyId) {
            return;
        }
        $role = AuthMiddleware::getUserRole();
        if ($role === 'admin') {
            return;
        }
        if ($role === 'hod' && RoleMiddleware::canAccessDepartment(
            $this->assignmentModel->getDepartmentIdForSubject((int) $assignment['subject_id'])
        )) {
            return;
        }
        Response::forbidden('You do not have permission to manage this assignment');
    }

    /** Is this faculty member the assigned teacher for the subject? */
    private function teachesSubject($facultyId, $subjectId) {
        return RoleMiddleware::teachesSubject($facultyId, $subjectId);
    }

    public function destroy($id) {
        try {
            $this->assertCanManage($id);
            $result = $this->assignmentModel->delete($id);
            
            if (!$result) {
                Response::serverError('Failed to delete assignment');
            }

            Response::success(null, 'Assignment deleted successfully');
        } catch (Exception $e) {
            error_log("AssignmentController::destroy Error: " . $e->getMessage());
            Response::serverError('Failed to delete assignment');
        }
    }

    public function submit($assignmentId) {
        try {
            $userId = AuthMiddleware::getUserId();
            $studentModel = new Student();
            $student = $studentModel->findByUserId($userId);

            if (!$student) {
                Response::notFound('Student profile not found');
            }

            $assignment = $this->assignmentModel->getById($assignmentId);
            if (!$assignment) {
                Response::notFound('Assignment not found');
            }

            if (strtotime($assignment['deadline']) < time()) {
                Response::error('Assignment deadline has passed', 400);
            }

            $filePath = null;
            $upload = $_FILES['assignment_file'] ?? $_FILES['file'] ?? null;
            if ($upload && (int) ($upload['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE) {
                try {
                    $filePath = Upload::store($upload, 'assignments');
                } catch (RuntimeException $e) {
                    Response::error($e->getMessage(), 400);
                }
            }

            $data = [
                'assignment_id' => $assignmentId,
                'student_id' => $student['id'],
                'file_path' => $filePath
            ];

            $id = $this->assignmentModel->submitAssignment($data);
            
            if (!$id) {
                Response::serverError('Failed to submit assignment');
            }

            Response::success(['id' => $id], 'Assignment submitted successfully', 201);
        } catch (Exception $e) {
            error_log("AssignmentController::submit Error: " . $e->getMessage());
            Response::serverError('Failed to submit assignment');
        }
    }

    public function submissions($assignmentId) {
        try {
            // Only the teacher who set the assignment, their HOD, or an admin
            // may read the class's submissions.
            $assignment = $this->assignmentModel->getById($assignmentId);
            if (!$assignment) {
                Response::notFound('Assignment not found');
            }
            $facultyId = Faculty::facultyIdForUser(AuthMiddleware::getUserId());
            $isOwner = $facultyId !== null && (int) $assignment['faculty_id'] === $facultyId;
            if (!$isOwner) {
                $role = AuthMiddleware::getUserRole();
                $isHod = $role === 'hod' && RoleMiddleware::canAccessDepartment(
                    (int) $this->assignmentModel->getDepartmentIdForSubject((int) $assignment['subject_id'])
                );
                if ($role !== 'admin' && !$isHod) {
                    Response::forbidden('You do not have permission to view these submissions');
                }
            }

            $submissions = $this->assignmentModel->getSubmissions($assignmentId);
            Response::success($submissions);
        } catch (Exception $e) {
            error_log("AssignmentController::submissions Error: " . $e->getMessage());
            Response::serverError('Failed to load submissions');
        }
    }

    public function studentSubmissions($studentId) {
        try {
            $studentId = Validation::id($studentId);
            if ($studentId === null) {
                Response::error('Invalid student id', 400);
            }
            // A student may only list their own submissions.
            if (!RoleMiddleware::canAccessStudent($studentId)) {
                Response::forbidden('You do not have permission to view this student\'s submissions');
            }

            $submissions = $this->assignmentModel->getStudentSubmissions($studentId);
            Response::success($submissions);
        } catch (Exception $e) {
            error_log("AssignmentController::studentSubmissions Error: " . $e->getMessage());
            Response::serverError('Failed to load student submissions');
        }
    }

    public function reviewSubmission($submissionId) {
        try {
            $submissionId = Validation::id($submissionId);
            if ($submissionId === null) {
                Response::error('Invalid submission id', 400);
            }

            // The route allows ['faculty','admin'] and previously wrote marks
            // with no ownership check, so any teacher could set marks on any
            // submission id in the college.
            $submission = $this->assignmentModel->getSubmissionById($submissionId);
            if (!$submission) {
                Response::notFound('Submission not found');
            }
            $this->assertCanManage($submission['assignment_id']);
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

            $marks = (float) $data['marks'];
            if ($marks < 0 || $marks > 1000) {
                Response::error('Marks must be between 0 and 1000', 400);
            }

            // submissions.reviewed_by is a FOREIGN KEY to faculty(id). An
            // admin has no faculty row, so for them the existing reviewer is
            // preserved instead of writing NULL, and reviewed_by_user records
            // who actually performed the review.
            $userId = AuthMiddleware::getUserId();
            $facultyId = Faculty::facultyIdForUser($userId);
            $data['reviewed_by_user'] = $userId;
            if ($facultyId !== null) {
                $data['reviewed_by'] = $facultyId;
            }

            $result = $this->assignmentModel->reviewSubmission($submissionId, $data);
            
            if (!$result) {
                Response::serverError('Failed to review submission');
            }

            Response::success(null, 'Submission reviewed successfully');
        } catch (Exception $e) {
            error_log("AssignmentController::reviewSubmission Error: " . $e->getMessage());
            Response::serverError('Failed to review submission');
        }
    }

    private function getFacultyId($userId) {
        $facultyModel = new Faculty();
        $faculty = $facultyModel->findByUserId($userId);
        return $faculty ? $faculty['id'] : null;
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
