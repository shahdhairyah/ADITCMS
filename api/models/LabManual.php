<?php

class LabManual extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getById($id) {
        $stmt = $this->db->prepare(
            "SELECT lm.*, s.name as subject_name, s.code as subject_code,
                    CONCAT(f.first_name, ' ', f.last_name) as faculty_name
             FROM lab_manuals lm 
             LEFT JOIN subjects s ON lm.subject_id = s.id 
             LEFT JOIN faculty f ON lm.faculty_id = f.id 
             WHERE lm.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getAll($filters = []) {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['subject_id'])) {
            $where[] = 'lm.subject_id = ?';
            $params[] = $filters['subject_id'];
        }
        if (!empty($filters['faculty_id'])) {
            $where[] = 'lm.faculty_id = ?';
            $params[] = $filters['faculty_id'];
        }
        // Students may only see manuals for their enrolled subjects; an HOD
        // only for their department. Every filter here is optional, so with
        // none applied the list was the whole college.
        if (!empty($filters['subject_ids']) && is_array($filters['subject_ids'])) {
            $ids = array_values(array_filter(array_map('intval', $filters['subject_ids'])));
            if (!$ids) {
                return [];
            }
            $where[] = 'lm.subject_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')';
            $params = array_merge($params, $ids);
        }
        if (!empty($filters['department_id'])) {
            $where[] = 's.department_id = ?';
            $params[] = $filters['department_id'];
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT lm.*, s.name as subject_name, s.code as subject_code,
                    CONCAT(f.first_name, ' ', f.last_name) as faculty_name
             FROM lab_manuals lm 
             LEFT JOIN subjects s ON lm.subject_id = s.id 
             LEFT JOIN faculty f ON lm.faculty_id = f.id 
             WHERE {$whereClause} 
             ORDER BY lm.experiment_number ASC"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO lab_manuals (title, subject_id, experiment_number, description, faculty_id) 
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['title'],
            $data['subject_id'],
            $data['experiment_number'] ?? null,
            $data['description'] ?? null,
            $data['faculty_id']
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['title', 'subject_id', 'experiment_number', 'description'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE lab_manuals SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM lab_manuals WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getSubmissions($labManualId) {
        $stmt = $this->db->prepare(
            "SELECT ls.*, s.first_name, s.last_name, s.roll_number
             FROM lab_submissions ls 
             JOIN students s ON ls.student_id = s.id 
             WHERE ls.lab_manual_id = ? 
             ORDER BY ls.submitted_at DESC"
        );
        $stmt->execute([$labManualId]);
        return $stmt->fetchAll();
    }

    /**
     * Insert or refresh a lab submission.
     * As with assignments, ON DUPLICATE KEY UPDATE leaves lastInsertId() at 0,
     * so the existing row is looked up and its real id returned.
     *
     * @return int lab_submissions id
     */
    public function submitLab($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO lab_submissions (lab_manual_id, student_id, file_path, submitted_at)
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE file_path = VALUES(file_path), submitted_at = NOW(), status = 'pending', marks = NULL, feedback = NULL"
        );
        $stmt->execute([
            $data['lab_manual_id'],
            $data['student_id'],
            $data['file_path'] ?? null
        ]);

        $id = (int) $this->db->lastInsertId();
        if ($id > 0) {
            return $id;
        }

        $find = $this->db->prepare(
            "SELECT id FROM lab_submissions WHERE lab_manual_id = ? AND student_id = ? LIMIT 1"
        );
        $find->execute([$data['lab_manual_id'], $data['student_id']]);
        $row = $find->fetch();
        return $row ? (int) $row['id'] : 0;
    }

    public function getSubmissionById($id) {
        $stmt = $this->db->prepare(
            "SELECT ls.*, lm.subject_id, lm.faculty_id
               FROM lab_submissions ls
               INNER JOIN lab_manuals lm ON lm.id = ls.lab_manual_id
              WHERE ls.id = ? LIMIT 1"
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
            "UPDATE lab_submissions SET " . implode(', ', $set) . " WHERE id = ?"
        );
        return $stmt->execute($params);
    }

    public function getStudentSubmissions($studentId) {
        $stmt = $this->db->prepare(
            "SELECT ls.*, lm.title as lab_title, lm.experiment_number, s.name as subject_name
             FROM lab_submissions ls 
             JOIN lab_manuals lm ON ls.lab_manual_id = lm.id 
             JOIN subjects s ON lm.subject_id = s.id 
             WHERE ls.student_id = ? 
             ORDER BY ls.submitted_at DESC"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetchAll();
    }
}
