<?php
/**
 * ADIT CMS - Timetable Model
 */

class Timetable extends Database {
    
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getTimetable($branchId = null, $semester = null, $dayFilter = null) {
        $where = ['1=1'];
        $params = [];

        if ($branchId) {
            $where[] = 't.branch_id = ?';
            $params[] = $branchId;
        }
        if ($semester) {
            $where[] = 't.semester = ?';
            $params[] = $semester;
        }
        if ($dayFilter) {
            $where[] = 't.day_of_week = ?';
            $params[] = $dayFilter;
        }

        $whereClause = implode(' AND ', $where);

        $stmt = $this->db->prepare(
            "SELECT t.*, s.name as subject_name, s.code as subject_code,
                    CONCAT(f.first_name, ' ', f.last_name) as faculty_name
             FROM timetables t 
             LEFT JOIN subjects s ON t.subject_id = s.id 
             LEFT JOIN faculty f ON t.faculty_id = f.id 
             WHERE {$whereClause} 
             ORDER BY 
                FIELD(t.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
                t.period_number"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Detect timetable clashes.
     *
     * Three independent overlaps must be rejected, each with its own WHERE
     * list. The previous version built the faculty check from the classroom
     * list ($where2 = $where was taken *after* "classroom = ?" was appended),
     * so a teacher booked in two different classrooms was never flagged, and
     * a whole class could end up with two simultaneous lectures.
     *
     * Overlap test is the standard half-open interval check:
     *   existing.start < new.end  AND  existing.end > new.start
     */
    public function checkConflict($data, $excludeId = null) {
        $base = 'day_of_week = ? AND (start_time < ? AND end_time > ?)';
        $baseParams = [
            $data['day_of_week'],
            $data['end_time'],
            $data['start_time'],
        ];

        $checks = [
            // Same room used twice at once.
            'classroom' => [
                'where' => 'branch_id = ? AND semester = ? AND classroom = ? AND ' . $base,
                'params' => [$data['branch_id'], $data['semester'], $data['classroom']],
                'message' => 'Classroom is already booked for that time',
            ],
            // Same teacher in two places at once.
            'faculty' => [
                'where' => 'faculty_id = ? AND ' . $base,
                'params' => [$data['faculty_id']],
                'message' => 'Faculty member is already assigned to another class at that time',
            ],
            // Same class (branch + semester) in two lectures at once.
            'class' => [
                'where' => 'branch_id = ? AND semester = ? AND ' . $base,
                'params' => [$data['branch_id'], $data['semester']],
                'message' => 'This class already has a lecture scheduled at that time',
            ],
        ];

        foreach ($checks as $type => $check) {
            $where  = $check['where'];
            $params = array_merge($check['params'], $baseParams);
            if ($excludeId) {
                $where .= ' AND id != ?';
                $params[] = $excludeId;
            }

            $stmt = $this->db->prepare("SELECT COUNT(*) FROM timetables WHERE {$where}");
            $stmt->execute($params);
            if ((int) $stmt->fetchColumn() > 0) {
                return ['conflict' => true, 'type' => $type, 'message' => $check['message']];
            }
        }

        return ['conflict' => false];
    }

    public function create($data) {
        $stmt = $this->db->prepare(
            "INSERT INTO timetables (branch_id, semester, day_of_week, period_number, subject_id, faculty_id, classroom, start_time, end_time) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['branch_id'], $data['semester'],
            $data['day_of_week'], $data['period_number'],
            $data['subject_id'], $data['faculty_id'],
            $data['classroom'], $data['start_time'], $data['end_time']
        ]);
        return $this->db->lastInsertId();
    }

    public function update($id, $data) {
        $fields = [];
        $params = [];
        
        foreach ($data as $key => $value) {
            if (in_array($key, ['branch_id', 'semester', 'day_of_week', 'period_number', 'subject_id', 'faculty_id', 'classroom', 'start_time', 'end_time'])) {
                $fields[] = "{$key} = ?";
                $params[] = $value;
            }
        }
        
        if (empty($fields)) return false;
        
        $params[] = $id;
        $stmt = $this->db->prepare("UPDATE timetables SET " . implode(', ', $fields) . " WHERE id = ?");
        return $stmt->execute($params);
    }

    public function delete($id) {
        $stmt = $this->db->prepare("DELETE FROM timetables WHERE id = ?");
        return $stmt->execute([$id]);
    }

    public function findById($id) {
        $stmt = $this->db->prepare(
            "SELECT t.*, s.name AS subject_name, s.code AS subject_code,
                    s.department_id AS subject_department_id,
                    f.first_name AS faculty_first_name, f.last_name AS faculty_last_name,
                    f.department_id AS faculty_department_id
             FROM timetable t
             LEFT JOIN subjects s ON t.subject_id = s.id
             LEFT JOIN faculty  f ON t.faculty_id = f.id
             WHERE t.id = ? LIMIT 1"
        );
        $stmt->execute([(int) $id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function getByFaculty($facultyId) {
        $stmt = $this->db->prepare(
            "SELECT t.*, s.name as subject_name, d.name as department_name
             FROM timetables t 
             LEFT JOIN subjects s ON t.subject_id = s.id 
             LEFT JOIN departments d ON t.branch_id = d.id 
             WHERE t.faculty_id = ? 
             ORDER BY 
                FIELD(t.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'),
                t.period_number"
        );
        $stmt->execute([$facultyId]);
        return $stmt->fetchAll();
    }
}
