<?php
/**
 * ADIT CMS - Assignment Model
 */

class Assignment extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getById($id) {
        $stmt = $this->db->prepare(
            "SELECT a.*, s.name as subject_name, s.code as subject_code,
                    CONCAT(f.first_name, ' ', f.last_name) as faculty_name
             FROM assignments a 
             LEFT JOIN subjects s ON a.subject_id = s.id 
             LEFT JOIN faculty f ON a.faculty_id = f.id 
             WHERE a.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getAll($filters = []) {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['subject_id'])) {
            $where[] = 'a.subject_id = ?';
            $params[] = $filters['subject_id'];
        }
        if (!empty($filters['faculty_id'])) {
            $where[] = 'a.faculty_id = ?';
            $params[] = $filters['faculty_id'];
        }
        // Restrict to an explicit set of subjects. A student must only see
        // assignments for the subjects they are actually enrolled in, and the
        // model's filters are all optional, so an unset faculty_id previously
        // widened the list to the whole college.
        if (!empty($filters['subject_ids']) && is_array($filters['subject_ids'])) {
            $ids = array_values(array_filter(array_map('intval', $filters['subject_ids'])));
            if (!$ids) {
                return [];
            }
            $where[] = 'a.subject_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')';
            $params = array_merge($params, $ids);
        }
        if (!empty($filters['department_id'])) {
            $where[] = 's.department_id = ?';
            $params[] = $filters['department_id'];
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT a.*, s.name as subject_name, s.code as subject_code,
                    CONCAT(f.first_name, ' ', f.last_name) as faculty_name
             FROM assignments a 
             LEFT JOIN subjects s ON a.subject_id = s.id 
             LEFT JOIN faculty f ON a.faculty_id = f.id 
             WHERE {$whereClause} 
             ORDER BY a.created_at DESC"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Department that owns a subject, or null.
     * Used by controllers to scope an assignment to the HOD's department.
     */
    public function getDepartmentIdForSubject($subjectId) {
        $stmt = $this->db->prepare("SELECT department_id FROM subjects WHERE id = ? LIMIT 1");
        $stmt->execute([$subjectId]);
        $row = $stmt->fetch();
        return $row && $row['department_id'] !== null ? (int) $row['department_id'] : null;
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO assignments (title, description, subject_id, faculty_id, deadline, max_marks, attachments) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['title'], $data['description'] ?? null,
            $data['subject_id'], $data['faculty_id'],
            $data['deadline'], $data['max_marks'] ?? 100,
            $data['attachments'] ?? null
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['title', 'description', 'deadline', 'max_marks', 'attachments'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE assignments SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM assignments WHERE id = ?");
        return $stmt->execute([$id]);
    }

    // Submission methods

    /**
     * Insert or refresh a submission.
     *
     * ON DUPLICATE KEY UPDATE does not change lastInsertId(), so a resubmit
     * used to return 0 and the API replied {"id":0}. Look the existing row up
     * instead and return its real id either way.
     *
     * @return int submission id
     */
    public function submitAssignment($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO submissions (assignment_id, student_id, file_path, submitted_at)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE file_path = VALUES(file_path), submitted_at = NOW(), status = 'pending', marks = NULL, feedback = NULL"
        );
        $stmt->execute([
            $data['assignment_id'], $data['student_id'],
            $data['file_path'] ?? null
        ]);

        $id = (int) $this->db->lastInsertId();
        if ($id > 0) {
            return $id;
        }

        $find = $this->db->prepare(
            "SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ? LIMIT 1"
        );
        $find->execute([$data['assignment_id'], $data['student_id']]);
        $row = $find->fetch();
        return $row ? (int) $row['id'] : 0;
    }

    public function getSubmissions($assignmentId) {
        $stmt = $this->db->prepare(
            "SELECT sub.*, s.first_name, s.last_name, s.roll_number
             FROM submissions sub 
             JOIN students s ON sub.student_id = s.id 
             WHERE sub.assignment_id = ? 
             ORDER BY sub.submitted_at DESC"
        );
        $stmt->execute([$assignmentId]);
        return $stmt->fetchAll();
    }

    public function getSubmissionById($id) {
        $stmt = $this->db->prepare(
            "SELECT sub.*, a.subject_id, a.faculty_id
               FROM submissions sub
               INNER JOIN assignments a ON a.id = sub.assignment_id
              WHERE sub.id = ? LIMIT 1"
        );
        $stmt->execute([(int) $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function reviewSubmission($id, $data) {
        // reviewed_by is a FK to faculty(id), so an admin has no value for it.
        // Building the SET clause conditionally means an admin review no longer
        // clobbers an existing reviewer with NULL, and reviewed_by_user records
        // the actor for every role.
        $set = ['marks = ?', 'feedback = ?', 'status = ?'];
        $params = [$data['marks'], $data['feedback'] ?? null, $data['status']];

        if (array_key_exists('reviewed_by', $data)) {
            $set[] = 'reviewed_by = ?';
            $params[] = $data['reviewed_by'];
        }
        if (array_key_exists('reviewed_by_user', $data)) {
            $set[] = 'reviewed_by_user = ?';
            $params[] = $data['reviewed_by_user'];
        }

        $params[] = $id;
        $stmt = $this->db->prepare(
            "UPDATE submissions SET " . implode(', ', $set) . " WHERE id = ?"
        );
        return $stmt->execute($params);
    }

    public function getStudentSubmissions($studentId) {
        $stmt = $this->db->prepare(
            "SELECT sub.*, a.title as assignment_title, a.deadline, a.max_marks,
                    s.name as subject_name
             FROM submissions sub 
             JOIN assignments a ON sub.assignment_id = a.id 
             JOIN subjects s ON a.subject_id = s.id 
             WHERE sub.student_id = ? 
             ORDER BY sub.submitted_at DESC"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetchAll();
    }
}
