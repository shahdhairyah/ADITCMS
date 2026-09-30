<?php

class ClassroomController {

    private $model;

    public function __construct() {
        $this->model = new Classroom();
    }

    public function index() {
        try {
            $departmentId = Validation::id($_GET['department_id'] ?? null);

            // A teacher or HOD may only browse their own department's rooms.
            $scope = RoleMiddleware::scopeDepartmentId();
            if ($scope !== null) {
                if ($departmentId !== null && $departmentId !== $scope) {
                    Response::forbidden('That department is out of scope for your account');
                }
                $departmentId = $scope;
            }

            $classrooms = $this->model->getAll($departmentId);
            Response::success($classrooms);
        } catch (Exception $e) {
            error_log("ClassroomController::index Error: " . $e->getMessage());
            Response::serverError('Failed to load classrooms');
        }
    }

    public function store() {
        try {
            $data = Validation::getJsonInput();
            $rules = [
                'name' => 'required|max:100',
                'capacity' => 'nullable|numeric',
            ];
            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            if (isset($data['department_id'])) {
                $deptId = Validation::id($data['department_id']);
                if ($deptId === null) {
                    Response::error('Invalid department id', 400);
                }
                $data['department_id'] = $deptId;
            }

            $id = $this->model->create($data);
            if (!$id) {
                Response::serverError('Failed to create classroom');
            }
            Response::success(['id' => $id], 'Classroom created successfully', 201);
        } catch (Exception $e) {
            error_log("ClassroomController::store Error: " . $e->getMessage());
            Response::serverError('Failed to create classroom');
        }
    }

    public function update($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid classroom id', 400);
            }
            if (!$this->model->findById($id)) {
                Response::notFound('Classroom not found');
            }

            $data = Validation::getJsonInput();
            $errors = Validation::validate($data, ['name' => 'required|max:100']);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            // Classroom::update's allowlist includes department_id, so a
            // classroom could otherwise be moved between departments. The
            // route is admin-only, but the field is pinned anyway so a move is
            // always a deliberate act.
            unset($data['department_id']);

            if (!$this->model->update($id, $data)) {
                Response::serverError('Failed to update classroom');
            }
            Response::success(null, 'Classroom updated successfully');
        } catch (Exception $e) {
            error_log("ClassroomController::update Error: " . $e->getMessage());
            Response::serverError('Failed to update classroom');
        }
    }

    public function destroy($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid classroom id', 400);
            }
            // Previously DELETE /classrooms/9999 returned
            // {"success":true,"message":"Classroom deleted successfully"} for a
            // row that never existed.
            if (!$this->model->findById($id)) {
                Response::notFound('Classroom not found');
            }
            if (!$this->model->delete($id)) {
                Response::serverError('Failed to delete classroom');
            }
            Response::success(null, 'Classroom deleted successfully');
        } catch (Exception $e) {
            error_log("ClassroomController::destroy Error: " . $e->getMessage());
            Response::serverError('Failed to delete classroom');
        }
    }
}