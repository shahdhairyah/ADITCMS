<?php
/**
 * ADIT CMS - User Model
 */

class User extends Database {
    
    private $db;
    private $flagColumn = null;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function findByEmail($email) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = ?");
        $stmt->execute([$email]);
        return $stmt->fetch();
    }

    public function findById($id) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function create($email, $password, $role) {
        $passwordHash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
        $stmt = $this->db->prepare(
            "INSERT INTO users (email, password_hash, role, status) VALUES (?, ?, ?, 'active')"
        );
        $stmt->execute([$email, $passwordHash, $role]);
        return $this->db->lastInsertId();
    }

    /**
     * Whether users.must_change_password exists. Cached per request so the
     * schema is probed once rather than on every password change.
     */
    private function hasPasswordFlagColumn() {
        if ($this->flagColumn === null) {
            $this->flagColumn = (int) $this->db->query(
                "SELECT COUNT(*) FROM information_schema.COLUMNS
                 WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users'
                   AND COLUMN_NAME = 'must_change_password'"
            )->fetchColumn() > 0;
        }
        return $this->flagColumn;
    }

    public function updatePassword($userId, $newPassword) {
        $passwordHash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
        // must_change_password is cleared here, not in the controller, so every
        // caller of updatePassword() releases the forced-change lock and not
        // just the change-password endpoint. The column is optional so that a
        // deployment which has not run database/migrate.php yet can still
        // change a password.
        if ($this->hasPasswordFlagColumn()) {
            $stmt = $this->db->prepare(
                "UPDATE users
                 SET password_hash = ?, must_change_password = 0, updated_at = NOW()
                 WHERE id = ?"
            );
        } else {
            $stmt = $this->db->prepare(
                "UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?"
            );
        }
        return $stmt->execute([$passwordHash, $userId]);
    }

    public function updateStatus($userId, $status) {
        $stmt = $this->db->prepare("UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?");
        return $stmt->execute([$status, $userId]);
    }

    public function verifyPassword($email, $password) {
        $user = $this->findByEmail($email);
        if (!$user) return null;
        
        if (password_verify($password, $user['password_hash'])) {
            return $user;
        }
        return null;
    }

    public function getAll($page = 1, $pageSize = 20, $role = null) {
        $offset = Validation::offset((int) $page, (int) $pageSize);
        $params = [];
        
        $where = '';
        if ($role) {
            $where = 'WHERE role = ?';
            $params[] = $role;
        }

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM users {$where}");
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        $params[] = $pageSize;
        $params[] = $offset;

        $stmt = $this->db->prepare(
            "SELECT id, email, role, status, created_at, updated_at FROM users {$where} ORDER BY created_at DESC LIMIT ? OFFSET ?"
        );
        $stmt->execute($params);
        
        return ['data' => $stmt->fetchAll(), 'total' => $total];
    }

    public function count($role = null) {
        if ($role) {
            $stmt = $this->db->prepare("SELECT COUNT(*) FROM users WHERE role = ?");
            $stmt->execute([$role]);
        } else {
            $stmt = $this->db->query("SELECT COUNT(*) FROM users");
            $stmt->execute();
        }
        return $stmt->fetchColumn();
    }

    // Password Reset Token methods
    public function createPasswordResetToken($userId) {
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $stmt = $this->db->prepare(
            "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)"
        );
        $stmt->execute([$userId, $token, $expiresAt]);

        return $token;
    }

    public function validatePasswordResetToken($token) {
        $stmt = $this->db->prepare(
            "SELECT pr.*, u.email, u.id as uid FROM password_resets pr 
             JOIN users u ON pr.user_id = u.id 
             WHERE pr.token = ? AND pr.expires_at > NOW() AND pr.used = 0"
        );
        $stmt->execute([$token]);
        return $stmt->fetch();
    }

    public function usePasswordResetToken($token) {
        $stmt = $this->db->prepare("UPDATE password_resets SET used = 1 WHERE token = ?");
        return $stmt->execute([$token]);
    }

    public function deleteExpiredTokens() {
        $stmt = $this->db->prepare("DELETE FROM password_resets WHERE expires_at < NOW() OR used = 1");
        return $stmt->execute();
    }

    // Email Verification Token methods
    public function createVerificationToken($userId) {
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

        $stmt = $this->db->prepare(
            "INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)"
        );
        $stmt->execute([$userId, $token, $expiresAt]);

        return $token;
    }

    public function validateVerificationToken($token) {
        $stmt = $this->db->prepare(
            "SELECT ev.*, u.id as uid FROM email_verifications ev 
             JOIN users u ON ev.user_id = u.id 
             WHERE ev.token = ? AND ev.expires_at > NOW() AND ev.verified = 0"
        );
        $stmt->execute([$token]);
        return $stmt->fetch();
    }

    public function useVerificationToken($token) {
        $stmt = $this->db->prepare("UPDATE email_verifications SET verified = 1 WHERE token = ?");
        return $stmt->execute([$token]);
    }
}
