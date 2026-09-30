<?php

class SyllabusController {
    
    private $syllabusModel;

    public function __construct() {
        $this->syllabusModel = new Syllabus();
    }

    public function index() {
        try {
            $filters = [
                'subject_id' => Validation::id($_GET['subject_id'] ?? null)
            ];

            $syllabus = $this->syllabusModel->getAll($filters);
            Response::success($syllabus);
        } catch (Exception $e) {
            error_log("SyllabusController::index Error: " . $e->getMessage());
            Response::serverError('Failed to load the requested list');
        }
    }

    public function store() {
        try {
            // Multipart: unit fields and the file share one request body.
            $data = Validation::getInput();
            $userId = AuthMiddleware::getUserId();

            $rules = [
                'subject_id' => 'required|numeric',
                'unit_number' => 'required|numeric',
                'unit_title' => 'required|max:100'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            // syllabus.uploaded_by is a FOREIGN KEY to faculty(id).
            $facultyId = Faculty::facultyIdForUser($userId);
            if (!$facultyId) {
                Response::forbidden('Only faculty can upload syllabus');
            }

            // subject_id is attacker-controlled, so confirm ownership.
            if (!RoleMiddleware::teachesSubject($facultyId, (int) $data['subject_id'])) {
                Response::forbidden('You are not assigned to that subject');
            }

            $data['uploaded_by'] = $facultyId;

            $filePath = null;
            if (!empty($_FILES['file'])) {
                try {
                    $filePath = Upload::store($_FILES['file'], 'syllabus');
                } catch (RuntimeException $e) {
                    Response::error($e->getMessage(), 400);
                }
            }

            $data['file_path'] = $filePath;
            $id = $this->syllabusModel->create($data);
            
            if (!$id) {
                Response::serverError('Failed to create syllabus entry');
            }

            Response::success(['id' => $id], 'Syllabus entry created successfully', 201);
        } catch (Exception $e) {
            error_log("SyllabusController::store Error: " . $e->getMessage());
            Response::serverError('Failed to create syllabus entry');
        }
    }

    public function update($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid syllabus id', 400);
            }

            $data = Validation::getInput();
            $this->assertCanManage($id);

            $filePath = null;
            if (!empty($_FILES['file'])) {
                try {
                    $filePath = Upload::store($_FILES['file'], 'syllabus');
                } catch (RuntimeException $e) {
                    Response::error($e->getMessage(), 400);
                }
                $data['file_path'] = $filePath;
            }
            // uploaded_by must not be reassigned by the payload, and
            // Syllabus::update's allowlist includes subject_id - without this a
            // teacher could re-file their own syllabus under another
            // department's subject.
            unset($data['uploaded_by'], $data['subject_id'], $data['file_type'],
                  $data['file_size'], $data['department_id']);

            $result = $this->syllabusModel->update($id, $data);
            
            if (!$result) {
                Response::serverError('Failed to update syllabus entry');
            }

            Response::success(null, 'Syllabus entry updated successfully');
        } catch (Exception $e) {
            error_log("SyllabusController::update Error: " . $e->getMessage());
            Response::serverError('Failed to update syllabus entry');
        }
    }

    public function destroy($id) {
        try {
            $entry = $this->assertCanManage($id);

            $result = $this->syllabusModel->delete($id);
            
            if (!$result) {
                Response::serverError('Failed to delete syllabus entry');
            }

            Upload::delete($entry['file_path'] ?? null);

            Response::success(null, 'Syllabus entry deleted successfully');
        } catch (Exception $e) {
            error_log("SyllabusController::destroy Error: " . $e->getMessage());
            Response::serverError('Failed to delete syllabus entry');
        }
    }

    /** @return array The syllabus row, once the caller is allowed to change it. */
    private function assertCanManage($id) {
        $entry = $this->syllabusModel->getById($id);
        if (!$entry) {
            Response::notFound('Syllabus entry not found');
        }
        $facultyId = Faculty::facultyIdForUser(AuthMiddleware::getUserId());
        if ($facultyId !== null && (int) $entry['uploaded_by'] === $facultyId) {
            return $entry;
        }
        $role = AuthMiddleware::getUserRole();
        if ($role === 'admin') {
            return $entry;
        }
        if ($role === 'hod' && RoleMiddleware::canAccessDepartment(
            (new Subject())->getDepartmentId((int) $entry['subject_id'])
        )) {
            return $entry;
        }
        Response::forbidden('You do not have permission to manage this syllabus entry');
    }

    public function show($id) {
        try {
            $syllabus = $this->syllabusModel->getById($id);

            if (!$syllabus) {
                Response::notFound('Syllabus entry not found');
            }

            Response::success($syllabus);
        } catch (Exception $e) {
            error_log("SyllabusController::show Error: " . $e->getMessage());
            Response::serverError('Failed to load syllabus');
        }
    }

    public function getBySubject($subjectId) {
        try {
            $subjectId = Validation::id($subjectId);
            if ($subjectId === null) {
                Response::error('Invalid subject id', 400);
            }
            $syllabus = $this->syllabusModel->getBySubject($subjectId);
            Response::success($syllabus);
        } catch (Exception $e) {
            error_log("SyllabusController::getBySubject Error: " . $e->getMessage());
            Response::serverError('Failed to load syllabus for this subject');
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
