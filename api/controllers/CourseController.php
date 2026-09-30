<?php

class CourseController {

    private $model;

    public function __construct() {
        $this->model = new Course();
    }

    public function index() {
        try {
            $departmentId = Validation::id($_GET['department_id'] ?? null);

            // A teacher or HOD only sees the courses of their own department.
            $scope = RoleMiddleware::scopeDepartmentId();
            if ($scope !== null) {
                if ($departmentId !== null && $departmentId !== $scope) {
                    Response::forbidden('That department is out of scope for your account');
                }
                $departmentId = $scope;
            }

            $courses = $this->model->getAll($departmentId);
            Response::success($courses);
        } catch (Exception $e) {
            error_log("CourseController::index Error: " . $e->getMessage());
            Response::serverError('Failed to load courses');
        }
    }

    /**
     * Subjects, for pickers that need the full list (timetable, syllabus).
     *
     * There was no role-usable subjects endpoint: /hod/subjects is HOD-only and
     * /faculty/subjects returns an empty array for an admin, who has no faculty
     * profile. AdminTimetable therefore loaded zero subjects and offered an
     * empty dropdown.
     */
    public function subjects() {
        try {
            $filters = [];
            $semester = Validation::id($_GET['semester_id'] ?? $_GET['semester'] ?? null);
            if ($semester !== null) {
                $filters['semester'] = $semester;
            }

            $departmentId = Validation::id($_GET['department_id'] ?? $_GET['branch_id'] ?? null);

            // A teacher or HOD is pinned to their own department.
            $scope = RoleMiddleware::scopeDepartmentId();
            if ($scope !== null) {
                if ($departmentId !== null && $departmentId !== $scope) {
                    Response::forbidden('That department is out of scope for your account');
                }
                $departmentId = $scope;
            }
            if ($departmentId !== null) {
                $filters['department_id'] = $departmentId;
            }

            $subjects = (new Subject())->getAll($filters);
            Response::success($subjects);
        } catch (Exception $e) {
            error_log("CourseController::subjects Error: " . $e->getMessage());
            Response::serverError('Failed to load subjects');
        }
    }
}