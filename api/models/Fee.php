<?php
/**
 * ADIT CMS - Fee Model
 */

class Fee extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getStructure($courseId = null, $semester = null) {
        $where = ['1=1'];
        $params = [];

        if ($courseId) {
            $where[] = 'fs.course_id = ?';
            $params[] = $courseId;
        }
        if ($semester) {
            $where[] = 'fs.semester = ?';
            $params[] = $semester;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT fs.*, c.name as course_name 
             FROM fee_structures fs 
             LEFT JOIN courses c ON fs.course_id = c.id 
             WHERE {$whereClause} 
             ORDER BY fs.semester, fs.fee_type"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function createStructure($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO fee_structures (course_id, semester, fee_type, amount, due_date) 
             VALUES (?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['course_id'], $data['semester'],
            $data['fee_type'], $data['amount'], $data['due_date'] ?? null
        ]);
        return $this->db->lastInsertId();
    }

    public function createPayment($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO fee_payments (student_id, fee_structure_id, amount, payment_method, razorpay_order_id, razorpay_payment_id, status, paid_at) 
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"
        );
        $stmt->execute([
            $data['student_id'], $data['fee_structure_id'],
            $data['amount'], $data['payment_method'] ?? 'razorpay',
            $data['razorpay_order_id'] ?? null, $data['razorpay_payment_id'] ?? null,
            $data['status'] ?? 'completed'
        ]);
        return $this->db->lastInsertId();
    }

    public function updatePaymentStatus($orderId, $status, $paymentId = null, $studentId = null) {
        // $studentId scopes the write to the order's owner. Without it any
        // authenticated user could flip somebody else's pending order to
        // completed/failed by guessing an order id.
        if ($studentId !== null) {
            $stmt = $this->db->prepare(
                "UPDATE fee_payments
                    SET status = ?, razorpay_payment_id = ?
                  WHERE razorpay_order_id = ?
                    AND student_id = (SELECT id FROM students WHERE user_id = ?)"
            );
            return $stmt->execute([$status, $paymentId, $orderId, $studentId]);
        }

        $stmt = $this->db->prepare(
            "UPDATE fee_payments SET status = ?, razorpay_payment_id = ? WHERE razorpay_order_id = ?"
        );
        return $stmt->execute([$status, $paymentId, $orderId]);
    }

    public function findStructureById($id) {
        $stmt = $this->db->prepare(
            "SELECT fs.*, c.name AS course_name, c.department_id
               FROM fee_structures fs
               INNER JOIN courses c ON c.id = fs.course_id
              WHERE fs.id = ? LIMIT 1"
        );
        $stmt->execute([(int) $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * The fee structures a student is actually billed for.
     *
     * Mirrors getPendingDues()'s derivation: the student's course comes from
     * their department, since students has no course_id column.
     */
    public function getStructuresForStudent($studentId) {
        $stmt = $this->db->prepare(
            "SELECT fs.*, c.name AS course_name, c.department_id
               FROM fee_structures fs
               INNER JOIN courses c ON c.id = fs.course_id
              WHERE fs.course_id = (SELECT c2.id FROM students st
                                      INNER JOIN courses c2 ON c2.department_id = st.department_id
                                     WHERE st.id = ?)
                AND fs.semester = (SELECT semester FROM students WHERE id = ?)
              ORDER BY fs.fee_type"
        );
        $stmt->execute([(int) $studentId, (int) $studentId]);
        return $stmt->fetchAll();
    }

    public function getStudentPayments($studentId) {
        $stmt = $this->db->prepare(
            "SELECT fp.*, fs.fee_type, fs.semester, c.name as course_name
             FROM fee_payments fp 
             LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id 
             LEFT JOIN courses c ON fs.course_id = c.id 
             WHERE fp.student_id = ? 
             ORDER BY fp.paid_at DESC"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetchAll();
    }

    /**
     * Fee components still owed by a student.
     *
     * students has no course_id: the course comes from the student's
     * department. The previous subquery selected course_id FROM students,
     * which raised Unknown column. Aggregates are correlated subqueries
     * rather than GROUP BY so this also passes under ONLY_FULL_GROUP_BY
     * (the default from MySQL 5.7 onward).
     */
    public function getPendingDues($studentId) {
        $stmt = $this->db->prepare(
            "SELECT fs.*, c.name AS course_name,
                    COALESCE((SELECT SUM(fp.amount) FROM fee_payments fp
                              WHERE fp.fee_structure_id = fs.id
                                AND fp.student_id = ?
                                AND fp.status = 'completed'), 0) AS paid_amount,
                    fs.amount - COALESCE((SELECT SUM(fp.amount) FROM fee_payments fp
                              WHERE fp.fee_structure_id = fs.id
                                AND fp.student_id = ?
                                AND fp.status = 'completed'), 0) AS pending_amount
             FROM fee_structures fs
             INNER JOIN courses c ON c.id = fs.course_id
             WHERE fs.course_id = (SELECT c2.id FROM students st
                                     INNER JOIN courses c2 ON c2.department_id = st.department_id
                                    WHERE st.id = ?)
               AND fs.semester = (SELECT semester FROM students WHERE id = ?)
             ORDER BY fs.fee_type"
        );
        $stmt->execute([$studentId, $studentId, $studentId, $studentId]);
        return $stmt->fetchAll();
    }

    /**
     * Who a payment belongs to, for authorisation before serving a receipt.
     * Returns null when the payment id does not exist.
     */
    public function getPaymentOwner($paymentId) {
        $stmt = $this->db->prepare(
            "SELECT fp.id, fp.student_id, s.user_id, s.department_id
             FROM fee_payments fp
             LEFT JOIN students s ON fp.student_id = s.id
             WHERE fp.id = ? LIMIT 1"
        );
        $stmt->execute([(int) $paymentId]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function getReceipt($paymentId) {
        $stmt = $this->db->prepare(
            "SELECT fp.*, fs.fee_type, fs.semester, c.name as course_name,
                    s.first_name, s.last_name, s.roll_number
             FROM fee_payments fp 
             LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id 
             LEFT JOIN courses c ON fs.course_id = c.id 
             LEFT JOIN students s ON fp.student_id = s.id 
             WHERE fp.id = ?"
        );
        $stmt->execute([$paymentId]);
        return $stmt->fetch();
    }

    public function getAllPayments($page = 1, $pageSize = 20) {
        $offset = Validation::offset((int) $page, (int) $pageSize);

        $countStmt = $this->db->prepare("SELECT COUNT(*) FROM fee_payments");
        $countStmt->execute();
        $total = $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT fp.*, fs.fee_type, fs.semester,
                    s.first_name, s.last_name, s.roll_number,
                    d.name as department_name
             FROM fee_payments fp 
             LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id 
             LEFT JOIN students s ON fp.student_id = s.id 
             LEFT JOIN departments d ON s.department_id = d.id
             ORDER BY fp.paid_at DESC 
             LIMIT ? OFFSET ?"
        );
        $stmt->execute([$pageSize, $offset]);
        
        return ['data' => $stmt->fetchAll(), 'total' => $total];
    }

    public function getAllPaymentsAdmin($page = 1, $pageSize = 20, $filters = []) {
        $offset = Validation::offset((int) $page, (int) $pageSize);
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['department_id'])) {
            $where[] = 's.department_id = ?';
            $params[] = $filters['department_id'];
        }
        if (!empty($filters['status'])) {
            $where[] = 'fp.status = ?';
            $params[] = $filters['status'];
        }
        if (!empty($filters['from_date'])) {
            $where[] = 'fp.paid_at >= ?';
            $params[] = $filters['from_date'];
        }
        if (!empty($filters['to_date'])) {
            $where[] = 'fp.paid_at <= ?';
            $params[] = $filters['to_date'];
        }

        $whereClause = implode(' AND ', $where);

        $countStmt = $this->db->prepare(
            "SELECT COUNT(*) FROM fee_payments fp
             LEFT JOIN students s ON fp.student_id = s.id
             WHERE {$whereClause}"
        );
        $countStmt->execute($params);
        $total = $countStmt->fetchColumn();

        $stmt = $this->db->prepare(
            "SELECT fp.*, fs.fee_type, fs.semester,
                    s.first_name, s.last_name, s.roll_number,
                    d.name as department_name
             FROM fee_payments fp 
             LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id 
             LEFT JOIN students s ON fp.student_id = s.id 
             LEFT JOIN departments d ON s.department_id = d.id
             WHERE {$whereClause}
             ORDER BY fp.paid_at DESC 
             LIMIT ? OFFSET ?"
        );
        $params[] = $pageSize;
        $params[] = $offset;
        $stmt->execute($params);
        
        return ['data' => $stmt->fetchAll(), 'total' => $total];
    }

    public function getAllStructures($courseId = null, $semester = null) {
        $where = ['1=1'];
        $params = [];

        if ($courseId) {
            $where[] = 'fs.course_id = ?';
            $params[] = $courseId;
        }
        if ($semester) {
            $where[] = 'fs.semester = ?';
            $params[] = $semester;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT fs.*, c.name as course_name, d.name as department_name
             FROM fee_structures fs 
             LEFT JOIN courses c ON fs.course_id = c.id
             LEFT JOIN departments d ON c.department_id = d.id
             WHERE {$whereClause} 
             ORDER BY fs.semester, fs.fee_type"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function updateStructure($id, $data) {
        $fields = [];
        $params = [];
        $allowed = ['course_id', 'semester', 'fee_type', 'amount', 'due_date'];
        foreach ($data as $key => $value) {
            if (in_array($key, $allowed)) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        if (empty($fields)) return false;
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE fee_structures SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function deleteStructure($id) {
        $stmt = $this->db->prepare("DELETE FROM fee_structures WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function getFeeReport($filters = []) {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['department_id'])) {
            $where[] = 's.department_id = ?';
            $params[] = $filters['department_id'];
        }
        if (!empty($filters['from_date'])) {
            $where[] = 'fp.paid_at >= ?';
            $params[] = $filters['from_date'];
        }
        if (!empty($filters['to_date'])) {
            $where[] = 'fp.paid_at <= ?';
            $params[] = $filters['to_date'];
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT 
                    COALESCE(SUM(fp.amount), 0) as total_collected,
                    COUNT(DISTINCT fp.id) as total_transactions,
                    COUNT(DISTINCT fp.student_id) as total_students_paid,
                    fs.fee_type,
                    fs.semester
             FROM fee_payments fp
             LEFT JOIN fee_structures fs ON fp.fee_structure_id = fs.id
             LEFT JOIN students s ON fp.student_id = s.id
             WHERE fp.status = 'completed' AND {$whereClause}
             GROUP BY fs.fee_type, fs.semester
             ORDER BY fs.semester, fs.fee_type"
        );
        $stmt->execute($params);
        $details = $stmt->fetchAll();

        $stmt2 = $this->db->prepare(
            "SELECT 
                    COALESCE(SUM(fp.amount), 0) as total_collected,
                    COUNT(DISTINCT fp.id) as total_transactions,
                    COUNT(DISTINCT fp.student_id) as total_students_paid
             FROM fee_payments fp
             LEFT JOIN students s ON fp.student_id = s.id
             WHERE fp.status = 'completed' AND {$whereClause}"
        );
        $stmt2->execute($params);
        $summary = $stmt2->fetch();

        return [
            'summary' => $summary,
            'details' => $details,
        ];
    }
}
