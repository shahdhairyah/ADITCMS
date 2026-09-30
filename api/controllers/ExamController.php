<?php
/**
 * ADIT CMS - Exam Controller
 */

class ExamController {
    
    private $examModel;

    public function __construct() {
        $this->examModel = new Exam();
    }

    public function enterInternalMarks() {
        try {
            $data = Validation::getJsonInput();

            // unit_tests.entered_by is a FOREIGN KEY to faculty(id), but the
            // route also admits admins, who have no faculty row - previously
            // requireFacultyIdForUser() rejected them with "No faculty profile
            // is linked to this account", so admin internal marks could never be
            // saved. entered_by is now optional (null for an admin) and
            // entered_by_user records the acting account for every role.
            $userId = AuthMiddleware::getUserId();
            if (!$userId) {
                Response::unauthorized('Authentication required');
            }
            $role = AuthMiddleware::getUserRole();
            $enteredBy = $role === 'faculty'
                ? Faculty::requireFacultyIdForUser($userId)
                : Faculty::facultyIdForUser($userId);

            if (isset($data['marks']) && is_array($data['marks'])) {
                foreach ($data['marks'] as $mark) {
                    if (!is_array($mark)) {
                        continue;
                    }
                    $this->assertCanMark($mark, $enteredBy, $userId);
                    $mark['entered_by'] = $enteredBy;
                    $mark['entered_by_user'] = $userId;
                    $this->examModel->enterInternalMarks($mark);
                }
            } elseif (isset($data['student_id'])) {
                $this->assertCanMark($data, $enteredBy, $userId);
                $data['entered_by'] = $enteredBy;
                $data['entered_by_user'] = $userId;
                $this->examModel->enterInternalMarks($data);
            } else {
                Response::error('Invalid request format', 400);
            }

            Response::success(null, 'Internal marks entered successfully');
        } catch (Exception $e) {
            error_log("ExamController::enterInternalMarks Error: " . $e->getMessage());
            Response::serverError('Failed to enter internal marks');
        }
    }

    public function enterExternalMarks() {
        try {
            $data = Validation::getJsonInput();

            // external_marks.entered_by is a FOREIGN KEY to users(id), NOT
            // faculty(id) - passing a faculty id here made every insert fail
            // with FK error 1452 (or silently credit the wrong account when
            // the two ids happened to coincide).
            $enteredBy = AuthMiddleware::getUserId();
            if (!$enteredBy) {
                Response::unauthorized('Authentication required');
            }

            if (isset($data['marks']) && is_array($data['marks'])) {
                foreach ($data['marks'] as $mark) {
                    if (!is_array($mark)) {
                        continue;
                    }
                    $this->assertCanMark($mark, null, $enteredBy);
                    $mark['entered_by'] = $enteredBy;
                    $this->examModel->enterExternalMarks($mark);
                }
            } elseif (isset($data['student_id'])) {
                $this->assertCanMark($data, null, $enteredBy);
                $data['entered_by'] = $enteredBy;
                $this->examModel->enterExternalMarks($data);
            } else {
                Response::error('Invalid request format', 400);
            }

            Response::success(null, 'External marks entered successfully');
        } catch (Exception $e) {
            error_log("ExamController::enterExternalMarks Error: " . $e->getMessage());
            Response::serverError('Failed to enter external marks');
        }
    }

    /**
     * Guard a marks payload.
     *
     * subject_id and student_id both arrive in the request body, so without
     * this any teacher could write marks for any other teacher's subject and
     * any student. Admins are unrestricted; a teacher must own the subject and
     * must be allowed to reach the student.
     *
     * @param int|null $facultyId required for internal marks, null for external
     * @param int|null $userId    the acting account, used when $facultyId is null
     */
    private function assertCanMark(array $mark, $facultyId, $userId = null): void {
        $subjectId = $mark['subject_id'] ?? null;
        $studentId = $mark['student_id'] ?? null;

        if ($subjectId === null || $studentId === null) {
            Response::validationError([
                'student_id' => 'student_id is required',
                'subject_id' => 'subject_id is required',
            ]);
        }
        $subjectId = (int) $subjectId;
        $studentId = (int) $studentId;

        $subject = (new Subject())->findById($subjectId);
        if (!$subject) {
            Response::notFound('Subject not found');
        }
        if (!(new Student())->findById($studentId)) {
            Response::notFound('Student not found');
        }

        if (AuthMiddleware::getUserRole() === 'admin') {
            return;
        }

        if ($facultyId !== null && !RoleMiddleware::teachesSubject($facultyId, $subjectId)) {
            Response::forbidden('You are not assigned to that subject');
        }
        if ($userId !== null && AuthMiddleware::getUserRole() === 'faculty'
            && !RoleMiddleware::teachesSubject(
                (int) Faculty::facultyIdForUser($userId),
                $subjectId
            )) {
            Response::forbidden('You are not assigned to that subject');
        }
        if (!RoleMiddleware::canAccessStudent($studentId)) {
            Response::forbidden('You do not have permission to grade this student');
        }
    }

    public function updateInternalMarks($id) {
        try {
            $id = Validation::id($id);
            if ($id === null) {
                Response::error('Invalid marks id', 400);
            }
            $data = Validation::getJsonInput();

            $row = $this->examModel->getInternalMarkById($id);
            if (!$row) {
                Response::notFound('Marks entry not found');
            }

            $role = AuthMiddleware::getUserRole();
            $userId = AuthMiddleware::getUserId();
            if ($role === 'admin') {
                $data['entered_by'] = $row['entered_by'];
            } else {
                $facultyId = Faculty::requireFacultyIdForUser($userId);
                // Re-check ownership whenever the payload retargets the mark
                // to a different subject or student; otherwise it is an edit
                // in place, and the teacher must still own the subject.
                $target = [
                    'subject_id' => $data['subject_id'] ?? $row['subject_id'],
                    'student_id' => $data['student_id'] ?? $row['student_id'],
                ];
                $this->assertCanMark($target, $facultyId);
                $data['entered_by'] = $facultyId;
            }
            // Attribute the edit itself, which the faculty FK cannot express
            // for an admin.
            $data['entered_by_user'] = $userId;

            $result = $this->examModel->updateInternalMarks($id, $data);

            if (!$result) {
                Response::serverError('Failed to update internal marks');
            }

            Response::success(null, 'Internal marks updated successfully');
        } catch (Exception $e) {
            error_log("ExamController::updateInternalMarks Error: " . $e->getMessage());
            Response::serverError('Failed to update internal marks');
        }
    }

    public function getResults() {
        try {
            $role = AuthMiddleware::getUserRole();
            $userId = AuthMiddleware::getUserId();

            if ($role === 'student') {
                $studentModel = new Student();
                $student = $studentModel->findByUserId($userId);
                $studentId = $student ? $student['id'] : null;
                if (!$studentId) {
                    Response::error('No student profile is linked to this account', 404);
                }
            } else {
                $studentId = Validation::id($_GET['student_id'] ?? null);
                if ($studentId === null) {
                    Response::error('A valid student_id is required', 400);
                }
                // Without this, any logged-in faculty/hod could read any
                // student's marks by appending ?student_id=N.
                if (!RoleMiddleware::canAccessStudent($studentId)) {
                    Response::forbidden('You do not have permission to view this student\'s results');
                }
            }

            $semesterId = Validation::id($_GET['semester_id'] ?? null);

            $results = $this->examModel->getResults($studentId, $semesterId);
            Response::success($results);
        } catch (Exception $e) {
            error_log("ExamController::getResults Error: " . $e->getMessage());
            Response::serverError('Failed to load results');
        }
    }

    public function getHallTicket($studentId = null) {
        try {
            if (!$studentId) {
                $userId = AuthMiddleware::getUserId();
                $studentModel = new Student();
                $student = $studentModel->findByUserId($userId);
                $studentId = $student ? $student['id'] : null;
            } else {
                $studentId = Validation::id($studentId);
            }

            if (!$studentId) {
                Response::error('Student ID required', 400);
            }
            if (!RoleMiddleware::canAccessStudent($studentId)) {
                Response::forbidden('You do not have permission to view this student\'s hall ticket');
            }

            $hallTicket = $this->examModel->getHallTicket($studentId);
            
            if (!$hallTicket) {
                Response::notFound('No hall ticket found. Please generate one.');
            }

            Response::success($hallTicket);
        } catch (Exception $e) {
            error_log("ExamController::getHallTicket Error: " . $e->getMessage());
            Response::serverError('Failed to load hall ticket');
        }
    }

    public function getPerformanceAnalytics($subjectId) {
        try {
            $subjectId = Validation::id($subjectId);
            if ($subjectId === null) {
                Response::error('Invalid subject id', 400);
            }
            // subject_id comes straight from the URL, so a teacher could
            // otherwise read the class analytics of any other department.
            $subject = (new Subject())->findById($subjectId);
            if (!$subject) {
                Response::notFound('Subject not found');
            }
            $role = AuthMiddleware::getUserRole();
            if ($role === 'faculty' && !RoleMiddleware::teachesSubject(
                (int) Faculty::facultyIdForUser(AuthMiddleware::getUserId()),
                $subjectId
            )) {
                Response::forbidden('You are not assigned to that subject');
            }
            if ($role === 'hod' && !RoleMiddleware::canAccessDepartment($subject['department_id'])) {
                Response::forbidden('That subject belongs to another department');
            }

            $analytics = $this->examModel->getPerformanceAnalytics($subjectId);
            Response::success($analytics);
        } catch (Exception $e) {
            error_log("ExamController::getPerformanceAnalytics Error: " . $e->getMessage());
            Response::serverError('Failed to load performance analytics');
        }
    }

    public function getClassPerformance() {
        try {
            $subjectId = Validation::id($_GET['subject_id'] ?? null);
            $semesterId = Validation::id($_GET['semester_id'] ?? null);

            if ($subjectId === null || $semesterId === null) {
                Response::error('subject_id and semester_id are required', 400);
            }
            $subject = (new Subject())->findById($subjectId);
            if (!$subject) {
                Response::notFound('Subject not found');
            }
            $role = AuthMiddleware::getUserRole();
            if ($role === 'faculty' && !RoleMiddleware::teachesSubject(
                (int) Faculty::facultyIdForUser(AuthMiddleware::getUserId()),
                $subjectId
            )) {
                Response::forbidden('You are not assigned to that subject');
            }
            if ($role === 'hod' && !RoleMiddleware::canAccessDepartment($subject['department_id'])) {
                Response::forbidden('That subject belongs to another department');
            }

            $stats = $this->examModel->getClassPerformance($subjectId, $semesterId);
            Response::success($stats);
        } catch (Exception $e) {
            error_log("ExamController::getClassPerformance Error: " . $e->getMessage());
            Response::serverError('Failed to load class performance');
        }
    }

    public function publishResults() {
        try {
            $data = Validation::getJsonInput();
            $semesterId = Validation::id($data['semester_id'] ?? null);

            if ($semesterId === null) {
                Response::error('Semester ID required', 400);
            }

            // Paged instead of a hard-coded first 1000 rows: previously any
            // student beyond that silently got no results row, yet the
            // endpoint still reported success.
            $studentModel = new Student();
            $pageSize = 200;
            $page = 1;
            $processed = 0;
            do {
                $batch = $studentModel->getAll($page, $pageSize);
                $rows  = $batch['data'];
                foreach ($rows as $student) {
                    $this->examModel->generateResults($student['id'], $semesterId);
                    $processed++;
                }
                $page++;
            } while (count($rows) === $pageSize);

            $count = $this->examModel->publishResults($semesterId);

            Response::success([
                'published'  => $count,
                'processed'  => $processed,
            ], 'Results published successfully');
        } catch (Exception $e) {
            error_log("ExamController::publishResults Error: " . $e->getMessage());
            Response::serverError('Failed to publish results');
        }
    }

    public function getStudentMarks() {
        try {
            $role = AuthMiddleware::getUserRole();
            $userId = AuthMiddleware::getUserId();
            $studentModel = new Student();
            $student = $studentModel->findByUserId($userId);

            if (!$student) {
                Response::success(['student' => null, 'subjects' => []]);
                return;
            }

            $studentId = $student['id'];
            $semesterId = Validation::id($_GET['semester_id'] ?? null);

            $subjects = $studentModel->getSubjects($studentId);
            if ($semesterId !== null) {
                // Intersect rather than replace: the previous version swapped
                // the student's own subject list for EVERY subject in the
                // requested semester, across all departments, so a student
                // received a marks breakdown and grade for subjects outside
                // their curriculum.
                $mine = array_map('intval', array_column($subjects, 'id'));
                $db = Database::getInstance()->getConnection();
                $stmt = $db->prepare("SELECT id FROM subjects WHERE semester_id = ?");
                $stmt->execute([$semesterId]);
                $inSemester = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
                $allowed = array_values(array_intersect($mine, $inSemester));

                $subjects = array_values(array_filter(
                    $subjects,
                    static fn($s) => in_array((int) $s['id'], $allowed, true)
                ));
            }

            $marksData = [];
            foreach ($subjects as $subject) {
                $db = Database::getInstance()->getConnection();
                $stmt = $db->prepare(
                    "SELECT test_number, marks_obtained, max_marks 
                     FROM unit_tests 
                     WHERE student_id = ? AND subject_id = ? 
                     ORDER BY test_number"
                );
                $stmt->execute([$studentId, $subject['id']]);
                $internals = $stmt->fetchAll();

                $internalMarks = 0;
                $internalMax = 0;
                if (count($internals) >= 2) {
                    $sorted = array_column($internals, 'marks_obtained');
                    rsort($sorted);
                    $internalMarks = $sorted[0] + $sorted[1];
                    $internalMax = ($internals[0]['max_marks'] ?? 30) + ($internals[1]['max_marks'] ?? 30);
                } elseif (count($internals) === 1) {
                    $internalMarks = $internals[0]['marks_obtained'];
                    $internalMax = $internals[0]['max_marks'] ?? 30;
                }

                $stmt = $db->prepare(
                    "SELECT marks_obtained, max_marks 
                     FROM external_marks 
                     WHERE student_id = ? AND subject_id = ?"
                );
                $stmt->execute([$studentId, $subject['id']]);
                $external = $stmt->fetch();

                $externalMarks = $external ? $external['marks_obtained'] : 0;
                $externalMax = $external ? ($external['max_marks'] ?? 100) : 100;

                $totalMarks = $internalMarks + $externalMarks;
                $totalMax = $internalMax + $externalMax;
                $percentage = $totalMax > 0 ? round(($totalMarks / $totalMax) * 100, 1) : 0;

                $grade = 'F';
                $gradePoint = 0;
                if ($percentage >= 90) { $grade = 'O'; $gradePoint = 10; }
                elseif ($percentage >= 80) { $grade = 'A+'; $gradePoint = 9; }
                elseif ($percentage >= 70) { $grade = 'A'; $gradePoint = 8; }
                elseif ($percentage >= 60) { $grade = 'B+'; $gradePoint = 7; }
                elseif ($percentage >= 50) { $grade = 'B'; $gradePoint = 6; }
                elseif ($percentage >= 40) { $grade = 'C'; $gradePoint = 5; }

                $marksData[] = [
                    'id' => $subject['id'],
                    'name' => $subject['name'],
                    'code' => $subject['code'],
                    'credits' => $subject['credits'] ?? 4,
                    'internal' => $internalMarks,
                    'internal_max' => $internalMax,
                    'external' => $externalMarks,
                    'external_max' => $externalMax,
                    'total' => $totalMarks,
                    'total_max' => $totalMax,
                    'percentage' => $percentage,
                    'grade' => $grade,
                    'grade_point' => $gradePoint,
                    'internals' => $internals,
                ];
            }

            Response::success([
                'student' => [
                    'id' => $student['id'],
                    'first_name' => $student['first_name'],
                    'last_name' => $student['last_name'],
                    'roll_number' => $student['roll_number'],
                    'semester' => $student['semester'],
                ],
                'subjects' => $marksData,
            ]);
        } catch (Exception $e) {
            error_log("ExamController::getStudentMarks Error: " . $e->getMessage());
            Response::serverError('Failed to load student marks');
        }
    }
}
