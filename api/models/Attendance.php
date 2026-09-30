<?php
/**
 * ADIT CMS - Attendance Model
 */

class Attendance extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function mark($data) {
        // marked_by is a FOREIGN KEY to faculty(id); an admin has no faculty
        // row, so the key is absent and the column stays NULL.
        $stmt = $this->db->prepare(
            "INSERT INTO attendance (student_id, subject_id, date, status, marked_by)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by)"
        );
        $stmt->execute([
            $data['student_id'], $data['subject_id'], $data['date'],
            $data['status'], $data['marked_by'] ?? null
        ]);
        return true;
    }

    public function bulkMark($records) {
        $this->db->beginTransaction();
        try {
            foreach ($records as $record) {
                $this->mark($record);
            }
            $this->db->commit();
            return true;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function update($id, $data) {
        $stmt = $this->db->prepare(
            "UPDATE attendance SET status = ?, marked_by = ? WHERE id = ?"
        );
        return $stmt->execute([$data['status'], $data['marked_by'] ?? null, $id]);
    }

    public function getByStudent($studentId, $subjectId = null, $startDate = null, $endDate = null) {
        $where = ['a.student_id = ?'];
        $params = [$studentId];

        if ($subjectId) {
            $where[] = 'a.subject_id = ?';
            $params[] = $subjectId;
        }
        if ($startDate) {
            $where[] = 'a.date >= ?';
            $params[] = $startDate;
        }
        if ($endDate) {
            $where[] = 'a.date <= ?';
            $params[] = $endDate;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT a.*, s.name as subject_name, s.code as subject_code 
             FROM attendance a 
             LEFT JOIN subjects s ON a.subject_id = s.id 
             WHERE {$whereClause} 
             ORDER BY a.date DESC"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById($id) {
        $stmt = $this->db->prepare("SELECT * FROM attendance WHERE id = ? LIMIT 1");
        $stmt->execute([(int) $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * The class roster for a subject, with whatever status is already
     * recorded on $date.
     *
     * getBySubject() below only returns students who already have a row for
     * that date, so a brand-new day came back empty and the teacher saw an
     * empty class. This joins students -> subject so the full roster is
     * always returned, left-joined to the day's attendance.
     *
     * Enrolment is implied by the subject's (department_id, semester) since
     * there is no enrollments table.
     */
    public function getRosterForSubject($subjectId, $date) {
        $stmt = $this->db->prepare(
            "SELECT st.id AS student_id, st.first_name, st.last_name, st.roll_number,
                    st.department_id, st.semester,
                    a.id AS attendance_id, a.status, a.marked_by, a.date
             FROM subjects sub
             INNER JOIN students st
                 ON st.department_id = sub.department_id
                AND st.semester      = (SELECT sem.semester_number
                                         FROM semesters sem
                                         WHERE sem.id = sub.semester_id)
             LEFT JOIN attendance a
                 ON a.student_id = st.id
                AND a.subject_id = sub.id
                AND a.date = ?
             WHERE sub.id = ?
             ORDER BY st.roll_number"
        );
        $stmt->execute([$date, (int) $subjectId]);
        return $stmt->fetchAll();
    }

    public function getBySubject($subjectId, $date) {
        $stmt = $this->db->prepare(
            "SELECT a.*, st.first_name, st.last_name, st.roll_number 
             FROM attendance a 
             JOIN students st ON a.student_id = st.id 
             WHERE a.subject_id = ? AND a.date = ? 
             ORDER BY st.roll_number"
        );
        $stmt->execute([$subjectId, $date]);
        return $stmt->fetchAll();
    }

    public function getSummary($studentId) {
        $stmt = $this->db->prepare(
            "SELECT 
                s.id as subject_id, s.name as subject_name, s.code as subject_code,
                COUNT(a.id) as total_classes,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
                ROUND(SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) / COUNT(a.id) * 100, 1) as percentage
             FROM subjects s 
             LEFT JOIN attendance a ON s.id = a.subject_id AND a.student_id = ?
             GROUP BY s.id"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetchAll();
    }

    public function getStudentSummary($studentId) {
        $stmt = $this->db->prepare(
            "SELECT 
                COUNT(a.id) as total_classes,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
                ROUND(SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) / COUNT(a.id) * 100, 1) as percentage
             FROM attendance a
             WHERE a.student_id = ?"
        );
        $stmt->execute([$studentId]);
        $result = $stmt->fetch();
        return $result ?: ['total_classes' => 0, 'present' => 0, 'absent' => 0, 'late' => 0, 'percentage' => 0];
    }

    public function getStudentCalendar($studentId, $month, $year) {
        $startDate = "{$year}-{$month}-01";
        $endDate = date('Y-m-t', strtotime($startDate));

        $stmt = $this->db->prepare(
            "SELECT DISTINCT a.date, a.status
             FROM attendance a
             WHERE a.student_id = ? AND a.date BETWEEN ? AND ?
             ORDER BY a.date ASC"
        );
        $stmt->execute([$studentId, $startDate, $endDate]);
        return $stmt->fetchAll();
    }

    public function getSubjectWiseStats($studentId) {
        $stmt = $this->db->prepare(
            "SELECT 
                s.id as subject_id, s.name as subject_name, s.code as subject_code,
                COUNT(a.id) as total_classes,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
                ROUND(SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) / COUNT(a.id) * 100, 1) as percentage
             FROM subjects s 
             LEFT JOIN attendance a ON s.id = a.subject_id AND a.student_id = ?
             GROUP BY s.id"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetchAll();
    }

    public function getMonthlyStats($studentId, $year) {
        $stmt = $this->db->prepare(
            "SELECT 
                MONTH(a.date) as month,
                COUNT(a.id) as total_classes,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
                ROUND(SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) / COUNT(a.id) * 100, 1) as percentage
             FROM attendance a
             WHERE a.student_id = ? AND YEAR(a.date) = ?
             GROUP BY MONTH(a.date)
             ORDER BY MONTH(a.date)"
        );
        $stmt->execute([$studentId, $year]);
        return $stmt->fetchAll();
    }

    public function getReport($subjectId, $startDate, $endDate) {
        // Scoped to the subject's own department and semester. The previous
        // version started "FROM students st" with no filter, so a teacher
        // asking for a report on one subject got every student in the
        // college, including other departments, as zero-attendance rows.
        $stmt = $this->db->prepare(
            "SELECT
                st.id as student_id, st.first_name, st.last_name, st.roll_number,
                COUNT(a.id) as total_classes,
                SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
                SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
                SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
                CASE WHEN COUNT(a.id) = 0 THEN 0
                     ELSE ROUND(SUM(CASE WHEN a.status IN ('present', 'late') THEN 1 ELSE 0 END) / COUNT(a.id) * 100, 1)
                END as percentage
             FROM subjects sub
             INNER JOIN students st
                 ON st.department_id = sub.department_id
                AND st.semester      = (SELECT sem.semester_number
                                         FROM semesters sem
                                         WHERE sem.id = sub.semester_id)
             LEFT JOIN attendance a
                 ON st.id = a.student_id
                AND a.subject_id = sub.id
                AND a.date BETWEEN ? AND ?
             WHERE sub.id = ?
             GROUP BY st.id
             ORDER BY st.roll_number"
        );
        $stmt->execute([$startDate, $endDate, (int) $subjectId]);
        return $stmt->fetchAll();
    }
}
