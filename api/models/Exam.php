<?php
/**
 * ADIT CMS - Exam Model
 */

class Exam extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    // Internal Marks
    public function enterInternalMarks($data) {
        // entered_by is a FK to faculty(id) and an admin has no faculty row, so
        // entered_by is omitted for them; entered_by_user records the actor for
        // every role.
        $stmt = $this->db->prepare(
            "INSERT INTO unit_tests (student_id, subject_id, test_number, marks_obtained, max_marks, entered_by, entered_by_user)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained),
                                     max_marks = VALUES(max_marks),
                                     entered_by = VALUES(entered_by),
                                     entered_by_user = VALUES(entered_by_user)"
        );
        $stmt->execute([
            $data['student_id'], $data['subject_id'],
            $data['test_number'], $data['marks_obtained'],
            $data['max_marks'] ?? 30,
            $data['entered_by'] ?? null,
            $data['entered_by_user'] ?? null
        ]);
        return true;
    }

    public function updateInternalMarks($id, $data) {
        $fields = [];
        $params = [];

        foreach ($data as $key => $value) {
            if (in_array($key, ['student_id', 'subject_id', 'test_number', 'marks_obtained', 'max_marks', 'entered_by', 'entered_by_user'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }

        if (empty($fields)) return false;

        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE unit_tests SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    /** One internal-marks row, or null. */
    public function getInternalMarkById($id) {
        $stmt = $this->db->prepare("SELECT * FROM unit_tests WHERE id = ? LIMIT 1");
        $stmt->execute([(int) $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function getInternalMarks($studentId = null, $subjectId = null, $semester = null) {
        $where = ['1=1'];
        $params = [];

        if ($studentId) {
            $where[] = 'ut.student_id = ?';
            $params[] = $studentId;
        }
        if ($subjectId) {
            $where[] = 'ut.subject_id = ?';
            $params[] = $subjectId;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT ut.*, s.name as subject_name, s.code as subject_code,
                    st.first_name, st.last_name, st.roll_number
             FROM unit_tests ut 
             JOIN subjects s ON ut.subject_id = s.id 
             JOIN students st ON ut.student_id = st.id 
             WHERE {$whereClause} 
             ORDER BY st.roll_number, ut.test_number"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // External Marks
    public function enterExternalMarks($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO external_marks (student_id, subject_id, marks_obtained, max_marks, entered_by) 
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE marks_obtained = VALUES(marks_obtained), entered_by = VALUES(entered_by)"
        );
        $stmt->execute([
            $data['student_id'], $data['subject_id'],
            $data['marks_obtained'], $data['max_marks'] ?? 100,
            $data['entered_by']
        ]);
        return true;
    }

    public function getExternalMarks($studentId = null, $subjectId = null) {
        $where = ['1=1'];
        $params = [];

        if ($studentId) {
            $where[] = 'em.student_id = ?';
            $params[] = $studentId;
        }
        if ($subjectId) {
            $where[] = 'em.subject_id = ?';
            $params[] = $subjectId;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT em.*, s.name as subject_name, s.code as subject_code
             FROM external_marks em 
             JOIN subjects s ON em.subject_id = s.id 
             WHERE {$whereClause}"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    // Results
    public function generateResults($studentId, $semesterId) {
        $studentId = (int) $studentId;
        $semesterId = (int) $semesterId;

        $stmt = $this->db->prepare(
            "SELECT s.id, s.credits FROM subjects s WHERE s.semester_id = ?"
        );
        $stmt->execute([$semesterId]);
        $subjects = $stmt->fetchAll();

        $totalCredits = 0;
        $totalGradePoints = 0;
        $breakdown = [];

        foreach ($subjects as $subject) {
            $subjectId = (int) $subject['id'];
            $credits = (float) $subject['credits'];

            // Best-of internal assessment.
            //
            // The old code did MAX() plus a correlated "ORDER BY marks DESC
            // LIMIT 1 OFFSET 1" and then divided the sum by 2. With a single
            // unit test the second pick is NULL, so (best1 + NULL) / 2 halved
            // the score instead of using it.
            $stmt = $this->db->prepare(
                "SELECT marks_obtained, max_marks
                 FROM unit_tests
                 WHERE student_id = ? AND subject_id = ?
                 ORDER BY marks_obtained DESC, max_marks DESC
                 LIMIT 1"
            );
            $stmt->execute([$studentId, $subjectId]);
            $internal = $stmt->fetch();

            $stmt = $this->db->prepare(
                "SELECT marks_obtained, max_marks FROM external_marks
                 WHERE student_id = ? AND subject_id = ?"
            );
            $stmt->execute([$studentId, $subjectId]);
            $external = $stmt->fetch();

            // Credit still counts for a subject with no marks recorded yet,
            // otherwise a half-marked semester reports an inflated SGPA.
            $obtained = 0.0;
            $maximum  = 0.0;
            if ($internal) {
                $obtained += (float) $internal['marks_obtained'];
                $maximum  += (float) $internal['max_marks'];
            }
            if ($external) {
                $obtained += (float) $external['marks_obtained'];
                $maximum  += (float) $external['max_marks'];
            }

            $percentage = $maximum > 0 ? ($obtained / $maximum) * 100 : 0.0;
            $gradePoint = $maximum > 0 ? $this->calculateGradePoint($percentage) : 0;

            $totalCredits    += $credits;
            $totalGradePoints += $gradePoint * $credits;

            $breakdown[] = [
                'subject_id' => $subjectId,
                'obtained'   => round($obtained, 2),
                'maximum'    => round($maximum, 2),
                'percentage' => round($percentage, 2),
                'grade_point'=> $gradePoint,
                'credits'    => $credits,
            ];
        }

        $sgpa = $totalCredits > 0 ? round($totalGradePoints / $totalCredits, 2) : 0;

        // Cumulative grade points from every earlier semester.
        //
        // The old line was:
        //     $prevCredits = $prevResult['cgpa'] * 20;  // assuming 20/sem
        //     $prevGradePoints = $prevResult['cgpa'] * $prevCredits;
        // which invented a credit count and then re-derived grade points from
        // the CGPA, so any real course load produced nonsense. The results
        // table now stores real per-semester totals, so sum them.
        $stmt = $this->db->prepare(
            "SELECT COALESCE(SUM(total_credits), 0) AS credits,
                    COALESCE(SUM(total_grade_points), 0) AS grade_points
             FROM results
             WHERE student_id = ? AND semester_id < ?"
        );
        $stmt->execute([$studentId, $semesterId]);
        $prev = $stmt->fetch() ?: ['credits' => 0, 'grade_points' => 0];

        $cumulativeCredits    = (float) $prev['credits'] + $totalCredits;
        $cumulativeGradePoints = (float) $prev['grade_points'] + $totalGradePoints;

        $cgpa = $cumulativeCredits > 0
            ? round($cumulativeGradePoints / $cumulativeCredits, 2)
            : 0;

        $status = $sgpa >= 4.0 ? 'pass' : 'fail';

        $stmt = $this->db->prepare(
            "INSERT INTO results
                (student_id, semester_id, sgpa, cgpa, total_credits, total_grade_points, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
                sgpa = VALUES(sgpa),
                cgpa = VALUES(cgpa),
                total_credits = VALUES(total_credits),
                total_grade_points = VALUES(total_grade_points),
                status = VALUES(status)"
        );
        $stmt->execute([
            $studentId, $semesterId, $sgpa, $cgpa,
            $totalCredits, $totalGradePoints, $status,
        ]);

        return [
            'sgpa' => $sgpa,
            'cgpa' => $cgpa,
            'total_credits' => round($totalCredits, 2),
            'total_grade_points' => round($totalGradePoints, 2),
            'status' => $status,
            'breakdown' => $breakdown,
        ];
    }

    private function calculateGradePoint($percentage) {
        if ($percentage >= 90) return 10;  // O
        if ($percentage >= 80) return 9;   // A+
        if ($percentage >= 70) return 8;   // A
        if ($percentage >= 60) return 7;   // B+
        if ($percentage >= 50) return 6;   // B
        if ($percentage >= 40) return 5;   // C
        return 0;                           // F
    }

    public function getResults($studentId = null, $semesterId = null) {
        $where = ['1=1'];
        $params = [];

        if ($studentId) {
            $where[] = 'r.student_id = ?';
            $params[] = $studentId;
        }
        if ($semesterId) {
            $where[] = 'r.semester_id = ?';
            $params[] = $semesterId;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT r.*, sem.semester_number, c.name as course_name,
                    st.first_name, st.last_name, st.roll_number
             FROM results r 
             JOIN semesters sem ON r.semester_id = sem.id 
             JOIN courses c ON sem.course_id = c.id 
             JOIN students st ON r.student_id = st.id 
             WHERE {$whereClause} 
             ORDER BY sem.semester_number"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getPerformanceAnalytics($subjectId) {
        $stmt = $this->db->prepare(
            "SELECT test_number, 
                    ROUND(AVG(marks_obtained), 2) as average_marks,
                    MAX(marks_obtained) as highest_marks,
                    MIN(marks_obtained) as lowest_marks,
                    COUNT(*) as total_students
             FROM unit_tests 
             WHERE subject_id = ? 
             GROUP BY test_number 
             ORDER BY test_number"
        );
        $stmt->execute([$subjectId]);
        $testAverages = $stmt->fetchAll();

        $stmt = $this->db->prepare(
            "SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN marks_obtained >= 40 THEN 1 ELSE 0 END) as passed,
                SUM(CASE WHEN marks_obtained < 40 THEN 1 ELSE 0 END) as failed
             FROM external_marks 
             WHERE subject_id = ?"
        );
        $stmt->execute([$subjectId]);
        $passFail = $stmt->fetch() ?: ['total' => 0, 'passed' => 0, 'failed' => 0];

        $stmt = $this->db->prepare(
            "SELECT 
                ROUND(AVG(marks_obtained), 2) as class_average,
                MAX(marks_obtained) as highest,
                MIN(marks_obtained) as lowest
             FROM unit_tests 
             WHERE subject_id = ?"
        );
        $stmt->execute([$subjectId]);
        $overall = $stmt->fetch() ?: ['class_average' => 0, 'highest' => 0, 'lowest' => 0];

        $stmt = $this->db->prepare(
            "SELECT ROUND(AVG(marks_obtained), 2) as external_average 
             FROM external_marks 
             WHERE subject_id = ?"
        );
        $stmt->execute([$subjectId]);
        $external = $stmt->fetch();

        return [
            'test_averages' => $testAverages,
            'pass_fail' => $passFail,
            'overall_internal' => $overall,
            'external_average' => $external ? $external['external_average'] : 0,
        ];
    }

    public function publishResults($semesterId) {
        $stmt = $this->db->prepare(
            "UPDATE results SET published_at = NOW() WHERE semester_id = ? AND published_at IS NULL"
        );
        $stmt->execute([$semesterId]);
        return $stmt->rowCount();
    }

    public function getClassPerformance($subjectId, $semesterId) {
        $stmt = $this->db->prepare(
            "SELECT 
                ut.student_id,
                ROUND(COALESCE(AVG(ut.marks_obtained), 0) + COALESCE(MAX(em.marks_obtained), 0), 1) as total_marks
             FROM unit_tests ut
             LEFT JOIN external_marks em ON ut.student_id = em.student_id AND ut.subject_id = em.subject_id
             WHERE ut.subject_id = ?
             GROUP BY ut.student_id"
        );
        $stmt->execute([$subjectId]);
        $rows = $stmt->fetchAll();

        if (empty($rows)) {
            return [
                'highest' => 0, 'lowest' => 0, 'average' => 0,
                'pass_percentage' => 0,
                'grade_distribution' => ['A' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'F' => 0],
                'total_students' => 0
            ];
        }

        $marks = array_map('floatval', array_column($rows, 'total_marks'));
        $totalStudents = count($marks);
        $highest = max($marks);
        $lowest = min($marks);
        $average = round(array_sum($marks) / $totalStudents, 1);

        $passCount = 0;
        $grades = ['A' => 0, 'B' => 0, 'C' => 0, 'D' => 0, 'F' => 0];

        foreach ($marks as $mark) {
            $pct = ($mark / 130) * 100;
            if ($pct >= 80) { $grades['A']++; $passCount++; }
            elseif ($pct >= 60) { $grades['B']++; $passCount++; }
            elseif ($pct >= 40) { $grades['C']++; $passCount++; }
            elseif ($pct >= 20) { $grades['D']++; }
            else { $grades['F']++; }
        }

        return [
            'highest' => $highest,
            'lowest' => $lowest,
            'average' => $average,
            'pass_percentage' => round(($passCount / $totalStudents) * 100, 1),
            'grade_distribution' => $grades,
            'total_students' => $totalStudents
        ];
    }

    // Hall Ticket
    public function getHallTicket($studentId) {
        $stmt = $this->db->prepare(
            "SELECT ht.*, st.first_name, st.last_name, st.roll_number, st.photo,
                    c.name as course_name, sem.semester_number
             FROM hall_tickets ht 
             JOIN students st ON ht.student_id = st.id 
             JOIN semesters sem ON ht.semester_id = sem.id 
             JOIN courses c ON sem.course_id = c.id 
             WHERE ht.student_id = ?
             ORDER BY ht.generated_at DESC LIMIT 1"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetch();
    }

    public function generateHallTicket($studentId, $semesterId) {
        // Check eligibility
        $stmt = $this->db->prepare(
            "SELECT * FROM fee_payments WHERE student_id = ? AND status = 'completed'"
        );
        $stmt->execute([$studentId]);
        $hasFeesPaid = $stmt->rowCount() > 0;

        if (!$hasFeesPaid) {
            return ['eligible' => false, 'reason' => 'Pending fee payment'];
        }

        // Check attendance
        $stmt = $this->db->prepare(
            "SELECT 
                COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END) / COUNT(*) * 100 as attendance_pct
             FROM attendance WHERE student_id = ?"
        );
        $stmt->execute([$studentId]);
        $attendance = $stmt->fetch();

        if ($attendance && $attendance['attendance_pct'] < 75) {
            return ['eligible' => false, 'reason' => 'Attendance below 75%'];
        }

        // Generate hall ticket
        $hallTicketNumber = 'ADIT' . date('Y') . str_pad($studentId, 4, '0', STR_PAD_LEFT);
        
        $stmt = $this->db->prepare(
            "INSERT INTO hall_tickets (student_id, semester_id, hall_ticket_number, generated_at) 
             VALUES (?, ?, ?, NOW())"
        );
        $stmt->execute([$studentId, $semesterId, $hallTicketNumber]);

        return [
            'eligible' => true,
            'hall_ticket_number' => $hallTicketNumber,
            'student_id' => $studentId,
            'semester_id' => $semesterId
        ];
    }
}
