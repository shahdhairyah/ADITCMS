<?php
/**
 * ADIT CMS - Timetable Controller
 */

class TimetableController {
    
    private $timetableModel;

    public function __construct() {
        $this->timetableModel = new Timetable();
    }

    public function index() {
        try {
            $role = AuthMiddleware::getUserRole();
            $userId = AuthMiddleware::getUserId();

            if ($role === 'faculty') {
                $faculty = (new Faculty())->findByUserId($userId);
                if (!$faculty) {
                    Response::forbidden('No faculty profile is linked to this account');
                }
                $timetable = $this->timetableModel->getByFaculty($faculty['id']);
                Response::success($timetable);
            } elseif ($role === 'student') {
                $student = (new Student())->findByUserId($userId);
                if (!$student) {
                    Response::forbidden('No student profile is linked to this account');
                }
                $branchId = $student['department_id'] ?? null;
                $semester = $student['semester'] ?? null;
                $dayFilter = self::dayOrNull($_GET['day'] ?? $_GET['day_of_week'] ?? null);

                $timetable = $this->timetableModel->getTimetable($branchId, $semester, $dayFilter);
                Response::success($timetable);
            } elseif ($role === 'admin') {
                $timetable = $this->timetableModel->getTimetable(
                    Validation::id($_GET['branch_id'] ?? null),
                    Validation::id($_GET['semester'] ?? null),
                    self::dayOrNull($_GET['day'] ?? $_GET['day_of_week'] ?? null)
                );
                Response::success($timetable);
            } elseif ($role === 'hod') {
                // branch_id came straight off the query string, so an HOD (and
                // because the route has no role list, a librarian too) could
                // read any department's timetable. Pin it to their own.
                $deptId = RoleMiddleware::scopeDepartmentId();
                if ($deptId === null || $deptId < 1) {
                    Response::forbidden('No department scope for this account');
                }
                $requested = Validation::id($_GET['branch_id'] ?? null);
                if ($requested !== null && $requested !== $deptId) {
                    Response::forbidden('That branch belongs to another department');
                }
                $timetable = $this->timetableModel->getTimetable(
                    $deptId,
                    Validation::id($_GET['semester'] ?? null),
                    self::dayOrNull($_GET['day'] ?? $_GET['day_of_week'] ?? null)
                );
                Response::success($timetable);
            } else {
                Response::forbidden('You do not have permission to view timetables');
            }
        } catch (Exception $e) {
            error_log("TimetableController::index Error: " . $e->getMessage());
            Response::serverError('Failed to load timetable');
        }
    }

    public function store() {
        try {
            $data = Validation::getJsonInput();

            $rules = [
                'branch_id' => 'required|numeric',
                'semester' => 'required|numeric',
                'day_of_week' => 'required|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
                'period_number' => 'required|numeric',
                'subject_id' => 'required|numeric',
                'faculty_id' => 'required|numeric',
                'classroom' => 'required|max:100',
                'start_time' => 'required',
                'end_time' => 'required'
            ];

            $errors = Validation::validate($data, $rules);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            // HODController::addTimetableEntry already performs these three
            // checks; this controller did not, so an HOD could create entries
            // in another department, for a subject they do not own, and assign
            // a teacher from elsewhere.
            $this->assertWritable($data);

            $conflict = $this->timetableModel->checkConflict($data);
            if ($conflict['conflict']) {
                Response::error($conflict['message'], 409);
            }

            $id = $this->timetableModel->create($data);
            
            if (!$id) {
                Response::serverError('Failed to create timetable entry');
            }

            Response::success(['id' => $id], 'Timetable entry created successfully', 201);
        } catch (Exception $e) {
            error_log("TimetableController::store Error: " . $e->getMessage());
            Response::serverError('Failed to create timetable entry');
        }
    }

    public function update($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid timetable entry id', 400);
            }

            $existing = $this->timetableModel->findById($id);
            if (!$existing) {
                Response::notFound('Timetable entry not found');
            }
            $this->assertCanTouchDepartment($existing);

            $data = Validation::getJsonInput();
            $errors = Validation::validate($data, [
                'day_of_week'   => 'required|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
                'period_number' => 'required|numeric',
                'classroom'     => 'required|max:100',
                'start_time'    => 'required',
                'end_time'      => 'required',
            ]);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            // The conflict check needs the full row, so merge the stored values
            // under whatever the client sent. Previously the raw body was
            // passed, so a partial update made checkConflict compare NULLs.
            $merged = $existing;
            foreach (['branch_id', 'semester', 'day_of_week', 'period_number',
                      'subject_id', 'faculty_id', 'classroom', 'start_time', 'end_time'] as $k) {
                if (array_key_exists($k, $data)) {
                    $merged[$k] = $data[$k];
                }
            }
            $this->assertWritable($merged);

            // branch_id/subject_id/faculty_id are in Timetable::update's
            // allowlist, so they could be used to move the entry into another
            // department; they are pinned to the stored values instead.
            unset($data['branch_id'], $data['subject_id'], $data['faculty_id']);

            $conflict = $this->timetableModel->checkConflict($merged, $id);
            if ($conflict['conflict']) {
                Response::error($conflict['message'], 409);
            }

            $result = $this->timetableModel->update($id, $data);
            
            if (!$result) {
                Response::serverError('Failed to update timetable');
            }

            Response::success(null, 'Timetable updated successfully');
        } catch (Exception $e) {
            error_log("TimetableController::update Error: " . $e->getMessage());
            Response::serverError('Failed to update timetable');
        }
    }

    public function destroy($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid timetable entry id', 400);
            }

            $existing = $this->timetableModel->findById($id);
            if (!$existing) {
                Response::notFound('Timetable entry not found');
            }
            $this->assertCanTouchDepartment($existing);

            $result = $this->timetableModel->delete($id);
            
            if (!$result) {
                Response::serverError('Failed to delete timetable entry');
            }

            Response::success(null, 'Timetable entry deleted successfully');
        } catch (Exception $e) {
            error_log("TimetableController::destroy Error: " . $e->getMessage());
            Response::serverError('Failed to delete timetable entry');
        }
    }

    /** admin may write anything; an HOD only inside their own department. */
    private function assertCanTouchDepartment(array $row): void {
        if (AuthMiddleware::getUserRole() === 'admin') {
            return;
        }
        if (AuthMiddleware::getUserRole() !== 'hod') {
            Response::forbidden('You do not have permission to modify timetables');
        }
        if (!RoleMiddleware::canAccessDepartment($row['branch_id'])) {
            Response::forbidden('That timetable entry belongs to another department');
        }
    }

    /**
     * The subject and the teacher named in a timetable entry must belong to
     * the same department as the entry itself.
     */
    private function assertWritable(array $data): void {
        if (AuthMiddleware::getUserRole() === 'admin') {
            return;
        }
        $deptId = RoleMiddleware::scopeDepartmentId();
        if ($deptId === null || $deptId < 1) {
            Response::forbidden('No department scope for this account');
        }
        if ((int) $data['branch_id'] !== $deptId) {
            Response::forbidden('You can only edit your own department timetable');
        }

        $subject = (new Subject())->findById(Validation::id($data['subject_id']));
        if (!$subject) {
            Response::notFound('Subject not found');
        }
        if ((int) $subject['department_id'] !== $deptId) {
            Response::forbidden('That subject belongs to another department');
        }

        $faculty = (new Faculty())->findById(Validation::id($data['faculty_id']));
        if (!$faculty) {
            Response::notFound('Faculty not found');
        }
        if ((int) $faculty['department_id'] !== $deptId) {
            Response::forbidden('That teacher belongs to another department');
        }
    }

    private static function dayOrNull($value) {
        if (!is_string($value) || $value === '') {
            return null;
        }
        $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        $match = array_values(array_filter($days, static fn($d) => strcasecmp($d, $value) === 0));
        return $match[0] ?? null;
    }
}
