<?php
/**
 * -- TABLE: material_downloads
 * CREATE TABLE IF NOT EXISTS material_downloads (
 *     id INT AUTO_INCREMENT PRIMARY KEY,
 *     material_id INT NOT NULL,
 *     user_id INT NOT NULL,
 *     downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 *     FOREIGN KEY (material_id) REFERENCES study_materials(id) ON DELETE CASCADE
 * );
 */

class StudyMaterial extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getById($id) {
        $stmt = $this->db->prepare(
            "SELECT sm.*, s.name AS subject_name, s.code AS subject_code,
                    s.department_id AS department_id,
                    d.name AS department_name,
                    CONCAT(f.first_name, ' ', f.last_name) AS faculty_name
             FROM study_materials sm
             LEFT JOIN subjects    s ON sm.subject_id = s.id
             LEFT JOIN departments d ON s.department_id = d.id
             LEFT JOIN faculty     f ON sm.faculty_id = f.id
             WHERE sm.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getAll($filters = []) {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['subject_id'])) {
            $where[] = 'sm.subject_id = ?';
            $params[] = $filters['subject_id'];
        }
        if (!empty($filters['faculty_id'])) {
            $where[] = 'sm.faculty_id = ?';
            $params[] = $filters['faculty_id'];
        }
        // Scopes a student's (or a department's) material list to the
        // subject's own department, which lives on the subjects table.
        if (!empty($filters['department_id'])) {
            $where[] = 's.department_id = ?';
            $params[] = $filters['department_id'];
        }
        // Restricts to one semester, e.g. for a student's own semester.
        if (!empty($filters['semester'])) {
            $where[] = 's.semester = ?';
            $params[] = $filters['semester'];
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT sm.*, s.name as subject_name, s.code as subject_code,
                    s.department_id AS department_id, s.semester AS semester,
                    d.name as department_name,
                    CONCAT(f.first_name, ' ', f.last_name) as faculty_name
             FROM study_materials sm 
             LEFT JOIN subjects s ON sm.subject_id = s.id 
             LEFT JOIN departments d ON s.department_id = d.id
             LEFT JOIN faculty f ON sm.faculty_id = f.id 
             WHERE {$whereClause} 
             ORDER BY sm.created_at DESC"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO study_materials (title, description, subject_id, faculty_id, file_path, file_type, topic) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['title'],
            $data['description'] ?? null,
            $data['subject_id'],
            $data['faculty_id'],
            $data['file_path'] ?? null,
            $data['file_type'] ?? 'pdf',
            $data['topic'] ?? null
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['title', 'description', 'subject_id', 'file_path', 'file_type', 'topic'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE study_materials SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM study_materials WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function recordDownload($materialId, $userId) {
        $stmt = $this->db->prepare(
            "INSERT INTO material_downloads (material_id, user_id, downloaded_at) VALUES (?, ?, NOW())"
        );
        return $stmt->execute([$materialId, $userId]);
    }

    public function getDownloadCount($materialId) {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) as count FROM material_downloads WHERE material_id = ?"
        );
        $stmt->execute([$materialId]);
        return (int)$stmt->fetch()['count'];
    }
}
