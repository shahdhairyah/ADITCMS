<?php

class Syllabus extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getById($id) {
        $stmt = $this->db->prepare(
            "SELECT sy.*, s.name as subject_name, s.code as subject_code,
                    CONCAT(f.first_name, ' ', f.last_name) as uploaded_by_name
             FROM syllabus sy 
             LEFT JOIN subjects s ON sy.subject_id = s.id 
             LEFT JOIN faculty f ON sy.uploaded_by = f.id 
             WHERE sy.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getAll($filters = []) {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['subject_id'])) {
            $where[] = 'sy.subject_id = ?';
            $params[] = $filters['subject_id'];
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT sy.*, s.name as subject_name, s.code as subject_code,
                    CONCAT(f.first_name, ' ', f.last_name) as uploaded_by_name
             FROM syllabus sy 
             LEFT JOIN subjects s ON sy.subject_id = s.id 
             LEFT JOIN faculty f ON sy.uploaded_by = f.id 
             WHERE {$whereClause} 
             ORDER BY sy.unit_number ASC"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO syllabus (subject_id, unit_number, unit_title, topics, status, uploaded_by, file_path) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['subject_id'],
            $data['unit_number'],
            $data['unit_title'],
            $data['topics'] ?? null,
            $data['status'] ?? 'not_started',
            $data['uploaded_by'] ?? null,
            $data['file_path'] ?? null
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['subject_id', 'unit_number', 'unit_title', 'topics', 'status', 'file_path'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE syllabus SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM syllabus WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getBySubject($subjectId) {
        $stmt = $this->db->prepare(
            "SELECT sy.*, s.name as subject_name, s.code as subject_code
             FROM syllabus sy 
             LEFT JOIN subjects s ON sy.subject_id = s.id 
             WHERE sy.subject_id = ? 
             ORDER BY sy.unit_number ASC"
        );
        $stmt->execute([$subjectId]);
        return $stmt->fetchAll();
    }
}
