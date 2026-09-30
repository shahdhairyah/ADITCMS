<?php
/**
 * ADIT CMS - Attendance Controller
 */

class AttendanceController {
    
    private $attendanceModel;

    public function __construct() {
        $this->attendanceModel = new Attendance();
    }

    public function mark() {
        try {
            $data = Validation::getJsonInput();

            // attendance.marked_by is a FOREIGN KEY to faculty(id) and the token
            // carries a users.id. Admins have no faculty row, so requiring one
            // unconditionally locked them out of a route they are allowed to
            // call; marked_by is simply left NULL for them.
            $userId = AuthMiddleware::getUserId();
            if (!$userId) {
                Response::unauthorized('Authentication required');
            }
            $role = AuthMiddleware::getUserRole();
            $facultyId = $role === 'faculty'
                ? Faculty::requireFacultyIdForUser($userId)
                : Faculty::facultyIdForUser($userId);

            if (isset($data['student_id'])) {
                $rules = [
                    'student_id' => 'required|numeric',
                    'subject_id' => 'required|numeric',
                    'date' => 'required|date',
                    'status' => 'required|in:present,absent,late'
                ];

                $errors = Validation::validate($data, $rules);
                if ($errors !== true) {
                    Response::validationError($errors);
                }

                $this->assertCanMark($data, $facultyId);
                if ($facultyId !== null) {
                    $data['marked_by'] = $facultyId;
                }
                $result = $this->attendanceModel->mark($data);
            } elseif (isset($data['records']) && is_array($data['records'])) {
                // The client posts { subject_id, date, records: [{ student_id,
                // status }] } - subject and date are shared by the whole
                // batch. Requiring them per record rejected every real bulk
                // post with "subject_id is required".
                $errors = Validation::validate($data, [
                    'subject_id' => 'required|numeric',
                    'date' => 'required|date',
                ]);
                if ($errors !== true) {
                    Response::validationError($errors);
                }
                $subjectId = (int) $data['subject_id'];
                $date = $data['date'];

                $records = [];
                foreach ($data['records'] as $r) {
                    if (!is_array($r)) {
                        continue;
                    }
                    $r['subject_id'] = $r['subject_id'] ?? $subjectId;
                    $r['date'] = $r['date'] ?? $date;

                    $errors = Validation::validate($r, [
                        'student_id' => 'required|numeric',
                        'subject_id' => 'required|numeric',
                        'date' => 'required|date',
                        'status' => 'required|in:present,absent,late',
                    ]);
                    if ($errors !== true) {
                        Response::validationError($errors);
                    }
                    // Each record still names its own student, so it has to be
                    // authorised individually - a bulk post could not be
                    // checked as one student. The subject/date are shared, so
                    // the teacher must own that subject before any student is
                    // looked at.
                    $this->assertCanMark($r, $facultyId);
                    if ($facultyId !== null) {
                        $r['marked_by'] = $facultyId;
                    }
                    $records[] = $r;
                }

                $result = $this->attendanceModel->bulkMark($records);
            } else {
                Response::error('Invalid request format', 400);
            }

            if (!$result) {
                Response::serverError('Failed to mark attendance');
            }

            Response::success(null, 'Attendance marked successfully');
        } catch (Exception $e) {
            error_log("AttendanceController::mark Error: " . $e->getMessage());
            Response::serverError('Failed to mark attendance');
        }
    }

    /**
     * A teacher may only mark attendance for a subject they are assigned to
     * and a student they are entitled to reach; an HOD only within their own
     * department; an admin anywhere.
     */
    private function assertCanMark(array $record, $facultyId): void {
        $role      = AuthMiddleware::getUserRole();
        $subjectId = (int) $record['subject_id'];
        $studentId = (int) $record['student_id'];

        $subject = (new Subject())->findById($subjectId);
        if (!$subject) {
            Response::notFound('Subject not found');
        }
        if (!(new Student())->findById($studentId)) {
            Response::notFound('Student not found');
        }

        if ($role === 'admin') {
            return;
        }
        if ($role === 'hod') {
            if (!RoleMiddleware::canAccessDepartment($subject['department_id'])) {
                Response::forbidden('That subject belongs to another department');
            }
            return;
        }
        if ($role === 'faculty') {
            if (!RoleMiddleware::teachesSubject($facultyId, $subjectId)) {
                Response::forbidden('You are not assigned to that subject');
            }
        } else {
            Response::forbidden('You do not have permission to mark attendance');
        }

        if (!RoleMiddleware::canAccessStudent($studentId)) {
            Response::forbidden('You do not have permission to mark this student');
        }
    }

    public function update($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid attendance id', 400);
            }
            $row = $this->attendanceModel->findById($id);
            if (!$row) {
                Response::notFound('Attendance record not found');
            }

            $data = Validation::getJsonInput();
            $errors = Validation::validate($data, ['status' => 'required|in:present,absent,late']);
            if ($errors !== true) {
                Response::validationError($errors);
            }

            $role = AuthMiddleware::getUserRole();
            if ($role === 'faculty') {
                $facultyId = Faculty::requireFacultyIdForUser(AuthMiddleware::getUserId());
                $this->assertCanMark([
                    'subject_id' => $row['subject_id'],
                    'student_id' => $row['student_id'],
                ], $facultyId);
                $data['marked_by'] = $facultyId;
            } elseif ($role === 'hod') {
                $subject = (new Subject())->findById((int) $row['subject_id']);
                if (!$subject || !RoleMiddleware::canAccessDepartment($subject['department_id'])) {
                    Response::forbidden('That record belongs to another department');
                }
                $data['marked_by'] = $row['marked_by'];
            } elseif ($role === 'admin') {
                $data['marked_by'] = $row['marked_by'];
            } else {
                Response::forbidden('You do not have permission to edit attendance');
            }

            $result = $this->attendanceModel->update($id, $data);
            
            if (!$result) {
                Response::serverError('Failed to update attendance');
            }

            Response::success(null, 'Attendance updated successfully');
        } catch (Exception $e) {
            error_log("AttendanceController::update Error: " . $e->getMessage());
            Response::serverError('Failed to update attendance');
        }
    }

    public function index() {
        try {
            $role = AuthMiddleware::getUserRole();
            $userId = AuthMiddleware::getUserId();

            if ($role === 'student') {
                $student = (new Student())->findByUserId($userId);
                if (!$student) {
                    Response::success(['attendance' => [], 'summary' => []]);
                    return;
                }
                
                $attendance = $this->attendanceModel->getByStudent(
                    $student['id'],
                    $_GET['subject_id'] ?? null,
                    $_GET['start_date'] ?? null,
                    $_GET['end_date'] ?? null
                );
                
                $summary = $this->attendanceModel->getSummary($student['id']);
                
                Response::success(['attendance' => $attendance, 'summary' => $summary]);
                return;
            }

            $facultyId = ($role === 'faculty') ? Faculty::facultyIdForUser($userId) : null;
            $subjects = $this->teachableSubjects($role, $userId, $facultyId);

            $subjectId = Validation::id($_GET['subject_id'] ?? null);
            if ($subjectId === null) {
                // No subject chosen yet: hand back the list the teacher may
                // pick from. Previously this only worked for faculty, so an
                // HOD or admin calling the endpoint got nothing.
                Response::success(['subjects' => $subjects]);
                return;
            }

            if (!in_array($subjectId, array_map('intval', array_column($subjects, 'id')), true)) {
                Response::forbidden('You do not have access to that subject');
            }

            $date = $_GET['date'] ?? date('Y-m-d');
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $date)) {
                $date = date('Y-m-d');
            }

            // getBySubject() only returns students who already have a row for
            // that date, so a new day came back as an empty class. The roster
            // helper left-joins attendance onto the full class list.
            $roster = $this->attendanceModel->getRosterForSubject($subjectId, $date);

            $marked = array_filter($roster, static fn($r) => $r['status'] !== null);
            $ids = array_values(array_filter(array_map(
                static fn($r) => $r['attendance_id'] !== null ? (int) $r['attendance_id'] : null,
                $roster
            )));

            Response::success([
                'subject_id'      => $subjectId,
                'date'            => $date,
                'students'        => $roster,
                'already_marked'  => count($marked) > 0 && count($marked) === count($roster),
                'marked_count'    => count($marked),
                'total_count'     => count($roster),
                // The first existing record, so the UI can switch into
                // "update" mode instead of trying to insert a duplicate.
                'id'              => $ids[0] ?? null,
            ]);
        } catch (Exception $e) {
            error_log("AttendanceController::index Error: " . $e->getMessage());
            Response::serverError('Failed to load the requested list');
        }
    }

    /**
     * Subjects the caller may take attendance for.
     *
     * @return array
     */
    private function teachableSubjects($role, $userId, $facultyId): array {
        if ($role === 'faculty' && $facultyId) {
            return (new Faculty())->getSubjects($facultyId);
        }
        $deptId = RoleMiddleware::scopeDepartmentId();
        if ($role === 'admin') {
            return (new Subject())->getAll();
        }
        if ($deptId === null || $deptId < 1) {
            return [];
        }
        return (new Subject())->getAll(['department_id' => $deptId]);
    }

    public function getStudentSummary($studentId) {
        try {
            $studentId = Validation::id($studentId);
            if ($studentId === null) {
                Response::error('Invalid student id', 400);
            }
            // No role restriction is applied on the route, so without this
            // any logged-in account (including a student) could read any
            // other student's attendance summary.
            if (!RoleMiddleware::canAccessStudent($studentId)) {
                Response::forbidden('You do not have permission to view this student\'s attendance');
            }

            $summary = $this->attendanceModel->getStudentSummary($studentId);
            Response::success($summary);
        } catch (Exception $e) {
            error_log("AttendanceController::getStudentSummary Error: " . $e->getMessage());
            Response::serverError('Failed to load student summary');
        }
    }

    public function getStudentCalendar($studentId) {
        try {
            $studentId = Validation::id($studentId);
            if ($studentId === null) {
                Response::error('Invalid student id', 400);
            }
            if (!RoleMiddleware::canAccessStudent($studentId)) {
                Response::forbidden('You do not have permission to view this student\'s attendance');
            }

            $month = $_GET['month'] ?? date('m');
            $year  = $_GET['year'] ?? date('Y');
            $calendar = $this->attendanceModel->getStudentCalendar($studentId, $month, $year);
            Response::success($calendar);
        } catch (Exception $e) {
            error_log("AttendanceController::getStudentCalendar Error: " . $e->getMessage());
            Response::serverError('Failed to load student calendar');
        }
    }

    public function calendar() {
        try {
            $userId = AuthMiddleware::getUserId();
            $student = (new Student())->findByUserId($userId);
            if (!$student) {
                Response::success([]);
                return;
            }
            $month = $_GET['month'] ?? date('m');
            $year  = $_GET['year'] ?? date('Y');
            $calendar = $this->attendanceModel->getStudentCalendar($student['id'], $month, $year);
            Response::success($calendar);
        } catch (Exception $e) {
            error_log("AttendanceController::calendar Error: " . $e->getMessage());
            Response::serverError('Failed to load calendar');
        }
    }

    public function report() {
        try {
            $subjectId = Validation::id($_GET['subject_id'] ?? null);
            if ($subjectId === null) {
                Response::error('Subject ID required', 400);
            }

            // The route allows faculty/hod/admin, so the subject in the query
            // string has to be checked against the caller's scope.
            $role = AuthMiddleware::getUserRole();
            $subject = (new Subject())->findById($subjectId);
            if (!$subject) {
                Response::notFound('Subject not found');
            }
            if ($role === 'faculty'
                && !RoleMiddleware::teachesSubject(
                    (int) Faculty::facultyIdForUser(AuthMiddleware::getUserId()),
                    $subjectId
                )) {
                Response::forbidden('You are not assigned to that subject');
            }
            if ($role === 'hod' && !RoleMiddleware::canAccessDepartment($subject['department_id'])) {
                Response::forbidden('That subject belongs to another department');
            }

            $startDate = $_GET['start_date'] ?? date('Y-m-d');
            $endDate   = $_GET['end_date'] ?? date('Y-m-d');
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $startDate)) $startDate = date('Y-m-d');
            if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) $endDate))   $endDate = date('Y-m-d');
            if ($startDate > $endDate) {
                $swap = $startDate;
                $startDate = $endDate;
                $endDate = $swap;
            }

            $report = $this->attendanceModel->getReport($subjectId, $startDate, $endDate);
            Response::success([
                'records'    => $report,
                'subject_id' => $subjectId,
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ]);
        } catch (Exception $e) {
            error_log("AttendanceController::report Error: " . $e->getMessage());
            Response::serverError('Failed to load report');
        }
    }
}
