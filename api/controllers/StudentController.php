<?php
/**
 * ADIT CMS - Student Controller
 */

class StudentController {
    
    private $studentModel;

    public function __construct() {
        $this->studentModel = new Student();
    }

    public function index() {
        // Validation::pagination() also applies MAX_PAGE_SIZE; using
        // Validation::id directly allowed ?page_size=999999 to dump the table.
        [$page, $pageSize] = Validation::pagination();

        $filters = [
            'department_id' => Validation::id($_GET['department_id'] ?? null),
            'semester'      => Validation::id($_GET['semester'] ?? null),
            'batch'         => Validation::id($_GET['batch'] ?? null),
            'search'        => is_string($_GET['search'] ?? null) ? trim($_GET['search']) : null,
        ];

        // A student may only list themselves.
        if (AuthMiddleware::getUserRole() === 'student') {
            $me = $this->studentModel->findByUserId(AuthMiddleware::getUserId());
            if (!$me) {
                Response::forbidden('No student profile is linked to this account');
            }
            $result = $this->studentModel->getAll(1, 1, ['id' => $me['id']]);
            Response::paginated($result['data'], $result['total'], 1, 1);
        }

        // department_id came straight off the query string, so a CE teacher
        // could enumerate the whole Mechanical roster (?department_id=3).
        $scope = RoleMiddleware::scopeDepartmentId();
        if ($scope !== null) {
            $filters['department_id'] = $scope;
        }

        $result = $this->studentModel->getAll($page, $pageSize, $filters);
        
        Response::paginated($result['data'], $result['total'], $page, $pageSize);
    }

    public function show($id = null) {
        $id = Validation::id($id ?: ($_GET['id'] ?? null));
        if ($id === null) {
            Response::error('Student ID required', 400);
        }

        // Applies to every role: a student sees only themselves, a teacher or
        // HOD only students they are entitled to, and a librarian none.
        if (!RoleMiddleware::canAccessStudent($id)) {
            Response::forbidden('You do not have permission to view this student');
        }

        $student = $this->studentModel->findById($id);
        
        if (!$student) {
            Response::notFound('Student not found');
        }

        Response::success($student);
    }

    public function store() {
        $data = Validation::getJsonInput();

        $rules = [
            'user_id' => 'required|numeric',
            'roll_number' => 'required|max:20',
            'first_name' => 'required|max:100',
            'last_name' => 'required|max:100',
            'department_id' => 'required|numeric',
        ];

        $errors = Validation::validate($data, $rules);
        if ($errors !== true) {
            Response::validationError($errors);
        }

        $existing = $this->studentModel->findByRollNumber($data['roll_number']);
        if ($existing) {
            Response::error('Roll number already exists', 409);
        }

        $id = $this->studentModel->create($data);
        
        if (!$id) {
            Response::serverError('Failed to create student');
        }

        Response::success(['id' => $id], 'Student created successfully', 201);
    }

    public function update($id) {
        $id = Validation::id($id);
        if ($id === null) {
            Response::error('Invalid student id', 400);
        }
        $data = Validation::getJsonInput();

        $role = AuthMiddleware::getUserRole();
        if ($role === 'student') {
            $student = $this->studentModel->findByUserId(AuthMiddleware::getUserId());
            if (!$student || (int) $student['id'] !== $id) {
                Response::forbidden('You can only update your own profile');
            }
            // A student may only touch their own contact details - never
            // roll_number, semester, department or the linked user_id.
            $data = array_intersect_key($data, array_flip(['phone', 'address']));
        } elseif (!in_array($role, ['admin', 'hod'], true)) {
            Response::forbidden('You do not have permission to edit student records');
        } elseif ($role === 'hod') {
            $student = $this->studentModel->findById($id);
            if (!$student) {
                Response::notFound('Student not found');
            }
            if (!RoleMiddleware::canAccessDepartment($student['department_id'])) {
                Response::forbidden('This student belongs to another department');
            }
        }

        $result = $this->studentModel->update($id, $data);
        
        if (!$result) {
            Response::serverError('Failed to update student');
        }

        Response::success(null, 'Student updated successfully');
    }

    public function uploadPhoto($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid student id', 400);
            }
            if (!RoleMiddleware::canAccessStudent($id)) {
                Response::forbidden('You do not have permission to change this student\'s photo');
            }

            $student = $this->studentModel->findById($id);
            if (!$student) {
                Response::notFound('Student not found');
            }

            $relativePath = null;

            // Preferred path: multipart upload, verified by finfo.
            if (!empty($_FILES['photo']) && (int) $_FILES['photo']['error'] !== UPLOAD_ERR_NO_FILE) {
                try {
                    $relativePath = Upload::store($_FILES['photo'], 'photos', true);
                } catch (RuntimeException $e) {
                    Response::error($e->getMessage(), 400);
                }
            } else {
                // Fallback: base64 JSON, which must be verified the same way.
                $jsonInput = Validation::getJsonInput();
                if (empty($jsonInput['photo_base64'])) {
                    Response::error('No photo uploaded. Send as file (FormData) or base64 (JSON with photo_base64 field).', 400);
                }
                try {
                    $relativePath = Upload::storeBase64Image((string) $jsonInput['photo_base64'], 'photos');
                } catch (RuntimeException $e) {
                    Response::error($e->getMessage(), 400);
                }
            }

            if ($relativePath === null) {
                Response::error('Failed to process photo', 400);
            }

            $this->studentModel->update($id, ['photo' => $relativePath]);

            // Remove the photo that was replaced.
            if (!empty($student['photo']) && $student['photo'] !== $relativePath) {
                Upload::delete($student['photo']);
            }

            Response::success(['photo_url' => $relativePath], 'Photo uploaded successfully');
        } catch (Exception $e) {
            error_log("StudentController::uploadPhoto Error: " . $e->getMessage());
            Response::serverError('Failed to upload photo');
        }
    }

    public function destroy($id) {
        $id = Validation::id($id);
        if ($id === null) {
            Response::error('Invalid student id', 400);
        }
        $student = $this->studentModel->findById($id);
        if (!$student) {
            Response::notFound('Student not found');
        }

        // Deactivate the login and remove the profile rather than deleting the
        // user row, which foreign keys cascade away with it.
        $this->studentModel->delete($id);
        (new User())->updateStatus((int) $student['user_id'], 'inactive');

        Response::success(null, 'Student deleted successfully');
    }
}
