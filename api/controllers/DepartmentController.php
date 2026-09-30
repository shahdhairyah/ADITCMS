<?php
/**
 * ADIT CMS - Department Controller
 */

class DepartmentController {

    private $model;

    public function __construct() {
        $this->model = new Department();
    }

    public function publicIndex() {
        $departments = $this->model->getAll();
        Response::success($departments);
    }

    public function index() {
        $departments = $this->model->getAll();
        Response::success($departments);
    }

    public function show($id) {
        $id = Validation::id($id);
        if ($id === null) {
            Response::error('Invalid department id', 400);
        }
        $dept = $this->model->findById($id);
        if (!$dept) {
            Response::notFound('Department not found');
        }
        Response::success($dept);
    }

    public function store() {
        try {
            $data = Validation::getJsonInput();

            $errors = Validation::validate($data, [
                'name' => 'required|max:100',
                'code' => 'required|max:20',
            ]);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $this->assertHodMatchesDepartment($data);

            $id = $this->model->create($data);
            if (!$id) {
                Response::serverError('Failed to create department');
            }
            Response::success(['id' => $id], 'Department created', 201);
        } catch (Exception $e) {
            error_log("DepartmentController::store Error: " . $e->getMessage());
            Response::serverError('Failed to create department');
        }
    }

    public function update($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid department id', 400);
            }
            $existing = $this->model->findById($id);
            if (!$existing) {
                Response::notFound('Department not found');
            }

            $data = Validation::getJsonInput();
            $errors = Validation::validate($data, [
                'name' => 'max:100',
                'code' => 'max:20',
            ]);
            if ($errors !== true) {
                Response::validationError($errors);
            }
            if (!$data) {
                Response::error('No fields to update', 400);
            }

            // Department::update's allowlist includes hod_id, so without this an
            // unvalidated payload could rebind a department to a teacher from a
            // different department, silently breaking that department's /hod/*
            // scoping.
            $this->assertHodMatchesDepartment($data, (int) $existing['id']);

            if (!$this->model->update($id, $data)) {
                Response::serverError('Failed to update department');
            }
            Response::success(null, 'Department updated');
        } catch (Exception $e) {
            error_log("DepartmentController::update Error: " . $e->getMessage());
            Response::serverError('Failed to update department');
        }
    }

    public function destroy($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid department id', 400);
            }
            if (!$this->model->findById($id)) {
                Response::notFound('Department not found');
            }
            if (!$this->model->delete($id)) {
                Response::serverError('Failed to delete department');
            }
            Response::success(null, 'Department deleted');
        } catch (Exception $e) {
            error_log("DepartmentController::destroy Error: " . $e->getMessage());
            Response::serverError('Failed to delete department');
        }
    }

    /**
     * A department's HOD must be a faculty member of that same department.
     * Without this a department could be pointed at a teacher elsewhere, and
     * every RoleMiddleware department check for that department would then
     * resolve to the wrong head.
     */
    private function assertHodMatchesDepartment(array &$data, ?int $existingDepartmentId = null): void {
        if (!array_key_exists('hod_id', $data) || $data['hod_id'] === null || $data['hod_id'] === '') {
            return;
        }
        $hodId = Validation::id($data['hod_id']);
        if ($hodId === null) {
            Response::error('Invalid HOD id', 400);
        }
        $faculty = (new Faculty())->findById($hodId);
        if (!$faculty) {
            Response::error('Unknown HOD', 400);
        }
        // On a partial update the payload may omit department_id, so fall back to
        // the department being updated rather than skipping the check. Skipping it
        // would let a teacher from any department be bound as HOD.
        $deptId = Validation::id($data['department_id'] ?? null);
        if ($deptId === null) {
            $deptId = $existingDepartmentId;
        }
        if ($deptId === null) {
            Response::error('A department is required to assign an HOD', 400);
        }
        if ((int) $faculty['department_id'] !== $deptId) {
            Response::error('That HOD belongs to another department', 400);
        }
        $data['hod_id'] = $hodId;
    }
}
