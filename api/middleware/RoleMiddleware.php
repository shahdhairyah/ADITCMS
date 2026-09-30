<?php
/**
 * ADIT CMS - Role-Based Access Control Middleware
 */

class RoleMiddleware {

    /** Roles that may never be reached through inheritance; allow-lists are explicit. */

    /**
     * Check if the current user has one of the allowed roles.
     * Purely an allow-list check - an admin is NOT implicitly allowed on a
     * route restricted to ['hod'], because routes that admins may use list
     * 'admin' explicitly.
     */
    public static function requireRole($allowedRoles) {
        $currentRole = AuthMiddleware::getUserRole();

        if (!$currentRole) {
            Response::unauthorized('Authentication required');
        }

        $allowed = is_array($allowedRoles) ? $allowedRoles : [$allowedRoles];

        if (!in_array($currentRole, $allowed, true)) {
            Response::forbidden('You do not have permission to access this resource');
        }

        return true;
    }

    /** Department id owned by this HOD, or null. */
    public static function hodDepartmentId(): ?int {
        $userId = AuthMiddleware::getUserId();
        if (!$userId) {
            return null;
        }
        $db   = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT d.id FROM departments d
                              INNER JOIN faculty f ON f.id = d.hod_id
                              WHERE f.user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        return $row ? (int) $row['id'] : null;
    }

    /** Department id this user belongs to (faculty/student), or null. */
    public static function ownDepartmentId(): ?int {
        $userId = AuthMiddleware::getUserId();
        $role   = AuthMiddleware::getUserRole();
        if (!$userId) {
            return null;
        }
        $db   = Database::getInstance()->getConnection();
        $stmt = $role === 'student'
            ? $db->prepare("SELECT department_id FROM students WHERE user_id = ? LIMIT 1")
            : $db->prepare("SELECT department_id FROM faculty WHERE user_id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        return $row && $row['department_id'] !== null ? (int) $row['department_id'] : null;
    }

    /**
     * Check if the user can access department-scoped data.
     * admin -> all departments, hod -> only the department they head,
     * faculty -> only their own department, everyone else -> no.
     */
    public static function canAccessDepartment($departmentId): bool {
        $role = AuthMiddleware::getUserRole();
        if (!$role || $departmentId === null || $departmentId === '') {
            return false;
        }
        $departmentId = (int) $departmentId;

        if ($role === 'admin') {
            return true;
        }
        if ($role === 'hod') {
            $own = self::hodDepartmentId();
            return $own !== null && $own === $departmentId;
        }
        if ($role === 'faculty') {
            $own = self::ownDepartmentId();
            return $own !== null && $own === $departmentId;
        }
        return false;
    }

    /**
     * Check if the user can access a specific student's data.
     * admin        -> any student
     * hod          -> students in the department they head (not all students)
     * faculty      -> students enrolled in a subject they teach
     * student      -> only themselves
     * librarian    -> no academic records
     */
    public static function canAccessStudent($studentId): bool {
        $role   = AuthMiddleware::getUserRole();
        $userId = AuthMiddleware::getUserId();
        $studentId = (int) $studentId;

        if (!$role || $studentId < 1) {
            return false;
        }
        if ($role === 'admin') {
            return true;
        }

        $db = Database::getInstance()->getConnection();

        if ($role === 'hod') {
            $dept = self::hodDepartmentId();
            if ($dept === null) {
                return false;
            }
            $stmt = $db->prepare("SELECT id FROM students WHERE id = ? AND department_id = ?");
            $stmt->execute([$studentId, $dept]);
            return $stmt->fetch() !== false;
        }

        if ($role === 'student') {
            $stmt = $db->prepare("SELECT id FROM students WHERE user_id = ? AND id = ?");
            $stmt->execute([$userId, $studentId]);
            return $stmt->fetch() !== false;
        }

        if ($role === 'faculty') {
            // Was comparing sub.department_id (a department id) against a
            // faculty id, which never matched.
            // There is no `enrollments` table: enrolment is implied by
            // (department_id, semester) on the student plus the subject's
            // semester, so a teacher reaches students through their subjects.
            $stmt = $db->prepare("
                SELECT 1
                FROM subjects  sub
                INNER JOIN semesters s  ON s.id = sub.semester_id
                INNER JOIN courses    c  ON c.id = s.course_id
                INNER JOIN faculty    f  ON f.id = sub.faculty_id
                WHERE sub.faculty_id = f.id
                  AND f.user_id = ?
                  AND sub.department_id = c.department_id
                  AND EXISTS (
                      SELECT 1 FROM students st
                      WHERE st.id = ?
                        AND st.department_id = c.department_id
                        AND st.semester      = s.semester_number
                  )
                LIMIT 1
            ");
            $stmt->execute([$userId, $studentId]);
            return $stmt->fetch() !== false;
        }

        return false;
    }

    /**
     * Check if this teacher owns a subject.
     *
     * Used to stop a teacher creating assignments, labs, materials or
     * attendance against a subject belonging to another department - the
     * subject_id in the request body is otherwise fully attacker-controlled.
     */
    public static function teachesSubject($facultyId, $subjectId): bool {
        $facultyId = (int) $facultyId;
        $subjectId = (int) $subjectId;
        if ($facultyId < 1 || $subjectId < 1) {
            return false;
        }
        $db   = Database::getInstance()->getConnection();
        $stmt = $db->prepare("SELECT 1 FROM subjects WHERE id = ? AND faculty_id = ? LIMIT 1");
        $stmt->execute([$subjectId, $facultyId]);
        return $stmt->fetch() !== false;
    }

    /**
     * The department every read query should be scoped to, or null for
     * "no restriction" (admin only).
     */
    public static function scopeDepartmentId(): ?int {
        $role = AuthMiddleware::getUserRole();
        if ($role === 'admin') {
            return null;
        }
        if ($role === 'hod') {
            return self::hodDepartmentId();
        }
        if ($role === 'faculty') {
            return self::ownDepartmentId();
        }
        return -1; // sentinel: matches no department
    }
}
