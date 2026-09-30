-- =====================================================
-- ADIT College Management System - Complete Database
-- Single file: schema + seed data + all fixes
-- Run ONCE on your MySQL server
-- =====================================================

CREATE DATABASE IF NOT EXISTS adit_cms;
USE adit_cms;

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- 1. USERS & AUTHENTICATION
-- =====================================================

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('student', 'faculty', 'hod', 'admin', 'librarian') NOT NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    -- Set to 1 when the account still holds a provisioning password (see
    -- api/setup_passwords.php). AuthMiddleware then allows nothing except
    -- /auth/change-password, /auth/me, /auth/logout and /health, so a shared
    -- default password cannot be used until its owner replaces it.
    must_change_password TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 2. DEPARTMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    hod_id INT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 3. COURSES
-- =====================================================

CREATE TABLE IF NOT EXISTS courses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    department_id INT NOT NULL,
    duration_years INT DEFAULT 4,
    total_semesters INT DEFAULT 8,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. SEMESTERS
-- =====================================================

CREATE TABLE IF NOT EXISTS semesters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    semester_number INT NOT NULL,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_semester (course_id, semester_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. BATCHES
-- =====================================================

CREATE TABLE IF NOT EXISTS batches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    course_id INT NOT NULL,
    department_id INT NOT NULL,
    start_year YEAR NOT NULL,
    end_year YEAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. FACULTY
-- =====================================================

CREATE TABLE IF NOT EXISTS faculty (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    qualification VARCHAR(100),
    experience_years INT DEFAULT 0,
    department_id INT,
    designation VARCHAR(50),
    phone VARCHAR(15),
    photo VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    INDEX idx_employee_id (employee_id),
    INDEX idx_department (department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- departments.hod_id -> faculty.id (added here because faculty now exists)
SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'departments'
      AND CONSTRAINT_NAME = 'fk_departments_hod'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE departments ADD CONSTRAINT fk_departments_hod FOREIGN KEY (hod_id) REFERENCES faculty(id) ON DELETE SET NULL',
    'DO 0');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- =====================================================
-- 6b. LIBRARIANS
-- ------------------------------------------------------------
-- The `librarian` role is used by /library/* routes and is seeded below,
-- but it had no profile table, so librarian accounts had nowhere to store
-- a name and could not be displayed anywhere.
-- =====================================================
CREATE TABLE IF NOT EXISTS librarians (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(15),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user (user_id),
    INDEX idx_employee_id (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 7. STUDENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    roll_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dob DATE,
    gender ENUM('male', 'female', 'other'),
    phone VARCHAR(15),
    address TEXT,
    photo VARCHAR(255),
    department_id INT,
    semester INT DEFAULT 1,
    batch VARCHAR(20),
    admission_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    INDEX idx_roll_number (roll_number),
    INDEX idx_department_semester (department_id, semester),
    INDEX idx_batch (batch)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 8. SUBJECTS
-- =====================================================

CREATE TABLE IF NOT EXISTS subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    semester_id INT NOT NULL,
    department_id INT NOT NULL,
    faculty_id INT,
    credits INT DEFAULT 3,
    type ENUM('theory', 'practical', 'theory_practical') DEFAULT 'theory',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE SET NULL,
    INDEX idx_code (code),
    INDEX idx_semester (semester_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 9. CLASSROOMS
-- =====================================================

CREATE TABLE IF NOT EXISTS classrooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    building VARCHAR(50),
    floor INT,
    capacity INT DEFAULT 60,
    type ENUM('classroom', 'lab', 'seminar_hall') DEFAULT 'classroom',
    department_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 10. ATTENDANCE
-- =====================================================

CREATE TABLE IF NOT EXISTS attendance (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    date DATE NOT NULL,
    status ENUM('present', 'absent', 'late') NOT NULL,
    marked_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (marked_by) REFERENCES faculty(id) ON DELETE SET NULL,
    UNIQUE KEY unique_attendance (student_id, subject_id, date),
    INDEX idx_date (date),
    INDEX idx_subject_date (subject_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 11. ASSIGNMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id INT NOT NULL,
    faculty_id INT NOT NULL,
    deadline DATETIME NOT NULL,
    max_marks INT DEFAULT 100,
    attachments VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    INDEX idx_subject (subject_id),
    INDEX idx_deadline (deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 12. SUBMISSIONS (Assignment & Lab)
-- =====================================================

CREATE TABLE IF NOT EXISTS submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    file_path VARCHAR(500),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marks INT,
    feedback TEXT,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    reviewed_by INT,
    reviewed_by_user INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES faculty(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by_user) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_submission (assignment_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 13. LAB MANUALS
-- =====================================================

CREATE TABLE IF NOT EXISTS lab_manuals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    subject_id INT NOT NULL,
    experiment_number INT,
    description TEXT,
    faculty_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lab_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    lab_manual_id INT NOT NULL,
    student_id INT NOT NULL,
    file_path VARCHAR(500),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    marks INT,
    feedback TEXT,
    status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
    reviewed_by INT,
    reviewed_by_user INT,
    FOREIGN KEY (lab_manual_id) REFERENCES lab_manuals(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES faculty(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by_user) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_lab_submission (lab_manual_id, student_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 14. STUDY MATERIALS
-- =====================================================

CREATE TABLE IF NOT EXISTS study_materials (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject_id INT NOT NULL,
    faculty_id INT NOT NULL,
    file_path VARCHAR(500),
    file_type ENUM('pdf', 'ppt', 'video', 'document', 'other') DEFAULT 'pdf',
    topic VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 15. FEE STRUCTURES
-- =====================================================

CREATE TABLE IF NOT EXISTS fee_structures (
    id INT PRIMARY KEY AUTO_INCREMENT,
    course_id INT NOT NULL,
    semester INT NOT NULL,
    fee_type VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_semester (course_id, semester)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 16. FEE PAYMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS fee_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    fee_structure_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'razorpay',
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    paid_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (fee_structure_id) REFERENCES fee_structures(id) ON DELETE CASCADE,
    INDEX idx_student (student_id),
    INDEX idx_status (status),
    INDEX idx_order_id (razorpay_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 17. UNIT TESTS (Internal Marks)
-- =====================================================

CREATE TABLE IF NOT EXISTS unit_tests (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    test_number INT NOT NULL,
    marks_obtained DECIMAL(5, 2),
    max_marks DECIMAL(5, 2) DEFAULT 30,
    entered_by INT,
    entered_by_user INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (entered_by) REFERENCES faculty(id) ON DELETE SET NULL,
    FOREIGN KEY (entered_by_user) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_test (student_id, subject_id, test_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 18. EXTERNAL MARKS
-- =====================================================

CREATE TABLE IF NOT EXISTS external_marks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    subject_id INT NOT NULL,
    marks_obtained DECIMAL(5, 2),
    max_marks DECIMAL(5, 2) DEFAULT 100,
    entered_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (entered_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_external (student_id, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 19. RESULTS
-- =====================================================

CREATE TABLE IF NOT EXISTS results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    semester_id INT NOT NULL,
    sgpa DECIMAL(4, 2),
    -- total_credits / total_grade_points are stored per semester so that
    -- CGPA is a real credit-weighted average of every prior semester instead
    -- of being back-calculated from a previous CGPA (which produced garbage).
    total_credits DECIMAL(6, 2) DEFAULT 0,
    total_grade_points DECIMAL(7, 2) DEFAULT 0,
    cgpa DECIMAL(4, 2),
    status ENUM('pass', 'fail') DEFAULT 'pass',
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE,
    UNIQUE KEY unique_result (student_id, semester_id),
    INDEX idx_semester (semester_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 20. GRADE DEFINITIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS grade_definitions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    min_marks DECIMAL(5, 2) NOT NULL,
    max_marks DECIMAL(5, 2) NOT NULL,
    grade VARCHAR(5) NOT NULL,
    grade_point DECIMAL(3, 1) NOT NULL,
    description VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 21. HALL TICKETS
-- =====================================================

CREATE TABLE IF NOT EXISTS hall_tickets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    semester_id INT NOT NULL,
    hall_ticket_number VARCHAR(50) UNIQUE NOT NULL,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 22. TIMETABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS timetables (
    id INT PRIMARY KEY AUTO_INCREMENT,
    branch_id INT NOT NULL,
    semester INT NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday') NOT NULL,
    period_number INT NOT NULL,
    subject_id INT NOT NULL,
    faculty_id INT NOT NULL,
    classroom VARCHAR(50) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (branch_id) REFERENCES departments(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    INDEX idx_branch_semester (branch_id, semester),
    INDEX idx_day (day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 23. LIBRARY - BOOKS
-- =====================================================

CREATE TABLE IF NOT EXISTS books (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    publisher VARCHAR(255),
    category VARCHAR(100),
    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_title (title),
    INDEX idx_isbn (isbn),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 24. LIBRARY - ISSUES
-- =====================================================

CREATE TABLE IF NOT EXISTS book_issues (
    id INT PRIMARY KEY AUTO_INCREMENT,
    book_id INT NOT NULL,
    student_id INT NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    fine_amount DECIMAL(10, 2) DEFAULT 0,
    status ENUM('issued', 'returned', 'overdue', 'fine_paid') DEFAULT 'issued',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    INDEX idx_student (student_id),
    INDEX idx_status (status),
    INDEX idx_due_date (due_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 25. NOTICES
-- =====================================================

CREATE TABLE IF NOT EXISTS notices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type ENUM('college', 'department', 'class') DEFAULT 'college',
    department_id INT,
    target_audience ENUM('all', 'student', 'faculty', 'both') DEFAULT 'all',
    created_by INT,
    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attachments VARCHAR(500),
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_published (published_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 26. ANNOUNCEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS announcements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    subject_id INT,
    faculty_id INT NOT NULL,
    class_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
    FOREIGN KEY (faculty_id) REFERENCES faculty(id) ON DELETE CASCADE,
    INDEX idx_subject (subject_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 27. LEAVE APPLICATIONS (Two-tier: Faculty → HOD)
-- =====================================================

CREATE TABLE IF NOT EXISTS leave_applications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    leave_type ENUM('sick', 'personal', 'official', 'other') NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason TEXT NOT NULL,
    document_path VARCHAR(500),
    status ENUM('pending', 'forwarded', 'approved', 'rejected', 'withdrawn') DEFAULT 'pending',
    faculty_reviewed_by INT,
    faculty_reviewed_by_user INT,
    faculty_reviewed_at TIMESTAMP NULL,
    faculty_comments TEXT,
    hod_reviewed_by INT,
    hod_reviewed_by_user INT,
    hod_reviewed_at TIMESTAMP NULL,
    hod_comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_reviewed_by) REFERENCES faculty(id) ON DELETE SET NULL,
    FOREIGN KEY (faculty_reviewed_by_user) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (hod_reviewed_by) REFERENCES faculty(id) ON DELETE SET NULL,
    FOREIGN KEY (hod_reviewed_by_user) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_student (student_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 28. SYLLABUS
-- =====================================================

CREATE TABLE IF NOT EXISTS syllabus (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    unit_number INT NOT NULL,
    unit_title VARCHAR(100) NOT NULL,
    topics TEXT,
    status ENUM('not_started', 'in_progress', 'completed') DEFAULT 'not_started',
    uploaded_by INT,
    file_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES faculty(id) ON DELETE SET NULL,
    INDEX idx_subject (subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 29. ACADEMIC CALENDAR
-- =====================================================

CREATE TABLE IF NOT EXISTS academic_calendar (
    id INT PRIMARY KEY AUTO_INCREMENT,
    event_title VARCHAR(255) NOT NULL,
    event_type ENUM('exam', 'holiday', 'event', 'deadline', 'other') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 30. HOLIDAYS
-- =====================================================

CREATE TABLE IF NOT EXISTS holidays (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    type ENUM('national', 'regional', 'college') DEFAULT 'college',
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_date (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 31. SYSTEM SETTINGS
-- =====================================================

CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 32. AUDIT LOGS
-- =====================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_value JSON,
    new_value JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 33. SYSTEM BACKUPS
-- =====================================================

CREATE TABLE IF NOT EXISTS system_backups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    size BIGINT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 34. PASSWORD RESETS
-- =====================================================

CREATE TABLE IF NOT EXISTS password_resets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 35. EMAIL VERIFICATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS email_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    verified TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_token (token),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 36. MATERIAL DOWNLOADS (download tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS material_downloads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    material_id INT NOT NULL,
    user_id INT NOT NULL,
    downloaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (material_id) REFERENCES study_materials(id) ON DELETE CASCADE,
    INDEX idx_material (material_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 37. ANNOUNCEMENT READS (read tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS announcement_reads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    announcement_id INT NOT NULL,
    user_id INT NOT NULL,
    read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_read (announcement_id, user_id),
    FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    INDEX idx_announcement (announcement_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- =====================================================
-- SEED DATA
-- =====================================================
-- =====================================================

SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- DEPARTMENTS
-- =====================================================
INSERT INTO departments (name, code, description) VALUES
('Computer Engineering', 'CE', 'Department of Computer Engineering - Offering B.Tech in Computer Engineering');

-- =====================================================
-- USERS
-- ------------------------------------------------------------
-- Passwords CANNOT be stored as plain bcrypt hashes in a .sql file,
-- because bcrypt output is salted and only PHP's password_hash()
-- can produce a valid hash for a chosen password.
--
-- Every account below is inserted with a LOCKED placeholder hash, so
-- nobody can log in until the installer runs. Run the installer once:
--
--     database/install.php?key=<INSTALL_KEY>      (browser)
--     php database/install.php                    (CLI)
--
-- The installer rewrites each password_hash with a real bcrypt hash
-- and prints the demo credentials.
-- =====================================================
INSERT INTO users (email, password_hash, role, status) VALUES
('admin@adit.edu',        '!locked!', 'admin',     'active'),
('hod.ce@adit.edu',       '!locked!', 'hod',       'active'),
('ravi.sharma@adit.edu',  '!locked!', 'faculty',   'active'),
('librarian@adit.edu',    '!locked!', 'librarian', 'active'),
('student01@adit.edu',    '!locked!', 'student',   'active'),
('student02@adit.edu',    '!locked!', 'student',   'active'),
('student03@adit.edu',    '!locked!', 'student',   'active'),
('student04@adit.edu',    '!locked!', 'student',   'active'),
('student05@adit.edu',    '!locked!', 'student',   'active'),
('student06@adit.edu',    '!locked!', 'student',   'active'),
('priya.patel@adit.edu',  '!locked!', 'faculty',   'active'),
('amit.trivedi@adit.edu', '!locked!', 'faculty',   'active');

-- =====================================================
-- FACULTY PROFILES
-- =====================================================
INSERT INTO faculty (user_id, employee_id, first_name, last_name, qualification, experience_years, department_id, designation, phone) VALUES
(2, 'ADIT-FAC-001', 'Rajesh',  'Mehta',   'Ph.D. Computer Science',     15, 1, 'Professor & HOD',        '9876543210'),
(3, 'ADIT-FAC-002', 'Ravi',    'Sharma',  'M.Tech Computer Science',      8, 1, 'Associate Professor',    '9876543215'),
(11, 'ADIT-FAC-003', 'Priya',  'Patel',   'M.Tech Information Technology',7, 1, 'Assistant Professor',    '9876543216'),
(12, 'ADIT-FAC-004', 'Amit',   'Trivedi', 'Ph.D. Electronics',            11, 1, 'Associate Professor',    '9876543217');

INSERT INTO librarians (user_id, employee_id, first_name, last_name, phone) VALUES
(4, 'ADIT-LIB-001', 'Meera', 'Joshi', '9876543220');

-- Update department HOD
UPDATE departments SET hod_id = 1 WHERE code = 'CE';

-- =====================================================
-- COURSES
-- =====================================================
INSERT INTO courses (name, code, department_id, duration_years, total_semesters) VALUES
('B.Tech Computer Engineering', 'BTECH-CE', 1, 4, 8);

-- =====================================================
-- SEMESTERS
-- =====================================================
INSERT INTO semesters (course_id, semester_number, start_date, end_date) VALUES
(1, 1, '2024-07-01', '2024-12-15'),
(1, 2, '2025-01-05', '2025-05-30'),
(1, 3, '2025-07-01', '2025-12-15'),
(1, 4, '2026-01-05', '2026-05-30'),
(1, 5, '2026-07-01', '2026-12-15'),
(1, 6, '2027-01-05', '2027-05-30'),
(1, 7, '2027-07-01', '2027-12-15'),
(1, 8, '2028-01-05', '2028-05-30');

-- =====================================================
-- SUBJECTS
-- =====================================================
INSERT INTO subjects (name, code, semester_id, department_id, faculty_id, credits, type) VALUES
('Engineering Mathematics I',    'MATH101', 1, 1, 1, 4, 'theory'),
('Engineering Physics',          'PHY101',  1, 1, 2, 3, 'theory'),
('Basic Computer Engineering',   'CSE101',  1, 1, 2, 3, 'theory'),
('Programming in C',             'CSE102',  1, 1, 2, 3, 'theory_practical'),
('Engineering Graphics',         'ENG101',  1, 1, 1, 2, 'practical'),
('Communication Skills',         'COM101',  1, 1, 1, 2, 'theory'),
('Data Structures',              'CSE301',  3, 1, 2, 4, 'theory_practical'),
('Digital Electronics',          'CSE302',  3, 1, 2, 3, 'theory_practical'),
('Object Oriented Programming',  'CSE303',  3, 1, 2, 3, 'theory_practical'),
('Database Management Systems',  'CSE304',  3, 1, 1, 3, 'theory_practical'),
('Discrete Mathematics',         'MATH301', 3, 1, 1, 3, 'theory');

-- =====================================================
-- BATCHES
-- =====================================================
INSERT INTO batches (name, course_id, department_id, start_year, end_year) VALUES
('CE-2024', 1, 1, 2024, 2028),
('CE-2023', 1, 1, 2023, 2027);

-- =====================================================
-- STUDENTS
-- =====================================================
INSERT INTO students (user_id, roll_number, first_name, last_name, dob, gender, phone, department_id, semester, batch, admission_date) VALUES
(5,  'CE-2024-001', 'Arjun',   'Mehta',   '2006-03-15', 'male',   '9876543301', 1, 3, 'CE-2024', '2024-07-15'),
(6,  'CE-2024-002', 'Ananya',  'Desai',   '2006-05-22', 'female', '9876543302', 1, 3, 'CE-2024', '2024-07-15'),
(7,  'CE-2024-003', 'Karan',   'Joshi',   '2006-01-10', 'male',   '9876543303', 1, 3, 'CE-2024', '2024-07-15'),
(8,  'CE-2024-004', 'Ishita',  'Nair',    '2005-11-02', 'female', '9876543304', 1, 3, 'CE-2024', '2024-07-15'),
(9,  'CE-2024-005', 'Rohan',   'Verma',   '2006-07-19', 'male',   '9876543305', 1, 3, 'CE-2024', '2024-07-15'),
(10, 'CE-2024-006', 'Sneha',   'Iyer',    '2006-02-28', 'female', '9876543306', 1, 3, 'CE-2024', '2024-07-15');

-- =====================================================
-- CLASSROOMS
-- =====================================================
INSERT INTO classrooms (name, building, floor, capacity, type, department_id) VALUES
('CE-101',    'Block A', 1, 60,  'classroom',   1),
('CE-102',    'Block A', 1, 60,  'classroom',   1),
('CE-LAB-1',  'Block A', 1, 30,  'lab',         1),
('CE-LAB-2',  'Block A', 2, 30,  'lab',         1),
('AUDITORIUM','Main Block', 0, 500, 'seminar_hall', NULL);

-- =====================================================
-- FEE STRUCTURES
-- =====================================================
INSERT INTO fee_structures (course_id, semester, fee_type, amount, due_date) VALUES
(1, 3, 'Tuition Fee',     45000.00, '2025-07-30'),
(1, 3, 'Lab Fee',          5000.00, '2025-07-30'),
(1, 3, 'Library Fee',      1000.00, '2025-07-30'),
(1, 3, 'Exam Fee',         2000.00, '2025-07-30'),
(1, 3, 'Sports Fee',       1500.00, '2025-07-30'),
(1, 3, 'Development Fee',  3000.00, '2025-07-30');

-- =====================================================
-- GRADE DEFINITIONS
-- =====================================================
INSERT INTO grade_definitions (min_marks, max_marks, grade, grade_point, description) VALUES
(90, 100,    'O',  10.0, 'Outstanding'),
(80, 89.99,  'A+', 9.0,  'Excellent'),
(70, 79.99,  'A',  8.0,  'Very Good'),
(60, 69.99,  'B+', 7.0,  'Good'),
(50, 59.99,  'B',  6.0,  'Above Average'),
(40, 49.99,  'C',  5.0,  'Average'),
(0,  39.99,  'F',  0.0,  'Fail');

-- =====================================================
-- TIMETABLE (CE Semester 3 - Full Week)
-- =====================================================
INSERT INTO timetables (branch_id, semester, day_of_week, period_number, subject_id, faculty_id, classroom, start_time, end_time) VALUES
(1, 3, 'Monday',    1, 7,  2,  'CE-101',   '09:00:00', '10:00:00'),
(1, 3, 'Monday',    2, 8,  2,  'CE-101',   '10:00:00', '11:00:00'),
(1, 3, 'Monday',    3, 9,  2,  'CE-LAB-1', '11:15:00', '13:15:00'),
(1, 3, 'Monday',    4, 10, 1,  'CE-102',   '14:00:00', '15:00:00'),
(1, 3, 'Monday',    5, 11, 1,  'CE-102',   '15:00:00', '16:00:00'),
(1, 3, 'Tuesday',   1, 10, 1,  'CE-101',   '09:00:00', '10:00:00'),
(1, 3, 'Tuesday',   2, 7,  2,  'CE-101',   '10:00:00', '11:00:00'),
(1, 3, 'Tuesday',   3, 11, 1,  'CE-LAB-2', '11:15:00', '13:15:00'),
(1, 3, 'Tuesday',   4, 8,  2,  'CE-102',   '14:00:00', '15:00:00'),
(1, 3, 'Tuesday',   5, 9,  2,  'CE-102',   '15:00:00', '16:00:00'),
(1, 3, 'Wednesday', 1, 7,  2,  'CE-101',   '09:00:00', '10:00:00'),
(1, 3, 'Wednesday', 2, 9,  2,  'CE-LAB-1', '10:00:00', '12:00:00'),
(1, 3, 'Wednesday', 3, 8,  2,  'CE-101',   '13:00:00', '14:00:00'),
(1, 3, 'Wednesday', 4, 10, 1,  'CE-102',   '14:00:00', '15:00:00'),
(1, 3, 'Wednesday', 5, 11, 1,  'CE-102',   '15:00:00', '16:00:00'),
(1, 3, 'Thursday',  1, 8,  2,  'CE-101',   '09:00:00', '10:00:00'),
(1, 3, 'Thursday',  2, 10, 1,  'CE-101',   '10:00:00', '11:00:00'),
(1, 3, 'Thursday',  3, 7,  2,  'CE-LAB-1', '11:15:00', '13:15:00'),
(1, 3, 'Thursday',  4, 11, 1,  'CE-102',   '14:00:00', '15:00:00'),
(1, 3, 'Thursday',  5, 9,  2,  'CE-102',   '15:00:00', '16:00:00'),
(1, 3, 'Friday',    1, 11, 1,  'CE-101',   '09:00:00', '10:00:00'),
(1, 3, 'Friday',    2, 7,  2,  'CE-101',   '10:00:00', '11:00:00'),
(1, 3, 'Friday',    3, 8,  2,  'CE-LAB-1', '11:15:00', '13:15:00'),
(1, 3, 'Friday',    4, 9,  2,  'CE-102',   '14:00:00', '15:00:00'),
(1, 3, 'Friday',    5, 10, 1,  'CE-102',   '15:00:00', '16:00:00');

-- =====================================================
-- BOOKS
-- =====================================================
-- NOTE: books.isbn is UNIQUE, so every ISBN below must be distinct.
INSERT INTO books (title, author, isbn, publisher, category, total_copies, available_copies) VALUES
('Data Structures and Algorithms',     'Thomas H. Cormen',       '978-0262033848', 'MIT Press',       'Computer Science', 5, 4),
('Introduction to Algorithms',         'Ronald L. Rivest',       '978-0262046305', 'MIT Press',       'Computer Science', 3, 3),
('Database System Concepts',           'Abraham Silberschatz',   '978-0078022159', 'McGraw-Hill',     'Computer Science', 4, 3),
('Engineering Mathematics',            'B.S. Grewal',            '978-8174091789', 'Khanna Publishers','Mathematics',      6, 5),
('Engineering Physics',                'H.C. Verma',             '978-8174091895', 'Bharti Bhawan',   'Physics',          5, 5),
('Programming in C',                   'Dennis Ritchie',         '978-0131103627', 'Prentice Hall',   'Programming',      4, 4),
('Operating System Concepts',          'Abraham Silberschatz',   '978-1118063330', 'Wiley',           'Computer Science', 3, 3),
('Computer Networks',                  'Andrew S. Tanenbaum',    '978-0132126953', 'Pearson',         'Networking',       4, 3);

-- =====================================================
-- NOTICES
-- =====================================================
INSERT INTO notices (title, content, type, target_audience, created_by, published_at) VALUES
('Welcome to ADIT - Academic Year 2026-27',       'We welcome all students to A.D. Institute of Technology for the new academic year. Classes will commence from July 1, 2026.', 'college', 'all', 1, NOW()),
('Mid-Semester Examination Schedule',             'The mid-semester examinations will be conducted from September 15-25, 2026. Students are advised to prepare accordingly.', 'college', 'student', 1, NOW()),
('Library Hours Extended',                        'The college library will remain open until 8:00 PM during examination period.', 'college', 'all', 1, NOW()),
('Annual Tech Fest - ADITECH 2026',               'ADITECH 2026 will be held on October 15-16, 2026. All students are encouraged to participate.', 'college', 'all', 1, NOW()),
('PTM Schedule',                                  'Parent-Teacher Meeting is scheduled for August 20, 2026. Parents are requested to attend.', 'college', 'student', 1, NOW());

-- =====================================================
-- HOLIDAYS
-- =====================================================
INSERT INTO holidays (name, date, type, created_by) VALUES
('Independence Day',    '2026-08-15', 'national', 1),
('Gandhi Jayanti',      '2026-10-02', 'national', 1),
('Diwali',              '2026-10-20', 'regional', 1),
('Diwali Vacation',     '2026-10-21', 'college', 1),
('Diwali Vacation',     '2026-10-22', 'college', 1),
('Diwali Vacation',     '2026-10-23', 'college', 1),
('Christmas',           '2026-12-25', 'national', 1),
('Republic Day',        '2027-01-26', 'national', 1);

-- =====================================================
-- LEAVE APPLICATIONS
-- =====================================================
INSERT INTO leave_applications (student_id, leave_type, from_date, to_date, reason, status, faculty_reviewed_by, faculty_reviewed_at, hod_reviewed_by, hod_reviewed_at) VALUES
(1, 'sick',     '2026-07-20', '2026-07-21', 'Fever and cold',       'approved', 2, NOW(), 1, NOW()),
(2, 'personal', '2026-07-25', '2026-07-25', 'Family function',      'forwarded', 2, NOW(), NULL, NULL),
(3, 'official', '2026-08-01', '2026-08-02', 'College event participation', 'pending', NULL, NULL, NULL, NULL);

-- =====================================================
-- ATTENDANCE
-- Generated for all 6 students x 5 semester-3 subjects x 10 days.
-- `marked_by` references faculty(id) (see schema), NOT users(id).
-- =====================================================
INSERT INTO attendance (student_id, subject_id, date, status, marked_by)
SELECT stu.id, sub.subject_id, d.dt,
       CASE (stu.id * 7 + sub.subject_id * 5 + d.n) % 11
            WHEN 0 THEN 'absent'
            WHEN 1 THEN 'absent'
            WHEN 2 THEN 'absent'
            WHEN 3 THEN 'late'
            ELSE 'present'
       END,
       sub.faculty_id
FROM students stu
CROSS JOIN (SELECT 7 AS subject_id, 2 AS faculty_id
            UNION ALL SELECT 8, 2
            UNION ALL SELECT 9, 2
            UNION ALL SELECT 10, 1
            UNION ALL SELECT 11, 1) sub
CROSS JOIN (
    SELECT 1 AS n, DATE_SUB(CURDATE(), INTERVAL 9 DAY) AS dt
    UNION ALL SELECT 2, DATE_SUB(CURDATE(), INTERVAL 8 DAY)
    UNION ALL SELECT 3, DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    UNION ALL SELECT 4, DATE_SUB(CURDATE(), INTERVAL 6 DAY)
    UNION ALL SELECT 5, DATE_SUB(CURDATE(), INTERVAL 5 DAY)
    UNION ALL SELECT 6, DATE_SUB(CURDATE(), INTERVAL 4 DAY)
    UNION ALL SELECT 7, DATE_SUB(CURDATE(), INTERVAL 3 DAY)
    UNION ALL SELECT 8, DATE_SUB(CURDATE(), INTERVAL 2 DAY)
    UNION ALL SELECT 9, DATE_SUB(CURDATE(), INTERVAL 1 DAY)
    UNION ALL SELECT 10, CURDATE()
) d
WHERE stu.semester = 3
  AND NOT EXISTS (
      SELECT 1 FROM (SELECT * FROM attendance) x
      WHERE x.student_id = stu.id AND x.subject_id = sub.subject_id AND x.date = d.dt
  );

-- =====================================================
-- ASSIGNMENTS
-- =====================================================
INSERT INTO assignments (title, description, subject_id, faculty_id, deadline, max_marks) VALUES
('Assignment 1: Array Operations',  'Implement various array operations including search, sort, and merge operations in C programming.',          7, 2, '2026-08-01 23:59:59', 50),
('Assignment 2: Linked Lists',      'Implement singly linked list with all basic operations: insert, delete, traverse, and reverse.',               7, 2, '2026-08-15 23:59:59', 50),
('DBMS Assignment 1: ER Diagrams',  'Create ER diagrams for a library management system and a hospital management system.',                        10, 1, '2026-08-10 23:59:59', 30),
('OOP Assignment: Class Design',    'Design a class hierarchy for a vehicle management system using inheritance and polymorphism.',                9, 2, '2026-08-05 23:59:59', 40);

-- =====================================================
-- SUBMISSIONS
-- =====================================================
INSERT INTO submissions (assignment_id, student_id, file_path, marks, feedback, status, reviewed_by) VALUES
(1, 1, 'assignments/student01_asgn1.c', 45, 'Excellent implementation with proper comments. Very clean code.',              'accepted', 2),
(1, 2, 'assignments/student02_asgn1.c', 38, 'Good effort. Could improve on error handling.',                                'accepted', 2),
(1, 3, NULL, NULL, NULL, 'pending', NULL);

-- =====================================================
-- ANNOUNCEMENTS
-- =====================================================
INSERT INTO announcements (title, content, subject_id, faculty_id) VALUES
('Data Structures Lab - Timing Change',     'The Data Structures lab scheduled for Thursday has been moved to Friday. Please note the change.',   7, 2),
('DBMS Assignment Extended',                'The deadline for DBMS Assignment 1 has been extended to August 15, 2026.',                           10, 1),
('OOP Practical Exam',                      'OOP practical examination will be held on September 5, 2026. Prepare programs on all topics covered.',9, 2);

-- =====================================================
-- SYLLABUS
-- =====================================================
INSERT INTO syllabus (subject_id, unit_number, unit_title, topics, status, uploaded_by) VALUES
(7, 1, 'Introduction to Data Structures',   'Arrays, Linked Lists, Stacks, Queues - Basic concepts and operations',                  'completed',   2),
(7, 2, 'Linear Data Structures',            'Stacks and Queues - Applications, Circular Queue, Deque',                               'in_progress', 2),
(7, 3, 'Non-Linear Data Structures',        'Trees, Binary Trees, BST, AVL Trees, Heap',                                            'not_started', 2),
(7, 4, 'Graph Algorithms',                  'Graph Traversal, BFS, DFS, Shortest Path, MST',                                         'not_started', 2),
(7, 5, 'Sorting and Searching',             'Bubble Sort, Quick Sort, Merge Sort, Binary Search, Hashing',                           'not_started', 2);

-- =====================================================
-- SYSTEM SETTINGS
-- =====================================================
INSERT INTO system_settings (setting_key, setting_value, updated_by) VALUES
('college_name',                'A.D. Institute of Technology (ADIT)', 1),
('college_address',             'ADIT Campus, Ahmedabad, Gujarat, India', 1),
('college_phone',               '+91-79-23456789', 1),
('college_email',               'info@adit.edu', 1),
('academic_year',               '2026-27', 1),
('min_attendance_percentage',   '75', 1),
('library_fine_per_day',        '5', 1),
('max_books_issue',             '3', 1),
('book_issue_duration_days',    '14', 1),
('razorpay_key_id',             'rzp_test_xxxxxxxxxxxx', 1);

-- =====================================================
-- LAB MANUALS  (Phase 2 - student lab manual flow)
-- =====================================================
INSERT INTO lab_manuals (id, title, subject_id, experiment_number, description, faculty_id) VALUES
(1, 'Experiment 1: Array and String Operations',   7, 1, 'Write C programs to perform array sorting, searching and string manipulation.', 2),
(2, 'Experiment 2: Stack Implementation',        7, 2, 'Implement stack using array and linked list with push, pop and peek operations.', 2),
(3, 'Experiment 3: Queue and Circular Queue',     7, 3, 'Implement linear queue and circular queue with overflow handling.', 2),
(4, 'Experiment 1: ER Diagram Tool',             10, 1, 'Draw ER diagrams for real-world systems and normalise to 3NF.', 1),
(5, 'Experiment 2: SQL Joins and Subqueries',     10, 2, 'Write SQL queries using joins, subqueries and aggregate functions.', 1),
(6, 'Experiment 1: Class and Object Design',       9, 1, 'Design classes in C++ with constructors, destructors and operator overloading.', 2);

INSERT INTO lab_submissions (lab_manual_id, student_id, file_path, marks, feedback, status, reviewed_by) VALUES
(1, 1, 'lab/lab01_arjun_exp1.c',  28, 'Well structured code with proper comments.',              'accepted', 2),
(1, 2, 'lab/lab01_ananya_exp1.c', 24, 'Correct output. Improve variable naming.',              'accepted', 2),
(1, 3, 'lab/lab01_karan_exp1.c',  NULL, NULL, 'pending', NULL),
(2, 1, 'lab/lab01_arjun_exp2.c',  NULL, NULL, 'pending', NULL);

-- =====================================================
-- STUDY MATERIALS  (Phase 3 - faculty uploads)
-- =====================================================
INSERT INTO study_materials (title, description, subject_id, faculty_id, file_path, file_type, topic) VALUES
('Data Structures Unit 1 Notes',   'Complete notes on arrays, linked lists, stacks and queues.',        7, 2, 'materials/ds_unit1_notes.pdf',  'pdf',         'Unit 1'),
('Data Structures Unit 2 Notes',   'Linear data structures applications and deque.',                    7, 2, 'materials/ds_unit2_notes.pdf',  'pdf',         'Unit 2'),
('OOP Lecture Slides',            'Class design, inheritance and polymorphism slides.',               9, 2, 'materials/oop_slides.ppt',      'ppt',         'Unit 1'),
('DBMS Normalization Guide',      'Step by step 1NF to BCNF normalization with examples.',            10, 1, 'materials/dbms_normalization.pdf', 'pdf',      'Unit 2'),
('Digital Electronics Lab Manual', 'Experiment procedure sheet for digital electronics.',               8, 1, 'materials/de_lab_manual.pdf',   'pdf',         'Lab'),
('Discrete Mathematics Formula',   'Quick reference sheet of important formulas.',                      11, 1, 'materials/discrete_formula.pdf', 'pdf',       'Unit 1');

-- =====================================================
-- UNIT TESTS + EXTERNAL MARKS  (Phase 3 marks / Phase 2 results)
-- Subjects 7-11 = semester 3, all 6 students, 2 unit tests each.
-- =====================================================
INSERT INTO unit_tests (student_id, subject_id, test_number, marks_obtained, max_marks, entered_by)
SELECT stu.id, sub.id, t.test_number,
       ROUND(t.max_marks * (0.55 + 0.40 * ((stu.id * 7 + sub.id * 3 + t.test_number * 5) % 10) / 10), 2),
       t.max_marks, t.faculty_id
FROM students stu
CROSS JOIN (SELECT 7 AS id, 30 AS max_marks, 2 AS faculty_id
            UNION ALL SELECT 8, 30, 2
            UNION ALL SELECT 9, 30, 2
            UNION ALL SELECT 10, 30, 1
            UNION ALL SELECT 11, 30, 1) sub
CROSS JOIN (SELECT 1 AS test_number, 30 AS max_marks, 2 AS faculty_id
            UNION ALL SELECT 2, 30, 2) t
WHERE stu.semester = 3;

INSERT INTO external_marks (student_id, subject_id, marks_obtained, max_marks, entered_by)
SELECT stu.id, sub.id,
       ROUND(100 * (0.50 + 0.45 * ((stu.id * 11 + sub.id * 13) % 10) / 10), 2),
       100, 1
FROM students stu
CROSS JOIN (SELECT 7 AS id UNION ALL SELECT 8 UNION ALL SELECT 9
            UNION ALL SELECT 10 UNION ALL SELECT 11) sub
WHERE stu.semester = 3;

-- =====================================================
-- RESULTS  (Phase 2 - student results / CGPA)
-- total_credits / total_grade_points are stored so CGPA is a real
-- cumulative credit-weighted average across semesters.
-- =====================================================
INSERT INTO results (student_id, semester_id, sgpa, total_credits, total_grade_points, cgpa, status, published_at)
SELECT r.student_id, 3,
       ROUND(r.tot_gp / NULLIF(r.tot_cr, 0), 2),
       r.tot_cr,
       r.tot_gp,
       ROUND(r.tot_gp / NULLIF(r.tot_cr, 0), 2),
       IF(r.tot_gp / NULLIF(r.tot_cr, 0) >= 4.0, 'pass', 'fail'),
       NOW()
FROM (
    SELECT em.student_id,
           SUM(s.credits) AS tot_cr,
           SUM(s.credits * (
                CASE
                  WHEN ( (SELECT MAX(u1.marks_obtained) FROM unit_tests u1
                          WHERE u1.student_id = em.student_id AND u1.subject_id = em.subject_id)
                          + COALESCE((SELECT MAX(u2.marks_obtained) FROM unit_tests u2
                                      WHERE u2.student_id = em.student_id AND u2.subject_id = em.subject_id
                                        AND u2.test_number <> (SELECT MAX(u3.test_number) FROM unit_tests u3
                                                                WHERE u3.student_id = em.student_id AND u3.subject_id = em.subject_id
                                                                  AND u3.marks_obtained = (SELECT MAX(u1.marks_obtained) FROM unit_tests u1
                                                                                          WHERE u1.student_id = em.student_id AND u1.subject_id = em.subject_id))), 0)
                        ) / 2 + em.marks_obtained ) * 100 / 160 >= 90 THEN 10
                  WHEN ( (SELECT MAX(u1.marks_obtained) FROM unit_tests u1
                          WHERE u1.student_id = em.student_id AND u1.subject_id = em.subject_id)
                          + COALESCE((SELECT MAX(u2.marks_obtained) FROM unit_tests u2
                                      WHERE u2.student_id = em.student_id AND u2.subject_id = em.subject_id
                                        AND u2.test_number <> (SELECT MAX(u3.test_number) FROM unit_tests u3
                                                                WHERE u3.student_id = em.student_id AND u3.subject_id = em.subject_id
                                                                  AND u3.marks_obtained = (SELECT MAX(u1.marks_obtained) FROM unit_tests u1
                                                                                          WHERE u1.student_id = em.student_id AND u1.subject_id = em.subject_id))), 0)
                        ) / 2 + em.marks_obtained ) * 100 / 160 >= 80 THEN 9
                  WHEN ( (SELECT MAX(u1.marks_obtained) FROM unit_tests u1
                          WHERE u1.student_id = em.student_id AND u1.subject_id = em.subject_id)
                          + COALESCE((SELECT MAX(u2.marks_obtained) FROM unit_tests u2
                                      WHERE u2.student_id = em.student_id AND u2.subject_id = em.subject_id
                                        AND u2.test_number <> (SELECT MAX(u3.test_number) FROM unit_tests u3
                                                                WHERE u3.student_id = em.student_id AND u3.subject_id = em.subject_id
                                                                  AND u3.marks_obtained = (SELECT MAX(u1.marks_obtained) FROM unit_tests u1
                                                                                          WHERE u1.student_id = em.student_id AND u1.subject_id = em.subject_id))), 0)
                        ) / 2 + em.marks_obtained ) * 100 / 160 >= 70 THEN 8
                  WHEN ( (SELECT MAX(u1.marks_obtained) FROM unit_tests u1
                          WHERE u1.student_id = em.student_id AND u1.subject_id = em.subject_id)
                          + COALESCE((SELECT MAX(u2.marks_obtained) FROM unit_tests u2
                                      WHERE u2.student_id = em.student_id AND u2.subject_id = em.subject_id
                                        AND u2.test_number <> (SELECT MAX(u3.test_number) FROM unit_tests u3
                                                                WHERE u3.student_id = em.student_id AND u3.subject_id = em.subject_id
                                                                  AND u3.marks_obtained = (SELECT MAX(u1.marks_obtained) FROM unit_tests u1
                                                                                          WHERE u1.student_id = em.student_id AND u1.subject_id = em.subject_id))), 0)
                        ) / 2 + em.marks_obtained ) * 100 / 160 >= 60 THEN 7
                  WHEN ( (SELECT MAX(u1.marks_obtained) FROM unit_tests u1
                          WHERE u1.student_id = em.student_id AND u1.subject_id = em.subject_id)
                          + COALESCE((SELECT MAX(u2.marks_obtained) FROM unit_tests u2
                                      WHERE u2.student_id = em.student_id AND u2.subject_id = em.subject_id
                                        AND u2.test_number <> (SELECT MAX(u3.test_number) FROM unit_tests u3
                                                                WHERE u3.student_id = em.student_id AND u3.subject_id = em.subject_id
                                                                  AND u3.marks_obtained = (SELECT MAX(u1.marks_obtained) FROM unit_tests u1
                                                                                          WHERE u1.student_id = em.student_id AND u1.subject_id = em.subject_id))), 0)
                        ) / 2 + em.marks_obtained ) * 100 / 160 >= 50 THEN 6
                  WHEN ( (SELECT MAX(u1.marks_obtained) FROM unit_tests u1
                          WHERE u1.student_id = em.student_id AND u1.subject_id = em.subject_id)
                          + COALESCE((SELECT MAX(u2.marks_obtained) FROM unit_tests u2
                                      WHERE u2.student_id = em.student_id AND u2.subject_id = em.subject_id
                                        AND u2.test_number <> (SELECT MAX(u3.test_number) FROM unit_tests u3
                                                                WHERE u3.student_id = em.student_id AND u3.subject_id = em.subject_id
                                                                  AND u3.marks_obtained = (SELECT MAX(u1.marks_obtained) FROM unit_tests u1
                                                                                          WHERE u1.student_id = em.student_id AND u1.subject_id = em.subject_id))), 0)
                        ) / 2 + em.marks_obtained ) * 100 / 160 >= 40 THEN 5
                  ELSE 0
                END)) AS tot_gp
    FROM external_marks em
    INNER JOIN subjects s ON s.id = em.subject_id
    WHERE em.student_id IN (SELECT id FROM students WHERE semester = 3)
    GROUP BY em.student_id
) r;

-- =====================================================
-- FEE PAYMENTS  (Phase 4 - fee history / receipts)
-- =====================================================
INSERT INTO fee_payments (student_id, fee_structure_id, amount, payment_method, razorpay_order_id, razorpay_payment_id, status, paid_at, created_at) VALUES
(1, 1, 45000.00, 'razorpay', 'order_seed_0001', 'pay_seed_0001', 'completed', '2026-07-10 10:15:00', '2026-07-10 10:14:00'),
(1, 2,  5000.00, 'razorpay', 'order_seed_0002', 'pay_seed_0002', 'completed', '2026-07-10 10:18:00', '2026-07-10 10:17:00'),
(1, 3,  1000.00, 'razorpay', 'order_seed_0003', 'pay_seed_0003', 'completed', '2026-07-10 10:20:00', '2026-07-10 10:19:00'),
(2, 1, 45000.00, 'razorpay', 'order_seed_0004', 'pay_seed_0004', 'completed', '2026-07-12 09:05:00', '2026-07-12 09:04:00'),
(2, 2,  5000.00, 'razorpay', 'order_seed_0005', 'pay_seed_0005', 'completed', '2026-07-12 09:08:00', '2026-07-12 09:07:00'),
(3, 1, 45000.00, 'razorpay', 'order_seed_0006', 'pay_seed_0006', 'completed', '2026-07-14 14:30:00', '2026-07-14 14:29:00'),
(4, 1, 45000.00, 'razorpay', 'order_seed_0007', NULL, 'pending', NULL, '2026-07-20 11:00:00');

-- =====================================================
-- LIBRARY ISSUES  (Phase 6 preview - keeps book copies consistent)
-- =====================================================
INSERT INTO book_issues (book_id, student_id, issue_date, due_date, return_date, fine_amount, status) VALUES
(1, 1, CURDATE() - INTERVAL 5 DAY,  CURDATE() + INTERVAL 9 DAY,  NULL, 0, 'issued'),
(4, 2, CURDATE() - INTERVAL 3 DAY,  CURDATE() + INTERVAL 11 DAY, NULL, 0, 'issued'),
(6, 1, CURDATE() - INTERVAL 20 DAY, CURDATE() - INTERVAL 6 DAY,  CURDATE() - INTERVAL 8 DAY, 40, 'returned'),
(3, 3, CURDATE() - INTERVAL 18 DAY, CURDATE() - INTERVAL 4 DAY,  NULL, 0, 'issued');

-- keep available_copies consistent with the issues above
UPDATE books SET available_copies = 3 WHERE id = 1;
UPDATE books SET available_copies = 4 WHERE id = 4;
UPDATE books SET available_copies = 3 WHERE id = 6;
UPDATE books SET available_copies = 2 WHERE id = 3;

-- =====================================================
-- AUDIT LOGS
-- =====================================================
INSERT INTO audit_logs (user_id, action, table_name, record_id, ip_address, created_at) VALUES
(1, 'CREATE', 'users',             1,  '192.168.1.100', NOW()),
(1, 'CREATE', 'departments',       1,  '192.168.1.100', NOW()),
(1, 'CREATE', 'courses',           1,  '192.168.1.100', NOW()),
(3, 'MARK_ATTENDANCE', 'attendance',NULL,'192.168.1.101', NOW()),
(1, 'UPDATE', 'system_settings',   1,  '192.168.1.100', NOW());

SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- DONE! All tables created with seed data
-- =====================================================
-- ACCOUNTS ARE LOCKED ('!locked!' password hash).
-- Run the installer once to set real passwords and print credentials:
--     php database/install.php                  (CLI)
--     database/install.php?key=<INSTALL_KEY>    (browser)
-- =====================================================
