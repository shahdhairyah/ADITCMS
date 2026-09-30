<?php
/**
 * ADIT CMS - Faculty Controller
 */

class FacultyController {
    
    private $facultyModel;

    public function __construct() {
        $this->facultyModel = new Faculty();
    }

    public function index() {
        // Validation::pagination() also clamps to MAX_PAGE_SIZE; using
        // Validation::id alone let ?page_size=999999 dump the whole table.
        [$page, $pageSize] = Validation::pagination();
        $filters = [
            'department_id' => Validation::id($_GET['department_id'] ?? null),
            'search'        => is_string($_GET['search'] ?? null) ? trim($_GET['search']) : null,
        ];

        // department_id came straight off the query string, so any teacher or
        // HOD could list another department's staff (including their user_id)
        // with ?department_id=3. Non-admins are pinned to their own scope.
        $scope = RoleMiddleware::scopeDepartmentId();
        if ($scope !== null) {
            $filters['department_id'] = $scope;
        }

        $result = $this->facultyModel->getAll($page, $pageSize, $filters);
        
        Response::paginated($result['data'], $result['total'], $page, $pageSize);
    }

    public function show($id = null) {
        $id = Validation::id($id ?: ($_GET['id'] ?? null));
        if ($id === null) {
            Response::error('Faculty ID required', 400);
        }

        $role = AuthMiddleware::getUserRole();
        if (!in_array($role, ['admin', 'hod', 'faculty', 'student'], true)) {
            Response::forbidden('Not permitted');
        }

        $faculty = $this->facultyModel->findById($id);
        if (!$faculty) {
            Response::notFound('Faculty not found');
        }

        if ($role === 'hod') {
            if (!RoleMiddleware::canAccessDepartment($faculty['department_id'])) {
                Response::forbidden('This faculty member belongs to another department');
            }
            Response::success($faculty);
            return;
        }

        if ($role === 'faculty') {
            $self = $this->facultyModel->findByUserId(AuthMiddleware::getUserId());
            if (!$self || (int) $self['id'] !== $id) {
                Response::forbidden('You can only view your own faculty record');
            }
            Response::success($faculty);
            return;
        }

        // A student may see a teacher's public staff details, but the row is
        // `SELECT f.*` and includes user_id, phone, address and date_of_birth.
        // The docblock said "nobody may read staff records outside their own
        // department" yet students fell through to the full row for ANY id.
        Response::success([
            'id'             => $faculty['id'],
            'employee_id'    => $faculty['employee_id'],
            'first_name'     => $faculty['first_name'],
            'last_name'      => $faculty['last_name'],
            'designation'    => $faculty['designation'],
            'department_id'  => $faculty['department_id'],
            'department_name'=> $faculty['department_name'] ?? null,
            'photo'          => $faculty['photo'] ?? null,
        ]);
    }

    public function store() {
        $data = Validation::getJsonInput();
        $createdUserId = null;

        if (empty($data['user_id'])) {
            if (empty($data['email']) || empty($data['password'])) {
                Response::validationError(['email' => 'Email and password are required when user_id is not provided']);
            }
            $userModel = new User();
            $existing = $userModel->findByEmail($data['email']);
            if ($existing) {
                Response::error('A user with this email already exists', 409);
            }
            $createdUserId = $userModel->create($data['email'], $data['password'], 'faculty');
            if (!$createdUserId) {
                Response::serverError('Failed to create user account');
            }
            $data['user_id'] = $createdUserId;
        }

        $rules = [
            'employee_id' => 'required|max:20',
            'first_name' => 'required|max:100',
            'last_name' => 'required|max:100',
            'department_id' => 'required|numeric',
        ];

        $errors = Validation::validate($data, $rules);
        if ($errors !== true) {
            if ($createdUserId) {
                $db = Database::getInstance()->getConnection();
                $db->prepare("DELETE FROM users WHERE id = ?")->execute([$createdUserId]);
            }
            Response::validationError($errors);
        }

        $id = $this->facultyModel->create($data);
        
        if (!$id) {
            if ($createdUserId) {
                $db = Database::getInstance()->getConnection();
                $db->prepare("DELETE FROM users WHERE id = ?")->execute([$createdUserId]);
            }
            Response::serverError('Failed to create faculty');
        }

        Response::success(['id' => $id], 'Faculty created successfully', 201);
    }

    public function destroy($id) {
        $id = Validation::id($id);
        if ($id === null) {
            Response::error('Invalid faculty id', 400);
        }
        $faculty = $this->facultyModel->findById($id);
        if (!$faculty) {
            Response::notFound('Faculty not found');
        }
        if (AuthMiddleware::getUserRole() === 'hod'
            && !RoleMiddleware::canAccessDepartment($faculty['department_id'])) {
            Response::forbidden('This faculty member belongs to another department');
        }

        $result = $this->facultyModel->delete($id);
        if (!$result) {
            Response::serverError('Failed to delete faculty');
        }
        if (!empty($faculty['user_id'])) {
            // users.status is ENUM('active','inactive','suspended') - there is
            // no 'deleted' member, so revoke access with 'inactive'.
            (new User())->updateStatus((int) $faculty['user_id'], 'inactive');
        }
        Response::success(null, 'Faculty deleted successfully');
    }

    public function subjects() {
        $userId = AuthMiddleware::getUserId();
        $faculty = $this->facultyModel->findByUserId($userId);
        if (!$faculty) {
            Response::success([]);
            return;
        }
        $subjects = $this->facultyModel->getSubjects($faculty['id']);
        Response::success($subjects);
    }

    public function assignedClasses() {
        $userId = AuthMiddleware::getUserId();
        $faculty = $this->facultyModel->findByUserId($userId);
        if (!$faculty) {
            Response::success([]);
            return;
        }
        $classes = $this->facultyModel->getAssignedClasses($faculty['id']);
        Response::success($classes);
    }

    public function update($id) {
        $id = Validation::id($id);
        if ($id === null) {
            Response::error('Invalid faculty id', 400);
        }
        $data = Validation::getJsonInput();

        $role = AuthMiddleware::getUserRole();
        if ($role === 'faculty') {
            $faculty = $this->facultyModel->findByUserId(AuthMiddleware::getUserId());
            if (!$faculty || (int) $faculty['id'] !== $id) {
                Response::forbidden('You can only update your own profile');
            }
            // Never let a teacher rewrite their own linkage or department.
            $data = array_intersect_key($data, array_flip([
                'phone', 'address', 'photo', 'qualification', 'designation', 'specialization',
            ]));
        } elseif ($role === 'hod') {
            $faculty = $this->facultyModel->findById($id);
            if (!$faculty) {
                Response::notFound('Faculty not found');
            }
            if (!RoleMiddleware::canAccessDepartment($faculty['department_id'])) {
                Response::forbidden('This faculty member belongs to another department');
            }
            unset($data['user_id']);
        } elseif ($role !== 'admin') {
            Response::forbidden('You do not have permission to edit faculty records');
        }

        $result = $this->facultyModel->update($id, $data);
        
        if (!$result) {
            Response::serverError('Failed to update faculty');
        }

        Response::success(null, 'Faculty updated successfully');
    }
}
