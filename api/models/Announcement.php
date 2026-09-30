<?php
/**
 * -- TABLE: announcement_reads
 * CREATE TABLE IF NOT EXISTS announcement_reads (
 *     id INT AUTO_INCREMENT PRIMARY KEY,
 *     announcement_id INT NOT NULL,
 *     user_id INT NOT NULL,
 *     read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
 *     UNIQUE KEY unique_read (announcement_id, user_id),
 *     FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE
 * );
 */

class Announcement extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getById($id) {
        $stmt = $this->db->prepare(
            "SELECT a.*, s.name as subject_name,
                    CONCAT(f.first_name, ' ', f.last_name) as faculty_name
             FROM announcements a 
             LEFT JOIN subjects s ON a.subject_id = s.id 
             LEFT JOIN faculty f ON a.faculty_id = f.id 
             WHERE a.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function getAll($filters = [], $currentUserId = null) {
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

        $whereClause = implode(' AND ', $where);

        // announcement_reads is keyed on (announcement_id, user_id), so joining it
        // per viewer is what makes markRead() observable. Without this the client
        // cannot tell read from unread and every row looks unread.
        $readSelect = '0 as is_read';
        $readJoin = '';
        $readParam = [];
        if ($currentUserId !== null) {
            $readSelect = '(ar.user_id IS NOT NULL) as is_read';
            $readJoin = 'LEFT JOIN announcement_reads ar ON ar.announcement_id = a.id AND ar.user_id = ?';
            $readParam = [$currentUserId];
        }

        $stmt = $this->db->prepare(
            "SELECT a.*, s.name as subject_name,
                    CONCAT(f.first_name, ' ', f.last_name) as faculty_name,
                    {$readSelect}
             FROM announcements a 
             LEFT JOIN subjects s ON a.subject_id = s.id 
             LEFT JOIN faculty f ON a.faculty_id = f.id 
             {$readJoin}
             WHERE {$whereClause} 
             ORDER BY a.created_at DESC"
        );
        // The join parameter is bound first because it precedes the WHERE clause
        // in the final statement.
        $stmt->execute(array_merge($readParam, $params));
        return $stmt->fetchAll();
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO announcements (title, content, subject_id, faculty_id) 
             VALUES (?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['title'],
            $data['content'],
            $data['subject_id'] ?? null,
            $data['faculty_id']
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['title', 'content', 'subject_id'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE announcements SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM announcements WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function markAsRead($announcementId, $userId) {
        $stmt = $this->db->prepare(
            "INSERT INTO announcement_reads (announcement_id, user_id, read_at) VALUES (?, ?, NOW())
             ON DUPLICATE KEY UPDATE read_at = NOW()"
        );
        return $stmt->execute([$announcementId, $userId]);
    }

    public function getReadStatus($announcementId) {
        $stmt = $this->db->prepare(
            "SELECT COUNT(*) as total_reads FROM announcement_reads WHERE announcement_id = ?"
        );
        $stmt->execute([$announcementId]);
        $totalReads = (int)$stmt->fetch()['total_reads'];

        // users has no first_name/last_name - the display name lives on the
        // per-role profile tables, so resolve it with COALESCE per role.
        $stmt = $this->db->prepare(
            "SELECT ar.user_id, ar.read_at, u.email, u.role,
                    COALESCE(sd.first_name, fd.first_name, ld.first_name) AS first_name,
                    COALESCE(sd.last_name,  fd.last_name,  ld.last_name)  AS last_name
             FROM announcement_reads ar
             INNER JOIN users u ON ar.user_id = u.id
             LEFT JOIN students sd ON sd.user_id = u.id
             LEFT JOIN faculty  fd ON fd.user_id = u.id
             LEFT JOIN librarians ld ON ld.user_id = u.id
             WHERE ar.announcement_id = ?
             ORDER BY ar.read_at DESC"
        );
        $stmt->execute([$announcementId]);
        $readers = $stmt->fetchAll();

        return [
            'total_reads' => $totalReads,
            'readers' => $readers
        ];
    }
}
