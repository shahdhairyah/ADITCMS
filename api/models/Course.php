<?php

class Course extends Database {

    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getAll($departmentId = null) {
        $where = '1=1';
        $params = [];
        if ($departmentId) {
            $where = 'department_id = ?';
            $params[] = $departmentId;
        }
        $stmt = $this->db->prepare(
            "SELECT c.*, d.name as department_name
             FROM courses c
             LEFT JOIN departments d ON c.department_id = d.id
             WHERE {$where}
             ORDER BY c.name"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById($id) {
        $stmt = $this->db->prepare(
            "SELECT c.*, d.name as department_name
             FROM courses c
             LEFT JOIN departments d ON c.department_id = d.id
             WHERE c.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO courses (name, code, department_id, duration_years, total_semesters)
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['name'], $data['code'], $data['department_id'],
            $data['duration_years'] ?? 4, $data['total_semesters'] ?? 8
        ]);
        return $this->db->lastInsertId();
    }
}