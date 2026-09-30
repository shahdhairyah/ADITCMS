<?php
/**
 * ADIT CMS - Library Model
 */

class Library extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    // Book methods
    public function getBooks($search = null, $category = null) {
        $where = ['1=1'];
        $params = [];

        if ($search) {
            $where[] = "(b.title LIKE ? OR b.author LIKE ? OR b.isbn LIKE ?)";
            $s = "%{$search}%";
            $params[] = $s;
            $params[] = $s;
            $params[] = $s;
        }
        if ($category) {
            $where[] = 'b.category = ?';
            $params[] = $category;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT b.* FROM books b WHERE {$whereClause} ORDER BY b.title"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getBookById($id) {
        $stmt = $this->db->prepare("SELECT * FROM books WHERE id = ?");
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function addBook($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO books (title, author, isbn, publisher, category, total_copies, available_copies) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['title'], $data['author'], $data['isbn'] ?? null,
            $data['publisher'] ?? null, $data['category'] ?? null,
            $data['total_copies'] ?? 1, $data['total_copies'] ?? 1
        ]);
        return $this->db->lastInsertId();
    }

    public function updateBook($id, $data) {
        $fields = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['title', 'author', 'isbn', 'publisher', 'category', 'total_copies', 'available_copies'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE books SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    // Issue/Return methods
    public function issueBook($data) {
        $this->db->beginTransaction();
        try {
            // Create issue record
            $stmt = $this->db->prepare(
                "INSERT INTO book_issues (book_id, student_id, issue_date, due_date, status) 
                 VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'issued')"
            );
            $stmt->execute([$data['book_id'], $data['student_id']]);
            $issueId = $this->db->lastInsertId();

            // Update available copies
            $stmt = $this->db->prepare(
                "UPDATE books SET available_copies = available_copies - 1 WHERE id = ? AND available_copies > 0"
            );
            $stmt->execute([$data['book_id']]);

            $this->db->commit();
            return $issueId;
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function returnBook($issueId) {
        $this->db->beginTransaction();
        try {
            // Get issue details
            $stmt = $this->db->prepare("SELECT * FROM book_issues WHERE id = ?");
            $stmt->execute([$issueId]);
            $issue = $stmt->fetch();

            if (!$issue) {
                $this->db->rollBack();
                return false;
            }

            // Calculate fine if overdue
            $fine = 0;
            if (strtotime($issue['due_date']) < time()) {
                $daysOverdue = floor((time() - strtotime($issue['due_date'])) / 86400);
                $fine = $daysOverdue * 5; // ₹5 per day
            }

            // Update issue record
            $stmt = $this->db->prepare(
                "UPDATE book_issues SET return_date = CURDATE(), fine_amount = ?, status = 'returned' WHERE id = ?"
            );
            $stmt->execute([$fine, $issueId]);

            // Update available copies
            $stmt = $this->db->prepare(
                "UPDATE books SET available_copies = available_copies + 1 WHERE id = ?"
            );
            $stmt->execute([$issue['book_id']]);

            $this->db->commit();
            return ['fine' => $fine];
        } catch (Exception $e) {
            $this->db->rollBack();
            return false;
        }
    }

    public function getStudentHistory($studentId) {
        $stmt = $this->db->prepare(
            "SELECT bi.*, b.title, b.author, b.isbn 
             FROM book_issues bi 
             JOIN books b ON bi.book_id = b.id 
             WHERE bi.student_id = ? 
             ORDER BY bi.issue_date DESC"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetchAll();
    }

    public function getStudentFines($studentId) {
        $stmt = $this->db->prepare(
            "SELECT bi.*, b.title 
             FROM book_issues bi 
             JOIN books b ON bi.book_id = b.id 
             WHERE bi.student_id = ? AND bi.fine_amount > 0 AND bi.status != 'fine_paid'
             ORDER BY bi.issue_date DESC"
        );
        $stmt->execute([$studentId]);
        return $stmt->fetchAll();
    }

    public function getOverdueBooks() {
        $stmt = $this->db->prepare(
            "SELECT bi.*, b.title, b.author,
                    s.first_name, s.last_name, s.roll_number, s.phone
             FROM book_issues bi 
             JOIN books b ON bi.book_id = b.id 
             JOIN students s ON bi.student_id = s.id 
             WHERE bi.status = 'issued' AND bi.due_date < CURDATE()
             ORDER BY bi.due_date"
        );
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public function getStatistics() {
        $stmt = $this->db->prepare(
            "SELECT 
                (SELECT COUNT(*) FROM books) as total_books,
                (SELECT SUM(total_copies) FROM books) as total_copies,
                (SELECT SUM(total_copies - available_copies) FROM books) as issued_copies,
                (SELECT COUNT(*) FROM book_issues WHERE status = 'issued') as active_issues,
                (SELECT COUNT(*) FROM book_issues WHERE status = 'issued' AND due_date < CURDATE()) as overdue_count,
                (SELECT SUM(fine_amount) FROM book_issues WHERE fine_amount > 0 AND status != 'fine_paid') as total_pending_fines"
        );
        $stmt->execute();
        return $stmt->fetch();
    }
}
