<?php
/**
 * ADIT CMS - API Router
 * Simple router that maps URIs to controller methods
 */

// Load controllers
require_once __DIR__ . '/../controllers/AuthController.php';
require_once __DIR__ . '/../controllers/StudentController.php';
require_once __DIR__ . '/../controllers/FacultyController.php';
require_once __DIR__ . '/../controllers/AttendanceController.php';
require_once __DIR__ . '/../controllers/AssignmentController.php';
require_once __DIR__ . '/../controllers/FeeController.php';
require_once __DIR__ . '/../controllers/LibraryController.php';
require_once __DIR__ . '/../controllers/ExamController.php';
require_once __DIR__ . '/../controllers/TimetableController.php';
require_once __DIR__ . '/../controllers/NoticeController.php';
require_once __DIR__ . '/../controllers/AdminController.php';
require_once __DIR__ . '/../controllers/DepartmentController.php';
require_once __DIR__ . '/../controllers/LeaveApplicationController.php';
require_once __DIR__ . '/../controllers/LabManualController.php';
require_once __DIR__ . '/../controllers/StudyMaterialController.php';
require_once __DIR__ . '/../controllers/SyllabusController.php';
require_once __DIR__ . '/../controllers/AnnouncementController.php';
require_once __DIR__ . '/../controllers/HODController.php';
require_once __DIR__ . '/../controllers/ClassroomController.php';
require_once __DIR__ . '/../controllers/CourseController.php';
require_once __DIR__ . '/../controllers/PublicController.php';

// Load helpers (defensive - don't crash if file missing)
if (file_exists(__DIR__ . '/../helpers/EmailHelper.php')) {
    require_once __DIR__ . '/../helpers/EmailHelper.php';
}
if (!class_exists('EmailHelper')) {
    class EmailHelper {
        public static function send($to, $subject, $html) { error_log("ADIT: EmailHelper not loaded"); return false; }
        public static function sendPasswordReset($email, $token) { return false; }
        public static function sendVerification($email, $token) { return false; }
    }
}

// Load models
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Student.php';
require_once __DIR__ . '/../models/Faculty.php';
require_once __DIR__ . '/../models/Department.php';
require_once __DIR__ . '/../models/Attendance.php';
require_once __DIR__ . '/../models/Assignment.php';
require_once __DIR__ . '/../models/Fee.php';
require_once __DIR__ . '/../models/Library.php';
require_once __DIR__ . '/../models/Exam.php';
require_once __DIR__ . '/../models/Timetable.php';
require_once __DIR__ . '/../models/Notice.php';
require_once __DIR__ . '/../models/LeaveApplication.php';
require_once __DIR__ . '/../models/LabManual.php';
require_once __DIR__ . '/../models/StudyMaterial.php';
require_once __DIR__ . '/../models/Syllabus.php';
require_once __DIR__ . '/../models/Announcement.php';
require_once __DIR__ . '/../models/Classroom.php';
require_once __DIR__ . '/../models/Course.php';
require_once __DIR__ . '/../models/Subject.php';

$routes = [
    // Auth routes (public)
    'POST /auth/register'          => ['AuthController', 'register', false],
    'POST /auth/login'             => ['AuthController', 'login', false],
    'POST /auth/forgot-password'   => ['AuthController', 'forgotPassword', false],
    'POST /auth/reset-password'    => ['AuthController', 'resetPassword', false],
    'GET /auth/verify-email'       => ['AuthController', 'verifyEmail', false],

    // Auth routes (protected)
    'GET /auth/me'                 => ['AuthController', 'me', true],
    'POST /auth/logout'            => ['AuthController', 'logout', true],
    'PUT /auth/profile'            => ['AuthController', 'updateProfile', true],
    'POST /auth/change-password'   => ['AuthController', 'changePassword', true],

    // Public data routes (for registration form)
    'GET /departments'             => ['DepartmentController', 'publicIndex', false],
    'GET /public/stats'            => ['PublicController', 'stats', false],

    // Department routes (protected)
    'GET /departments/manage'       => ['DepartmentController', 'index', true, ['admin', 'hod']],
    'GET /departments/([^/]+)'      => ['DepartmentController', 'show', true, ['admin', 'hod']],
    'POST /departments'             => ['DepartmentController', 'store', true, ['admin']],
    'PUT /departments/([^/]+)'      => ['DepartmentController', 'update', true, ['admin']],
    'DELETE /departments/([^/]+)'   => ['DepartmentController', 'destroy', true, ['admin']],

    // Course routes
    'GET /courses'                  => ['CourseController', 'index', true],
    // Role-usable subject list for pickers. Declared after /courses so the
    // literal path cannot be swallowed by the more specific rule.
    'GET /courses/subjects'         => ['CourseController', 'subjects', true],

    // Classroom routes
    'GET /classrooms'               => ['ClassroomController', 'index', true],
    'POST /classrooms'              => ['ClassroomController', 'store', true, ['admin']],
    'PUT /classrooms/([^/]+)'       => ['ClassroomController', 'update', true, ['admin']],
    'DELETE /classrooms/([^/]+)'    => ['ClassroomController', 'destroy', true, ['admin']],

    // Student routes
    'GET /students'                => ['StudentController', 'index', true, ['admin', 'hod', 'faculty']],
    'POST /students/([^/]+)/photo' => ['StudentController', 'uploadPhoto', true],
    'GET /students/([^/]+)'        => ['StudentController', 'show', true],
    'POST /students'               => ['StudentController', 'store', true, ['admin']],
    'PUT /students/([^/]+)'        => ['StudentController', 'update', true, ['admin', 'student']],
    'DELETE /students/([^/]+)'     => ['StudentController', 'destroy', true, ['admin']],

    // Faculty routes
    'GET /faculty/subjects'        => ['FacultyController', 'subjects', true, ['faculty', 'hod', 'admin']],
    'GET /faculty/assigned-classes' => ['FacultyController', 'assignedClasses', true, ['faculty']],
    'GET /faculty'                 => ['FacultyController', 'index', true, ['admin', 'hod']],
    'GET /faculty/([^/]+)'         => ['FacultyController', 'show', true],
    'POST /faculty'                => ['FacultyController', 'store', true, ['admin']],
    'PUT /faculty/([^/]+)'         => ['FacultyController', 'update', true, ['admin', 'faculty']],
    'DELETE /faculty/([^/]+)'      => ['FacultyController', 'destroy', true, ['admin']],

    // Attendance routes
    'POST /attendance/mark'        => ['AttendanceController', 'mark', true, ['faculty', 'hod', 'admin']],
    'PUT /attendance/([^/]+)'      => ['AttendanceController', 'update', true, ['faculty', 'hod', 'admin']],
    'GET /attendance'              => ['AttendanceController', 'index', true],
    'GET /attendance/report'       => ['AttendanceController', 'report', true, ['faculty', 'hod', 'admin']],
    'GET /attendance/student/([^/]+)/summary' => ['AttendanceController', 'getStudentSummary', true],
    'GET /attendance/student/([^/]+)/calendar' => ['AttendanceController', 'getStudentCalendar', true],
    'GET /attendance/calendar' => ['AttendanceController', 'calendar', true],

    // Assignment routes
    'GET /assignments'             => ['AssignmentController', 'index', true],
    'POST /assignments'            => ['AssignmentController', 'store', true, ['faculty', 'hod', 'admin']],
    'PUT /assignments/([^/]+)'     => ['AssignmentController', 'update', true, ['faculty', 'admin']],
    'DELETE /assignments/([^/]+)'  => ['AssignmentController', 'destroy', true, ['faculty', 'admin']],
    'POST /assignments/([^/]+)/submit' => ['AssignmentController', 'submit', true, ['student']],
    'GET /assignments/([^/]+)/submissions' => ['AssignmentController', 'submissions', true, ['faculty', 'admin']],
    'GET /assignments/submissions/([^/]+)' => ['AssignmentController', 'studentSubmissions', true],
    'PUT /assignments/submissions/([^/]+)/review' => ['AssignmentController', 'reviewSubmission', true, ['faculty', 'admin']],

    // Fee routes
    'GET /fees/structure'          => ['FeeController', 'getStructure', true],
    'POST /fees/structure'         => ['FeeController', 'createStructure', true, ['admin', 'hod']],
    'PUT /fees/structure/([^/]+)'  => ['FeeController', 'updateStructure', true, ['admin', 'hod']],
    'DELETE /fees/structure/([^/]+)' => ['FeeController', 'deleteStructure', true, ['admin']],
    'POST /fees/create-order'      => ['FeeController', 'createOrder', true, ['student']],
    'POST /fees/verify-payment'    => ['FeeController', 'verifyPayment', true, ['student']],
    'GET /fees/payments/([^/]+)'   => ['FeeController', 'getPayments', true],
    'GET /fees/receipt/([^/]+)'    => ['FeeController', 'getReceipt', true],
    'GET /fees/receipt/([^/]+)/download' => ['FeeController', 'downloadReceipt', true],
    'GET /fees/all-payments'       => ['FeeController', 'getAllPayments', true, ['admin']],
    'GET /fees/all-structures'     => ['FeeController', 'getAllStructures', true, ['admin', 'hod']],
    'GET /fees/reports'            => ['FeeController', 'getFeeReport', true, ['admin']],

    // Library routes
    'GET /library/books'           => ['LibraryController', 'getBooks', true],
    'POST /library/books'          => ['LibraryController', 'addBook', true, ['admin', 'librarian']],
    'POST /library/issue'          => ['LibraryController', 'issueBook', true, ['admin', 'librarian']],
    'POST /library/return'         => ['LibraryController', 'returnBook', true, ['admin', 'librarian']],
    'GET /library/history/([^/]+)' => ['LibraryController', 'getHistory', true],
    'GET /library/fines/([^/]+)'   => ['LibraryController', 'getFines', true],

    // Marks routes
    'GET /marks'                      => ['ExamController', 'getResults', true],
    'POST /marks/internal'            => ['ExamController', 'enterInternalMarks', true, ['faculty', 'admin']],
    'PUT /marks/internal/([^/]+)'     => ['ExamController', 'updateInternalMarks', true, ['faculty', 'admin']],

    // Exam routes
    'POST /exams/internal-marks'      => ['ExamController', 'enterInternalMarks', true, ['faculty', 'admin']],
    'POST /exams/external-marks'      => ['ExamController', 'enterExternalMarks', true, ['admin', 'faculty']],
    'GET /exams/results'              => ['ExamController', 'getResults', true],
    'GET /exams/performance'          => ['ExamController', 'getClassPerformance', true, ['faculty', 'hod', 'admin']],
    'GET /exams/hall-ticket/([^/]+)'  => ['ExamController', 'getHallTicket', true, ['student', 'admin']],
    'POST /exams/publish-results'     => ['ExamController', 'publishResults', true, ['admin']],
    'GET /exams/analytics/([^/]+)' => ['ExamController', 'getPerformanceAnalytics', true, ['faculty', 'hod', 'admin']],

    // Timetable routes
    'GET /timetable'               => ['TimetableController', 'index', true],
    'POST /timetable'              => ['TimetableController', 'store', true, ['admin', 'hod']],
    'PUT /timetable/([^/]+)'       => ['TimetableController', 'update', true, ['admin', 'hod']],
    'DELETE /timetable/([^/]+)'    => ['TimetableController', 'destroy', true, ['admin', 'hod']],

    // Notice routes
    'GET /notices'                 => ['NoticeController', 'index', true],
    'POST /notices'                => ['NoticeController', 'store', true, ['admin', 'hod', 'faculty']],
    'PUT /notices/([^/]+)'         => ['NoticeController', 'update', true, ['admin', 'hod']],
    'DELETE /notices/([^/]+)'      => ['NoticeController', 'destroy', true, ['admin']],

    // Leave Application routes
    'GET /leave-applications'                  => ['LeaveApplicationController', 'index', true],
    'POST /leave-applications'                 => ['LeaveApplicationController', 'store', true, ['student']],
    'PUT /leave-applications/([^/]+)'          => ['LeaveApplicationController', 'update', true, ['faculty', 'hod', 'admin']],
    'PUT /leave-applications/([^/]+)/withdraw' => ['LeaveApplicationController', 'withdraw', true, ['student']],
    'GET /leave-applications/([^/]+)/document' => ['LeaveApplicationController', 'getDocument', true],

    // Lab Manual routes
    'GET /lab-manuals'                         => ['LabManualController', 'index', true],
    'POST /lab-manuals'                        => ['LabManualController', 'store', true, ['faculty', 'hod', 'admin']],
    'PUT /lab-manuals/([^/]+)'                 => ['LabManualController', 'update', true, ['faculty', 'admin']],
    'DELETE /lab-manuals/([^/]+)'              => ['LabManualController', 'destroy', true, ['faculty', 'admin']],
    'POST /lab-manuals/([^/]+)/submit'         => ['LabManualController', 'submit', true, ['student']],
    'GET /lab-manuals/([^/]+)/submissions'     => ['LabManualController', 'submissions', true, ['faculty', 'admin']],
    'PUT /lab-manuals/submissions/([^/]+)/review' => ['LabManualController', 'reviewSubmission', true, ['faculty', 'admin']],

    // Study Material routes
    'GET /materials'                           => ['StudyMaterialController', 'index', true],
    'POST /materials'                          => ['StudyMaterialController', 'store', true, ['faculty', 'hod', 'admin']],
    'PUT /materials/([^/]+)'                   => ['StudyMaterialController', 'update', true, ['faculty', 'admin']],
    'DELETE /materials/([^/]+)'                => ['StudyMaterialController', 'destroy', true, ['faculty', 'admin']],
    // requiresAuth = false: the controller accepts EITHER a session JWT or a
    // signed ?dl_token=. With auth enforced here the token path was
    // unreachable, and with it removed the controller calls
    // AuthMiddleware::handle() itself for the no-token case.
    'GET /materials/([^/]+)/download'          => ['StudyMaterialController', 'download', false],

    // Syllabus routes
    'GET /syllabus'                            => ['SyllabusController', 'index', true],
    'POST /syllabus'                           => ['SyllabusController', 'store', true, ['faculty', 'hod', 'admin']],
    'PUT /syllabus/([^/]+)'                    => ['SyllabusController', 'update', true, ['faculty', 'admin']],
    'DELETE /syllabus/([^/]+)'                 => ['SyllabusController', 'destroy', true, ['faculty', 'admin']],
    'GET /syllabus/subject/([^/]+)'            => ['SyllabusController', 'getBySubject', true],
    'GET /syllabus/([^/]+)'                    => ['SyllabusController', 'show', true],

    // Announcement routes
    'GET /announcements'                       => ['AnnouncementController', 'index', true],
    'POST /announcements'                      => ['AnnouncementController', 'store', true, ['faculty', 'hod', 'admin']],
    'PUT /announcements/([^/]+)'               => ['AnnouncementController', 'update', true, ['faculty', 'admin']],
    'DELETE /announcements/([^/]+)'            => ['AnnouncementController', 'destroy', true, ['faculty', 'admin']],
    'POST /announcements/([^/]+)/read'         => ['AnnouncementController', 'markRead', true],
    'GET /announcements/([^/]+)/reads'         => ['AnnouncementController', 'readStatus', true, ['faculty', 'hod', 'admin']],

    // Student-specific routes
    'GET /exams/student-marks'     => ['ExamController', 'getStudentMarks', true, ['student']],
    'GET /lab-manuals/student-submissions' => ['LabManualController', 'studentSubmissions', true, ['student']],
    'GET /notices/student'         => ['NoticeController', 'studentNotices', true, ['student']],

    // HOD routes
    'GET /hod/dashboard'            => ['HODController', 'dashboard', true, ['hod']],
    'GET /hod/students'             => ['HODController', 'getDepartmentStudents', true, ['hod']],
    'GET /hod/faculty'              => ['HODController', 'getDepartmentFaculty', true, ['hod']],
    'GET /hod/subjects'             => ['HODController', 'getDepartmentSubjects', true, ['hod']],
    'GET /hod/faculty-load'         => ['HODController', 'getFacultyLoad', true, ['hod']],
    'GET /hod/fee-report'           => ['HODController', 'getFeeReport', true, ['hod']],
    'GET /hod/timetable'            => ['HODController', 'getDepartmentTimetable', true, ['hod']],
    'POST /hod/add-student'             => ['HODController', 'addStudent', true, ['hod']],
    'POST /hod/add-faculty'             => ['HODController', 'addFaculty', true, ['hod']],
    'POST /hod/add-subject'             => ['HODController', 'addSubject', true, ['hod']],
    'PUT /hod/update-subject/([^/]+)'   => ['HODController', 'updateSubject', true, ['hod']],
    'DELETE /hod/delete-subject/([^/]+)' => ['HODController', 'deleteSubject', true, ['hod']],
    'PUT /hod/assign-faculty/([^/]+)'   => ['HODController', 'assignSubjectFaculty', true, ['hod']],
    'GET /hod/classrooms'               => ['HODController', 'getDepartmentClassrooms', true, ['hod']],
    'POST /hod/add-classroom'           => ['HODController', 'addClassroom', true, ['hod']],
    'PUT /hod/update-classroom/([^/]+)' => ['HODController', 'updateClassroom', true, ['hod']],
    'DELETE /hod/delete-classroom/([^/]+)' => ['HODController', 'deleteClassroom', true, ['hod']],
    'POST /hod/add-timetable'           => ['HODController', 'addTimetableEntry', true, ['hod']],
    'DELETE /hod/delete-timetable/([^/]+)' => ['HODController', 'deleteTimetableEntry', true, ['hod']],
    'GET /hod/academic-trends'          => ['HODController', 'getAcademicTrends', true, ['hod']],
    'GET /hod/reports'                  => ['HODController', 'getDepartmentReports', true, ['hod']],

    // Admin routes
    'GET /admin/dashboard'         => ['AdminController', 'dashboard', true, ['admin']],
    'GET /admin/users'             => ['AdminController', 'getUsers', true, ['admin']],
    'POST /admin/backup'           => ['AdminController', 'backup', true, ['admin']],
    'GET /admin/audit-logs'        => ['AdminController', 'getAuditLogs', true, ['admin']],
    'GET /admin/settings'          => ['AdminController', 'getSettings', true, ['admin']],
    'PUT /admin/settings'          => ['AdminController', 'updateSettings', true, ['admin']],
];

// Match the route
$matched = false;
foreach ($routes as $pattern => $config) {
    [$httpMethod, $uriPattern] = explode(' ', $pattern, 2);
    
    if ($method !== $httpMethod) continue;
    
    $regex = '#^' . $uriPattern . '$#';
    if (preg_match($regex, $uri, $matches)) {
        array_shift($matches);
        
        [$controllerName, $methodName, $requiresAuth] = $config;
        $allowedRoles = $config[3] ?? null;

        if ($requiresAuth) {
            AuthMiddleware::handle();
            
            if ($allowedRoles) {
                RoleMiddleware::requireRole($allowedRoles);
            }
        }

        $_REQUEST['route_params'] = $matches;

        $controller = new $controllerName();
        call_user_func_array([$controller, $methodName], $matches);
        
        $matched = true;
        break;
    }
}

if (!$matched) {
    Response::notFound('API endpoint not found: ' . $method . ' ' . $uri);
}
