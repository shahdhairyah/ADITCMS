<?php

class Subject extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function findById($id) {
        $stmt = $this->db->prepare(
            "SELECT s.*, d.name as department_name,
                    sem.semester_number,
                    CONCAT(f.first_name, ' ', f.last_name) as faculty_name
             FROM subjects s 
             LEFT JOIN departments d ON s.department_id = d.id 
             LEFT JOIN semesters sem ON s.semester_id = sem.id
             LEFT JOIN faculty f ON s.faculty_id = f.id 
             WHERE s.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    /** Department that owns a subject, or null. */
    public function getDepartmentId($subjectId) {
        $stmt = $this->db->prepare("SELECT department_id FROM subjects WHERE id = ? LIMIT 1");
        $stmt->execute([$subjectId]);
        $row = $stmt->fetch();
        return $row && $row['department_id'] !== null ? (int) $row['department_id'] : null;
    }

    /**
     * Assign a teacher, refusing cross-department pairings.
     * Returns false when the teacher or the subject is missing, or when the
     * two belong to different departments.
     */
    public function assignFaculty($id, $facultyId) {
        $stmt = $this->db->prepare(
            "SELECT sub.department_id AS subject_dept, f.department_id AS faculty_dept
             FROM subjects sub
             LEFT JOIN faculty f ON f.id = ?
             WHERE sub.id = ?"
        );
        $stmt->execute([$facultyId, $id]);
        $row = $stmt->fetch();
        if (!$row) {
            return false;
        }
        if ($row['faculty_dept'] === null) {
            error_log("ADIT CMS: assignFaculty - faculty $facultyId does not exist");
            return false;
        }
        if ((int) $row['subject_dept'] !== (int) $row['faculty_dept']) {
            error_log("ADIT CMS: assignFaculty - rejected cross-department pairing "
                . "subject $id (dept {$row['subject_dept']}) / faculty $facultyId (dept {$row['faculty_dept']})");
            return false;
        }

        $update = $this->db->prepare("UPDATE subjects SET faculty_id = ? WHERE id = ?");
        return $update->execute([$facultyId, $id]);
    }

    /** Unassign whichever teacher currently owns a subject. */
    public function clearFaculty($id) {
        $stmt = $this->db->prepare("UPDATE subjects SET faculty_id = NULL WHERE id = ?");
        return $stmt->execute([(int) $id]);
    }

    public function getAll($filters = []) {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['department_id'])) {
            $where[] = 's.department_id = ?';
            $params[] = $filters['department_id'];
        }
        if (!empty($filters['semester'])) {
            $where[] = 's.semester_id = ?';
            $params[] = $filters['semester'];
        }
        if (!empty($filters['faculty_id'])) {
            $where[] = 's.faculty_id = ?';
            $params[] = $filters['faculty_id'];
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT s.*, d.name as department_name,
                    CONCAT(f.first_name, ' ', f.last_name) as faculty_name
             FROM subjects s 
             LEFT JOIN departments d ON s.department_id = d.id 
             LEFT JOIN faculty f ON s.faculty_id = f.id 
             WHERE {$whereClause} 
             ORDER BY s.name"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO subjects (name, code, semester_id, department_id, faculty_id, credits, type) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['name'], $data['code'],
            $data['semester_id'], $data['department_id'],
            $data['faculty_id'] ?? null, $data['credits'] ?? 3,
            $data['type'] ?? 'theory'
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        $allowed = ['name', 'code', 'semester_id', 'faculty_id', 'credits', 'type'];
        foreach ($data as $key => $value) {
            if (in_array($key, $allowed)) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        if (empty($fields)) return false;
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE subjects SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM subjects WHERE id = ?");
        return $stmt->execute([$id]);
    }
}