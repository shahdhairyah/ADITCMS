<?php

class Classroom extends Database {

    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getAll($departmentId = null) {
        $where = '1=1';
        $params = [];
        if ($departmentId) {
            $where = 'c.department_id = ? OR c.department_id IS NULL';
            $params[] = $departmentId;
        }
        $stmt = $this->db->prepare(
            "SELECT c.*, d.name as department_name
             FROM classrooms c
             LEFT JOIN departments d ON c.department_id = d.id
             WHERE {$where}
             ORDER BY c.building, c.floor, c.name"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById($id) {
        $stmt = $this->db->prepare(
            "SELECT c.*, d.name as department_name
             FROM classrooms c
             LEFT JOIN departments d ON c.department_id = d.id
             WHERE c.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO classrooms (name, building, floor, capacity, type, department_id)
             VALUES (?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['name'], $data['building'] ?? null,
            $data['floor'] ?? null, $data['capacity'] ?? 60,
            $data['type'] ?? 'classroom', $data['department_id'] ?? null
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        $allowed = ['name', 'building', 'floor', 'capacity', 'type', 'department_id'];
        foreach ($data as $key => $value) {
            if (in_array($key, $allowed)) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        if (empty($fields)) return false;
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE classrooms SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM classrooms WHERE id = ?");
        return $stmt->execute([$id]);
    }
}