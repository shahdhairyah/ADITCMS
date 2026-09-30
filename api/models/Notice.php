<?php
/**
 * ADIT CMS - Notice Model
 */

class Notice extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getById($id) {
        $stmt = $this->db->prepare(
            "SELECT n.*, CONCAT(u.email) as created_by_email
             FROM notices n 
             LEFT JOIN users u ON n.created_by = u.id 
             WHERE n.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getAll($filters = []) {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['type'])) {
            $where[] = 'n.type = ?';
            $params[] = $filters['type'];
        }
        if (!empty($filters['department_id'])) {
            $where[] = '(n.department_id = ? OR n.department_id IS NULL)';
            $params[] = $filters['department_id'];
        }
        if (!empty($filters['target_audience'])) {
            $where[] = '(n.target_audience = ? OR n.target_audience = \"all\")';
            $params[] = $filters['target_audience'];
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT n.*, d.name as department_name 
             FROM notices n 
             LEFT JOIN departments d ON n.department_id = d.id 
             WHERE {$whereClause} 
             ORDER BY n.published_at DESC"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO notices (title, content, type, department_id, target_audience, created_by, published_at, attachments) 
             VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)"
        );
        $stmt->execute([
            $data['title'], $data['content'],
            $data['type'] ?? 'college',
            $data['department_id'] ?? null,
            $data['target_audience'] ?? 'all',
            $data['created_by'],
            $data['attachments'] ?? null
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['title', 'content', 'type', 'department_id', 'target_audience', 'attachments'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE notices SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM notices WHERE id = ?");
        return $stmt->execute([$id]);
    }
}
