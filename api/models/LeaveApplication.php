<?php

class LeaveApplication extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getById($id) {
        $stmt = $this->db->prepare(
            "SELECT la.*, 
                    s.first_name, s.last_name, s.roll_number, s.user_id as student_user_id,
                    u.email as student_email,
                    COALESCE(CONCAT(ff.first_name, ' ', ff.last_name), fu.email) as faculty_reviewer_name,
                    COALESCE(CONCAT(fh.first_name, ' ', fh.last_name), hu.email) as hod_reviewer_name
             FROM leave_applications la 
             JOIN students s ON la.student_id = s.id 
             JOIN users u ON s.user_id = u.id
             LEFT JOIN faculty ff ON la.faculty_reviewed_by = ff.id 
             LEFT JOIN faculty fh ON la.hod_reviewed_by = fh.id 
             LEFT JOIN users   fu ON la.faculty_reviewed_by_user = fu.id 
             LEFT JOIN users   hu ON la.hod_reviewed_by_user = hu.id 
             WHERE la.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getAll($filters = []) {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['student_id'])) {
            $where[] = 'la.student_id = ?';
            $params[] = $filters['student_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = 'la.status = ?';
            $params[] = $filters['status'];
        }
        // Department scoping for teachers/HODs, applied in SQL rather than by
        // loading every row and filtering in PHP.
        if (isset($filters['department_id']) && $filters['department_id'] !== null) {
            $where[] = 's.department_id = ?';
            $params[] = $filters['department_id'];
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT la.*, s.first_name, s.last_name, s.roll_number, s.department_id,
                    u.email as student_email,
                    COALESCE(CONCAT(ff.first_name, ' ', ff.last_name), fu.email) as faculty_reviewer_name,
                    COALESCE(CONCAT(fh.first_name, ' ', fh.last_name), hu.email) as hod_reviewer_name
             FROM leave_applications la
             JOIN students s ON la.student_id = s.id
             JOIN users u ON s.user_id = u.id
             LEFT JOIN faculty ff ON la.faculty_reviewed_by = ff.id
             LEFT JOIN faculty fh ON la.hod_reviewed_by = fh.id
             LEFT JOIN users   fu ON la.faculty_reviewed_by_user = fu.id
             LEFT JOIN users   hu ON la.hod_reviewed_by_user = hu.id
             WHERE {$whereClause}
             ORDER BY la.created_at DESC"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO leave_applications (student_id, leave_type, from_date, to_date, reason, document_path) 
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['student_id'],
            $data['leave_type'],
            $data['from_date'],
            $data['to_date'],
            $data['reason'],
            $data['document_path'] ?? null
        ]);
        return $this->db->lastInsertId();
    }

    /**
     * Withdraw, restricted to the owner while still pending.
     * @param int      $studentId Owner, re-checked in SQL to avoid a TOCTOU race.
     * @return bool    True only if a row was actually withdrawn.
     */
    public function withdraw($id, $studentId = null) {
        if ($studentId === null) {
            $stmt = $this->db->prepare(
                "UPDATE leave_applications SET status = 'withdrawn'
                 WHERE id = ? AND status = 'pending'"
            );
            $stmt->execute([$id]);
        } else {
            $stmt = $this->db->prepare(
                "UPDATE leave_applications SET status = 'withdrawn'
                 WHERE id = ? AND student_id = ? AND status = 'pending'"
            );
            $stmt->execute([$id, $studentId]);
        }
        return $stmt->rowCount() > 0;
    }

    public function getByStudent($studentId) {
        $stmt = $this->db->prepare(
            "SELECT la.*, s.first_name, s.last_name, s.roll_number,
                    u.email as student_email,
                    COALESCE(CONCAT(ff.first_name, ' ', ff.last_name), fu.email) as faculty_reviewer_name,
                    COALESCE(CONCAT(fh.first_name, ' ', fh.last_name), hu.email) as hod_reviewer_name
             FROM leave_applications la 
             JOIN students s ON la.student_id = s.id 
             JOIN users u ON s.user_id = u.id
             LEFT JOIN faculty ff ON la.faculty_reviewed_by = ff.id 
             LEFT JOIN faculty fh ON la.hod_reviewed_by = fh.id 
             LEFT JOIN users   fu ON la.faculty_reviewed_by_user = fu.id 
             LEFT JOIN users   hu ON la.hod_reviewed_by_user = hu.id 
             WHERE la.student_id = ?
             ORDER BY la.created_at DESC"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetchAll();
    }

    /**
     * Both reviewers return rowCount() > 0 rather than execute(), which is
     * true even when the status guard matched nothing. Without this the
     * controller always reported success for an already-reviewed leave.
     *
     * The *_reviewed_by columns are FKs to faculty(id), so an admin decision
     * could not be attributed to anybody. The *_reviewed_by_user columns are
     * FKs to users(id) and are written for every decision, which is what the
     * read queries fall back to when resolving the reviewer's name.
     */
    public function facultyReview($id, $facultyId, $action, $comments = null, $reviewerUserId = null) {
        $status = ($action === 'forward') ? 'forwarded' : 'rejected';
        $stmt = $this->db->prepare(
            "UPDATE leave_applications
             SET status = ?, faculty_reviewed_by = ?, faculty_reviewed_by_user = ?,
                 faculty_reviewed_at = NOW(), faculty_comments = ?
             WHERE id = ? AND status = 'pending'"
        );
        $stmt->execute([$status, $facultyId, $reviewerUserId, $comments, $id]);
        return $stmt->rowCount() > 0;
    }

    public function hodReview($id, $hodId, $action, $comments = null, $reviewerUserId = null) {
        $status = ($action === 'approve') ? 'approved' : 'rejected';
        $stmt = $this->db->prepare(
            "UPDATE leave_applications
             SET status = ?, hod_reviewed_by = ?, hod_reviewed_by_user = ?,
                 hod_reviewed_at = NOW(), hod_comments = ?
             WHERE id = ? AND status = 'forwarded'"
        );
        $stmt->execute([$status, $hodId, $reviewerUserId, $comments, $id]);
        return $stmt->rowCount() > 0;
    }
}
