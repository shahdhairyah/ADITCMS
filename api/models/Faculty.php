<?php
/**
 * ADIT CMS - Faculty Model
 */

class Faculty extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    /**
     * Resolve a users.id to faculty.id.
     *
     * Columns such as attendance.marked_by, submissions.reviewed_by,
     * unit_tests.entered_by and syllabus.uploaded_by declare
     * "FOREIGN KEY ... REFERENCES faculty(id)", but the JWT carries a
     * users.id. Writing the user id straight into those columns either fails
     * the FK or, worse, silently records the wrong teacher once the two
     * counters drift. Every controller that fills one of those columns must
     * go through this method.
     *
     * @return int|null faculty.id, or null if the user has no faculty profile.
     */
    public static function facultyIdForUser(?int $userId): ?int {
        if (!$userId || $userId < 1) {
            return null;
        }
        static $cache = [];
        if (array_key_exists($userId, $cache)) {
            return $cache[$userId];
        }
        try {
            $db   = Database::getInstance()->getConnection();
            $stmt = $db->prepare("SELECT id FROM faculty WHERE user_id = ? LIMIT 1");
            $stmt->execute([$userId]);
            $row = $stmt->fetch();
            $cache[$userId] = $row ? (int) $row['id'] : null;
        } catch (Throwable $e) {
            error_log('ADIT CMS: facultyIdForUser failed: ' . $e->getMessage());
            $cache[$userId] = null;
        }
        return $cache[$userId];
    }

    /**
     * Same as facultyIdForUser() but never null - responds 403 instead, which
     * is what an endpoint restricted to faculty should do when the caller has
     * no faculty record.
     */
    public static function requireFacultyIdForUser(?int $userId): int {
        $facultyId = self::facultyIdForUser($userId);
        if ($facultyId === null) {
            Response::forbidden('No faculty profile is linked to this account');
        }
        return $facultyId;
    }

    public function findByUserId($userId) {
        $stmt = $this->db->prepare(
            "SELECT f.*, d.name as department_name, d.code as department_code 
             FROM faculty f 
             LEFT JOIN departments d ON f.department_id = d.id 
             WHERE f.user_id = ?"
        );
        $stmt->execute([$userId]);
        return $stmt->fetch();
    }

    public function findById($id) {
        $stmt = $this->db->prepare(
            "SELECT f.*, d.name as department_name, d.code as department_code 
             FROM faculty f 
             LEFT JOIN departments d ON f.department_id = d.id 
             WHERE f.id = ?"
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO faculty (user_id, employee_id, first_name, last_name, qualification, experience_years, department_id, designation, phone) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['user_id'], $data['employee_id'], $data['first_name'], $data['last_name'],
            $data['qualification'] ?? null, $data['experience_years'] ?? 0,
            $data['department_id'] ?? null, $data['designation'] ?? null, $data['phone'] ?? null
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['first_name', 'last_name', 'qualification', 'experience_years', 'designation', 'phone', 'photo'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE faculty SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function getAll($page = 1, $pageSize = 20, $filters = []) {
        $offset = Validation::offset((int) $page, (int) $pageSize);
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['department_id'])) {
            $where[] = 'f.department_id = ?';
            $params[] = $filters['department_id'];
        }
        if (!empty($filters['search'])) {
            $where[] = "(f.first_name LIKE ? OR f.last_name LIKE ? OR f.employee_id LIKE ?)";
            $search = "%{$filters['search']}%";
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }

        $whereClause = implode(' AND ', $where);

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM faculty f WHERE {$whereClause}");
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        $params[] = $pageSize;
        $params[] = $offset;

        $stmt = $this->db->prepare(
            "SELECT f.*, d.name as department_name, d.code as department_code 
             FROM faculty f 
             LEFT JOIN departments d ON f.department_id = d.id 
             WHERE {$whereClause} 
             ORDER BY f.first_name ASC 
             LIMIT ? OFFSET ?"
        );
        $stmt->execute($params);
        
        return ['data' => $stmt->fetchAll(), 'total' => $total];
    }

    public function count() {
        $stmt = $this->db->prepare("SELECT COUNT(*) FROM faculty");
        $stmt->execute();
        return $stmt->fetchColumn();
    }

    public function getByDepartment($departmentId) {
        $stmt = $this->db->prepare(
            "SELECT f.* FROM faculty f WHERE f.department_id = ? ORDER BY f.first_name"
        );
        $stmt->execute([$departmentId]);
        return $stmt->fetchAll();
    }

    /**
     * Subjects taught by a faculty member.
     * semesters has no `name` column - it is keyed by semester_number,
     * so the label is built from the course code and the number.
     */
    /**
     * Department that owns a faculty row, or null.
     * Used to reject cross-department assignments.
     */
    public function getDepartmentFor($facultyId) {
        $stmt = $this->db->prepare("SELECT department_id FROM faculty WHERE id = ? LIMIT 1");
        $stmt->execute([(int) $facultyId]);
        $row = $stmt->fetch();
        return $row && $row['department_id'] !== null ? (int) $row['department_id'] : null;
    }

    public function getSubjects($facultyId) {
        $stmt = $this->db->prepare(
            "SELECT s.id, s.name, s.code, s.semester_id,
                    sem.semester_number,
                    COALESCE(cc.code, '') AS course_code,
                    CONCAT('Semester ', sem.semester_number) AS semester_name,
                    s.type, s.credits, s.department_id, d.name AS department_name
             FROM subjects s
             LEFT JOIN semesters sem ON s.semester_id = sem.id
             LEFT JOIN courses   cc  ON sem.course_id = cc.id
             LEFT JOIN departments d ON s.department_id = d.id
             WHERE s.faculty_id = ?
             ORDER BY sem.semester_number, s.name"
        );
        $stmt->execute([$facultyId]);
        return $stmt->fetchAll();
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM faculty WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getAssignedClasses($facultyId) {
        $stmt = $this->db->prepare(
            "SELECT DISTINCT
                s.id AS subject_id, s.name AS subject_name, s.code AS subject_code,
                s.credits, s.type,
                sem.semester_number,
                COALESCE(cc.code, '') AS course_code,
                CONCAT('Semester ', sem.semester_number) AS semester_name,
                d.name AS department_name
             FROM subjects s
             LEFT JOIN semesters sem ON s.semester_id = sem.id
             LEFT JOIN courses   cc  ON sem.course_id = cc.id
             LEFT JOIN departments d ON s.department_id = d.id
             WHERE s.faculty_id = ?
             ORDER BY sem.semester_number, s.name"
        );
        $stmt->execute([$facultyId]);
        return $stmt->fetchAll();
    }
}
