<?php

class HODController {

    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Resolve the caller's HOD faculty row, or stop the request.
     *
     * Every method in this controller used to repeat the same
     * findByUserId() + notFound() preamble; this keeps it in one place and
     * guarantees the department id used for scoping is always the HOD's own.
     */
    private function requireHodProfile(): array {
        $hod = (new Faculty())->findByUserId(AuthMiddleware::getUserId());
        if (!$hod || empty($hod['department_id'])) {
            Response::notFound('HOD profile not found');
        }
        return $hod;
    }

    public function dashboard() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $department = (new Department())->findById($deptId);

            $stmt = $this->db->prepare("SELECT COUNT(*) FROM students WHERE department_id = ?");
            $stmt->execute([$deptId]);
            $totalStudents = (int)$stmt->fetchColumn();

            $stmt = $this->db->prepare("SELECT COUNT(*) FROM faculty WHERE department_id = ?");
            $stmt->execute([$deptId]);
            $totalFaculty = (int)$stmt->fetchColumn();

            $stmt = $this->db->prepare(
                "SELECT COUNT(*) FROM fee_payments fp
                 JOIN students s ON fp.student_id = s.id
                 WHERE s.department_id = ? AND fp.status = 'completed'"
            );
            $stmt->execute([$deptId]);
            $totalPayments = (int)$stmt->fetchColumn();

            $stmt = $this->db->prepare(
                "SELECT ROUND(AVG(
                    CASE WHEN a.status IN ('present','late') THEN 100 ELSE 0 END
                )) as avg_attendance
                FROM attendance a
                JOIN students s ON a.student_id = s.id
                WHERE s.department_id = ?"
            );
            $stmt->execute([$deptId]);
            $avgAttendance = (int)$stmt->fetchColumn();

            $stmt = $this->db->prepare(
                "SELECT COUNT(*) FROM subjects WHERE department_id = ?"
            );
            $stmt->execute([$deptId]);
            $totalSubjects = (int)$stmt->fetchColumn();

            Response::success([
                'department' => $department,
                'total_students' => $totalStudents,
                'total_faculty' => $totalFaculty,
                'total_payments' => $totalPayments,
                'avg_attendance' => $avgAttendance,
                'total_subjects' => $totalSubjects,
            ]);
        } catch (Exception $e) {
            error_log("HODController::dashboard Error: " . $e->getMessage());
            Response::serverError('Failed to load dashboard');
        }
    }

    public function getDepartmentStudents() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $studentModel = new Student();

            // Paged rather than a fixed first 1000: a department with more
            // students than that silently lost the rest of its roster.
            $pageSize = 200;
            $page = 1;
            $students = [];
            do {
                $batch = $studentModel->getAll($page, $pageSize, ['department_id' => $deptId]);
                $rows = $batch['data'];
                foreach ($rows as $row) {
                    $students[] = $row;
                }
                $page++;
            } while (count($rows) === $pageSize);

            Response::success($students);
        } catch (Exception $e) {
            error_log("HODController::getDepartmentStudents Error: " . $e->getMessage());
            Response::serverError('Failed to load department students');
        }
    }

    public function getDepartmentFaculty() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $stmt = $this->db->prepare(
                "SELECT f.*, u.email, u.status as user_status
                 FROM faculty f
                 JOIN users u ON f.user_id = u.id
                 WHERE f.department_id = ?
                 ORDER BY f.first_name"
            );
            $stmt->execute([$deptId]);
            $faculty = $stmt->fetchAll();

            Response::success($faculty);
        } catch (Exception $e) {
            error_log("HODController::getDepartmentFaculty Error: " . $e->getMessage());
            Response::serverError('Failed to load department faculty');
        }
    }

    public function getDepartmentSubjects() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $stmt = $this->db->prepare(
                "SELECT s.*, c.name as course_name, sem.semester_number as semester,
                        CONCAT(f.first_name, ' ', f.last_name) as faculty_name
                 FROM subjects s
                 LEFT JOIN semesters sem ON s.semester_id = sem.id
                 LEFT JOIN courses c ON sem.course_id = c.id
                 LEFT JOIN faculty f ON s.faculty_id = f.id
                 WHERE s.department_id = ?
                 ORDER BY sem.semester_number, s.name"
            );
            $stmt->execute([$deptId]);
            $subjects = $stmt->fetchAll();

            Response::success($subjects);
        } catch (Exception $e) {
            error_log("HODController::getDepartmentSubjects Error: " . $e->getMessage());
            Response::serverError('Failed to load department subjects');
        }
    }

    public function getFacultyLoad() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $stmt = $this->db->prepare(
                "SELECT f.id, CONCAT(f.first_name, ' ', f.last_name) as name,
                        f.employee_id,
                        COUNT(DISTINCT tt.id) as timetable_entries,
                        COUNT(DISTINCT s.id) as subjects_count,
                        COUNT(DISTINCT a.id) as assignments_count
                 FROM faculty f
                 LEFT JOIN subjects s ON s.faculty_id = f.id AND s.department_id = ?
                 LEFT JOIN timetables tt ON tt.faculty_id = f.id
                 LEFT JOIN assignments a ON a.faculty_id = f.id
                 WHERE f.department_id = ?
                 GROUP BY f.id
                 ORDER BY f.first_name"
            );
            $stmt->execute([$deptId, $deptId]);
            $load = $stmt->fetchAll();

            Response::success($load);
        } catch (Exception $e) {
            error_log("HODController::getFacultyLoad Error: " . $e->getMessage());
            Response::serverError('Failed to load faculty workload');
        }
    }

    public function getFeeReport() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $stmt = $this->db->prepare(
                "SELECT fs.fee_type, fs.semester, fs.amount as total_amount,
                        COUNT(DISTINCT fp.id) as payments_count,
                        COALESCE(SUM(fp.amount), 0) as collected_amount
                 FROM fee_structures fs
                 LEFT JOIN fee_payments fp ON fs.id = fp.fee_structure_id AND fp.status = 'completed'
                 WHERE fs.course_id IN (SELECT id FROM courses WHERE department_id = ?)
                 GROUP BY fs.id
                 ORDER BY fs.semester, fs.fee_type"
            );
            $stmt->execute([$deptId]);
            $report = $stmt->fetchAll();

            Response::success($report);
        } catch (Exception $e) {
            error_log("HODController::getFeeReport Error: " . $e->getMessage());
            Response::serverError('Failed to load fee report');
        }
    }

    public function getDepartmentTimetable() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $timetableModel = new Timetable();
            $timetable = $timetableModel->getTimetable($deptId);

            Response::success($timetable);
        } catch (Exception $e) {
            error_log("HODController::getDepartmentTimetable Error: " . $e->getMessage());
            Response::serverError('Failed to load department timetable');
        }
    }

    public function addStudent() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $data = Validation::getJsonInput();

            if (empty($data['email']) || empty($data['password'])) {
                Response::validationError(['email' => 'Email and password are required']);
            }
            if (empty($data['first_name']) || empty($data['last_name'])) {
                Response::validationError(['first_name' => 'First name and last name are required']);
            }
            if (empty($data['roll_number'])) {
                Response::validationError(['roll_number' => 'Roll number is required']);
            }

            $userModel = new User();
            $existing = $userModel->findByEmail($data['email']);
            if ($existing) {
                Response::error('A user with this email already exists', 409);
            }

            $createdUserId = $userModel->create($data['email'], $data['password'], 'student');
            if (!$createdUserId) {
                Response::serverError('Failed to create user account');
            }

            $studentModel = new Student();
            $studentData = [
                'user_id' => $createdUserId,
                'roll_number' => $data['roll_number'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'department_id' => $deptId,
                'semester' => $data['semester'] ?? 1,
                'batch' => $data['batch'] ?? null,
                'phone' => $data['phone'] ?? null,
                'dob' => $data['dob'] ?? null,
                'gender' => $data['gender'] ?? null,
                'admission_date' => $data['admission_date'] ?? date('Y-m-d'),
            ];

            $id = $studentModel->create($studentData);
            if (!$id) {
                $userModel->updateStatus($createdUserId, 'inactive');
                Response::serverError('Failed to create student profile');
            }

            Response::success(['id' => $id, 'user_id' => $createdUserId], 'Student added successfully', 201);
        } catch (PDOException $e) {
            error_log("HODController::addStudent PDO Error: " . $e->getMessage());
            Response::serverError('Database error while creating the record');
        } catch (Exception $e) {
            error_log("HODController::addStudent Error: " . $e->getMessage());
            Response::serverError('Failed to add student');
        }
    }

    public function addFaculty() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $facultyModel = new Faculty();
            $data = Validation::getJsonInput();

            if (empty($data['email']) || empty($data['password'])) {
                Response::validationError(['email' => 'Email and password are required']);
            }
            if (empty($data['first_name']) || empty($data['last_name'])) {
                Response::validationError(['first_name' => 'First name and last name are required']);
            }
            if (empty($data['employee_id'])) {
                Response::validationError(['employee_id' => 'Employee ID is required']);
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

            $facultyData = [
                'user_id' => $createdUserId,
                'employee_id' => $data['employee_id'],
                'first_name' => $data['first_name'],
                'last_name' => $data['last_name'],
                'department_id' => $deptId,
                'qualification' => $data['qualification'] ?? null,
                'designation' => $data['designation'] ?? null,
                'experience_years' => $data['experience_years'] ?? 0,
                'phone' => $data['phone'] ?? null,
            ];

            $id = $facultyModel->create($facultyData);
            if (!$id) {
                $userModel->updateStatus($createdUserId, 'inactive');
                Response::serverError('Failed to create faculty profile');
            }

            Response::success(['id' => $id, 'user_id' => $createdUserId], 'Faculty added successfully', 201);
        } catch (PDOException $e) {
            error_log("HODController::addFaculty PDO Error: " . $e->getMessage());
            Response::serverError('Database error while creating the record');
        } catch (Exception $e) {
            error_log("HODController::addFaculty Error: " . $e->getMessage());
            Response::serverError('Failed to add faculty');
        }
    }

    public function addSubject() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $data = Validation::getJsonInput();

            if (empty($data['name']) || empty($data['code'])) {
                Response::validationError(['name' => 'Subject name and code are required']);
            }

            $stmt = $this->db->prepare("SELECT id FROM subjects WHERE code = ?");
            $stmt->execute([$data['code']]);
            if ($stmt->fetch()) {
                Response::error('Subject code "' . $data['code'] . '" already exists', 409);
            }

            if (empty($data['semester_id']) && !empty($data['semester'])) {
                $stmt = $this->db->prepare(
                    "SELECT sem.id FROM semesters sem
                     JOIN courses c ON sem.course_id = c.id
                     WHERE c.department_id = ? AND sem.semester_number = ?
                     ORDER BY sem.id LIMIT 1"
                );
                $stmt->execute([$deptId, (int)$data['semester']]);
                $semesterId = $stmt->fetchColumn();
                if ($semesterId) {
                    $data['semester_id'] = $semesterId;
                } else {
                    Response::validationError(['semester' => 'No semester ' . $data['semester'] . ' found for your department']);
                }
            }
            if (empty($data['semester_id'])) {
                Response::validationError(['semester_id' => 'Semester is required']);
            }

            $data['department_id'] = $deptId;

            // Only allow seeding the teacher here if they are in this
            // department; otherwise leave the subject unassigned.
            if (!empty($data['faculty_id'])) {
                if (!RoleMiddleware::canAccessDepartment((new Faculty())->getDepartmentFor((int) $data['faculty_id']))) {
                    unset($data['faculty_id']);
                }
            }

            $subjectModel = new Subject();
            $id = $subjectModel->create($data);

            Response::success(['id' => $id], 'Subject created successfully', 201);
        } catch (PDOException $e) {
            error_log("HODController::addSubject PDO Error: " . $e->getMessage());
            Response::serverError('Failed to add subject');
        } catch (Exception $e) {
            error_log("HODController::addSubject Error: " . $e->getMessage());
            Response::serverError('Failed to add subject');
        }
    }

    public function updateSubject($id) {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $data = Validation::getJsonInput();
            $subjectModel = new Subject();
            $subject = $subjectModel->findById($id);
            if (!$subject || (int)$subject['department_id'] !== (int)$hod['department_id']) {
                Response::forbidden('Subject not found in your department');
            }

            // Subject::update() would happily set faculty_id to a teacher from
            // another department, so pull that field out and use the guarded
            // assignFaculty() path instead.
            $newFacultyId = null;
            $reassign = array_key_exists('faculty_id', $data);
            if ($reassign) {
                $newFacultyId = $data['faculty_id'];
                unset($data['faculty_id']);
                if ($newFacultyId === '' || $newFacultyId === null) {
                    $newFacultyId = null;
                }
            }

            // The HOD must not move the subject to another department either.
            unset($data['department_id']);

            if (!empty($data)) {
                $subjectModel->update($id, $data);
            }

            if ($reassign) {
                if ($newFacultyId === null) {
                    $subjectModel->clearFaculty($id);
                } elseif (!$subjectModel->assignFaculty($id, (int) $newFacultyId)) {
                    Response::forbidden('That teacher is not in your department');
                }
            }

            Response::success(null, 'Subject updated successfully');
        } catch (Exception $e) {
            error_log("HODController::updateSubject Error: " . $e->getMessage());
            Response::serverError('Failed to update subject');
        }
    }

    public function deleteSubject($id) {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $subjectModel = new Subject();
            $subject = $subjectModel->findById($id);
            if (!$subject || (int)$subject['department_id'] !== (int)$hod['department_id']) {
                Response::forbidden('Subject not found in your department');
            }
            $subjectModel->delete($id);
            Response::success(null, 'Subject deleted successfully');
        } catch (Exception $e) {
            error_log("HODController::deleteSubject Error: " . $e->getMessage());
            Response::serverError('Failed to delete subject');
        }
    }

    public function assignSubjectFaculty($id) {
        try {
            $userId = AuthMiddleware::getUserId();
            $hod = (new Faculty())->findByUserId($userId);
            if (!$hod) {
                Response::notFound('HOD profile not found');
            }
            $deptId = (int) $hod['department_id'];

            $data = Validation::getJsonInput();
            $subjectModel = new Subject();
            $subject = $subjectModel->findById($id);
            if (!$subject) {
                Response::notFound('Subject not found');
            }
            if ((int) $subject['department_id'] !== $deptId) {
                Response::forbidden('Subject not found in your department');
            }

            $facultyId = array_key_exists('faculty_id', $data) ? $data['faculty_id'] : null;
            if ($facultyId === '' || $facultyId === null) {
                $facultyId = null;
            } else {
                $facultyId = (int) $facultyId;
                $facultyDept = (new Faculty())->getDepartmentFor($facultyId);
                if ($facultyDept === null || $facultyDept !== $deptId) {
                    Response::forbidden('That teacher is not in your department');
                }
            }

            if ($facultyId === null) {
                $subjectModel->clearFaculty($id);
            } elseif (!$subjectModel->assignFaculty($id, $facultyId)) {
                Response::forbidden('Failed to assign that teacher to this subject');
            }

            Response::success(null, 'Faculty assigned to subject successfully');
        } catch (Exception $e) {
            error_log("HODController::assignSubjectFaculty Error: " . $e->getMessage());
            Response::serverError('Failed to assign faculty');
        }
    }

    public function getDepartmentClassrooms() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $classroomModel = new Classroom();
            $classrooms = $classroomModel->getAll($hod['department_id']);
            Response::success($classrooms);
        } catch (Exception $e) {
            error_log("HODController::getDepartmentClassrooms Error: " . $e->getMessage());
            Response::serverError('Failed to load department classrooms');
        }
    }

    public function addClassroom() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $data = Validation::getJsonInput();
            if (empty($data['name'])) {
                Response::validationError(['name' => 'Classroom name is required']);
            }
            $data['department_id'] = $hod['department_id'];
            $classroomModel = new Classroom();
            $id = $classroomModel->create($data);
            Response::success(['id' => $id], 'Classroom added successfully', 201);
        } catch (Exception $e) {
            error_log("HODController::addClassroom Error: " . $e->getMessage());
            Response::serverError('Failed to add classroom');
        }
    }

    public function updateClassroom($id) {
        try {
            $hod = $this->requireHodProfile();
            $classroomModel = new Classroom();
            $classroom = $classroomModel->findById($id);
            if (!$classroom) {
                Response::notFound('Classroom not found');
            }
            if ((int) $classroom['department_id'] !== (int) $hod['department_id']) {
                Response::forbidden('Classroom not found in your department');
            }

            $data = Validation::getJsonInput();
            // A HOD must not be able to hand the room to another department.
            unset($data['department_id']);

            $classroomModel->update($id, $data);
            Response::success(null, 'Classroom updated successfully');
        } catch (Exception $e) {
            error_log("HODController::updateClassroom Error: " . $e->getMessage());
            Response::serverError('Failed to update classroom');
        }
    }

    public function deleteClassroom($id) {
        try {
            $hod = $this->requireHodProfile();
            $classroomModel = new Classroom();
            $classroom = $classroomModel->findById($id);
            if (!$classroom) {
                Response::notFound('Classroom not found');
            }
            if ((int) $classroom['department_id'] !== (int) $hod['department_id']) {
                Response::forbidden('Classroom not found in your department');
            }

            $classroomModel->delete($id);
            Response::success(null, 'Classroom deleted successfully');
        } catch (Exception $e) {
            error_log("HODController::deleteClassroom Error: " . $e->getMessage());
            Response::serverError('Failed to delete classroom');
        }
    }

    public function addTimetableEntry() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = (int) $hod['department_id'];

            $data = Validation::getJsonInput();
            $rules = [
                'branch_id' => 'required|numeric',
                'semester' => 'required|numeric',
                'day_of_week' => 'required|in:Monday,Tuesday,Wednesday,Thursday,Friday,Saturday',
                'period_number' => 'required|numeric',
                'subject_id' => 'required|numeric',
                'faculty_id' => 'required|numeric',
                'classroom' => 'required',
                'start_time' => 'required',
                'end_time' => 'required'
            ];
            $errors = Validation::validate($data, $rules);
            if ($errors !== true) { Response::validationError($errors); }

            // timetables.branch_id is a FK to departments(id), so it is forced
            // to the caller's own department rather than trusted from input.
            if ((int) $data['branch_id'] !== $deptId) {
                Response::forbidden('You can only build a timetable for your own department');
            }
            // The subject and the teacher must also belong to that department.
            if ((int) (new Subject())->getDepartmentId((int) $data['subject_id'] ?? 0) !== $deptId) {
                Response::forbidden('That subject is not in your department');
            }
            if ((int) (new Faculty())->getDepartmentFor((int) $data['faculty_id']) !== $deptId) {
                Response::forbidden('That teacher is not in your department');
            }

            $timetableModel = new Timetable();
            $conflict = $timetableModel->checkConflict($data);
            if ($conflict['conflict']) {
                Response::error($conflict['message'], 409);
            }
            $id = $timetableModel->create($data);
            Response::success(['id' => $id], 'Timetable entry created', 201);
        } catch (Exception $e) {
            error_log("HODController::addTimetableEntry Error: " . $e->getMessage());
            Response::serverError('Failed to create timetable entry');
        }
    }

    public function deleteTimetableEntry($id) {
        try {
            $hod = $this->requireHodProfile();
            $deptId = (int) $hod['department_id'];

            $existing = $this->db->prepare("SELECT branch_id FROM timetables WHERE id = ?");
            $existing->execute([(int) $id]);
            $row = $existing->fetch();
            if (!$row) {
                Response::notFound('Timetable entry not found');
            }
            if ((int) $row['branch_id'] !== $deptId) {
                Response::forbidden('That entry belongs to another department');
            }

            (new Timetable())->delete($id);
            Response::success(null, 'Timetable entry deleted');
        } catch (Exception $e) {
            error_log("HODController::deleteTimetableEntry Error: " . $e->getMessage());
            Response::serverError('Failed to delete timetable entry');
        }
    }

    public function getAcademicTrends() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];

            $stmt = $this->db->prepare(
                "SELECT sem.semester_number, 
                        ROUND(AVG(COALESCE(ut.marks_obtained, 0)), 2) as avg_internal,
                        ROUND(AVG(COALESCE(em.marks_obtained, 0)), 2) as avg_external
                 FROM semesters sem
                 CROSS JOIN students s ON s.department_id = ?
                 LEFT JOIN subjects sub ON sub.semester_id = sem.id AND sub.department_id = ?
                 LEFT JOIN unit_tests ut ON ut.student_id = s.id AND ut.subject_id = sub.id
                 LEFT JOIN external_marks em ON em.student_id = s.id AND em.subject_id = sub.id
                 WHERE sem.course_id IN (SELECT id FROM courses WHERE department_id = ?)
                 GROUP BY sem.semester_number
                 ORDER BY sem.semester_number"
            );
            $stmt->execute([$deptId, $deptId, $deptId]);
            $semesterTrends = $stmt->fetchAll();

            $stmt2 = $this->db->prepare(
                "SELECT DATE_FORMAT(a.date, '%Y-%m') as month,
                        ROUND(AVG(CASE WHEN a.status IN ('present','late') THEN 100 ELSE 0 END)) as rate
                 FROM attendance a
                 JOIN students s ON a.student_id = s.id
                 WHERE s.department_id = ? AND a.date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                 GROUP BY month ORDER BY month"
            );
            $stmt2->execute([$deptId]);
            $attendanceTrends = $stmt2->fetchAll();

            Response::success([
                'semester_trends' => $semesterTrends,
                'attendance_trends' => $attendanceTrends,
            ]);
        } catch (Exception $e) {
            error_log("HODController::getAcademicTrends Error: " . $e->getMessage());
            Response::serverError('Failed to load academic trends');
        }
    }

    public function getDepartmentReports() {
        try {
            $hod = $this->requireHodProfile();
            $deptId = $hod['department_id'];
            $type = $_GET['type'] ?? 'summary';

            switch ($type) {
                case 'attendance':
                    $stmt = $this->db->prepare(
                        "SELECT s.roll_number, CONCAT(s.first_name, ' ', s.last_name) as name,
                                ROUND(AVG(CASE WHEN a.status IN ('present','late') THEN 100 ELSE 0 END)) as rate,
                                COUNT(CASE WHEN a.status = 'absent' THEN 1 END) as absences
                         FROM students s
                         LEFT JOIN attendance a ON a.student_id = s.id
                         WHERE s.department_id = ?
                         GROUP BY s.id
                         ORDER BY rate ASC"
                    );
                    $stmt->execute([$deptId]);
                    break;
                case 'performance':
                    $stmt = $this->db->prepare(
                        "SELECT s.roll_number, CONCAT(s.first_name, ' ', s.last_name) as name,
                                ROUND(AVG(ut.marks_obtained), 2) as avg_internal,
                                ROUND(AVG(em.marks_obtained), 2) as avg_external
                         FROM students s
                         LEFT JOIN unit_tests ut ON ut.student_id = s.id
                         LEFT JOIN external_marks em ON em.student_id = s.id
                         WHERE s.department_id = ?
                         GROUP BY s.id
                         ORDER BY name"
                    );
                    $stmt->execute([$deptId]);
                    break;
                case 'faculty_load':
                    $stmt = $this->db->prepare(
                        "SELECT CONCAT(f.first_name, ' ', f.last_name) as name,
                                f.designation, COUNT(DISTINCT s.id) as subjects,
                                COUNT(DISTINCT tt.id) as timetable_entries
                         FROM faculty f
                         LEFT JOIN subjects s ON s.faculty_id = f.id
                         LEFT JOIN timetables tt ON tt.faculty_id = f.id
                         WHERE f.department_id = ?
                         GROUP BY f.id
                         ORDER BY name"
                    );
                    $stmt->execute([$deptId]);
                    break;
                default:
                    $stmt = $this->db->prepare(
                        "SELECT 'Students' as metric, COUNT(*) as value FROM students WHERE department_id = ?
                         UNION SELECT 'Faculty', COUNT(*) FROM faculty WHERE department_id = ?
                         UNION SELECT 'Subjects', COUNT(*) FROM subjects WHERE department_id = ?
                         UNION SELECT 'Classrooms', COUNT(*) FROM classrooms WHERE department_id = ?"
                    );
                    $stmt->execute([$deptId, $deptId, $deptId, $deptId]);
            }

            $data = $stmt->fetchAll();
            Response::success($data);
        } catch (Exception $e) {
            error_log("HODController::getDepartmentReports Error: " . $e->getMessage());
            Response::serverError('Failed to load department reports');
        }
    }
}