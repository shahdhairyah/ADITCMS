<?php
/**
 * ADIT CMS - Department Model
 */

class Department extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function findById($id) {
        $stmt = $this->db->prepare(
            "SELECT d.*, CONCAT(f.first_name, ' ', f.last_name) as hod_name 
             FROM departments d 
             LEFT JOIN faculty f ON d.hod_id = f.id 
             WHERE d.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getAll() {
        $stmt = $this->db->prepare(
            "SELECT d.*, CONCAT(f.first_name, ' ', f.last_name) as hod_name 
             FROM departments d 
             LEFT JOIN faculty f ON d.hod_id = f.id 
             ORDER BY d.name"
        );
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO departments (name, code, hod_id, description) VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['name'], $data['code'],
            $data['hod_id'] ?? null, $data['description'] ?? null
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['name', 'code', 'hod_id', 'description'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE departments SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM departments WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
