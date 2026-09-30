<?php
/**
 * ADIT CMS - Public Controller
 * Public endpoints for the college home page (no auth required)
 */

class PublicController {

    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function stats() {
        try {
            $counts = [];
            $tables = [
                'total_students' => 'students',
                'total_faculty' => 'faculty',
                'total_departments' => 'departments',
                'total_courses' => 'courses',
                'total_subjects' => 'subjects',
                'total_classrooms' => 'classrooms',
                'total_books' => 'books'
            ];

            foreach ($tables as $key => $table) {
                $stmt = $this->db->prepare("SELECT COUNT(*) FROM {$table}");
                $stmt->execute();
                $counts[$key] = (int)$stmt->fetchColumn();
            }

            $stmt = $this->db->prepare(
                "SELECT d.id, d.name, d.code, COUNT(s.id) as student_count
                 FROM departments d
                 LEFT JOIN students s ON s.department_id = d.id
                 GROUP BY d.id
                 ORDER BY d.name"
            );
            $stmt->execute();
            $departments = $stmt->fetchAll();

            $stmt = $this->db->prepare(
                "SELECT n.id, n.title, n.type, DATE_FORMAT(n.published_at, '%d %b %Y') as published_at
                 FROM notices n
                 ORDER BY n.published_at DESC
                 LIMIT 5"
            );
            $stmt->execute();
            $notices = $stmt->fetchAll();

            Response::success([
                'stats' => $counts,
                'departments' => $departments,
                'notices' => $notices
            ]);
        } catch (Exception $e) {
            error_log("PublicController::stats Error: " . $e->getMessage());
            Response::serverError('Failed to load campus statistics');
        }
    }
}
