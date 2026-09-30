import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/layout/DashboardLayout';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';
import RegisterPage from './pages/auth/RegisterPage';
import HomePage from './pages/HomePage';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentAssignments from './pages/student/StudentAssignments';
import StudentAssignmentDetail from './pages/student/StudentAssignmentDetail';
import StudentNotices from './pages/student/StudentNotices';
import StudentLeave from './pages/student/StudentLeave';
import StudentResults from './pages/student/StudentResults';
import StudentSyllabus from './pages/student/StudentSyllabus';
import StudentLabManualList from './pages/student/StudentLabManualList';
import StudentLabManualDetail from './pages/student/StudentLabManualDetail';
import StudentLabManualStatus from './pages/student/StudentLabManualStatus';
import StudentTimetable from './pages/student/StudentTimetable';
import StudentFees from './pages/student/StudentFees';
import StudentLibrary from './pages/student/StudentLibrary';
import StudentProfile from './pages/student/StudentProfile';
import FacultyDashboard from './pages/faculty/FacultyDashboard';
import FacultyAttendance from './pages/faculty/FacultyAttendance';
import FacultyAssignments from './pages/faculty/FacultyAssignments';
import FacultyMaterials from './pages/faculty/FacultyMaterials';
import FacultyMarks from './pages/faculty/FacultyMarks';
import FacultyNotices from './pages/faculty/FacultyNotices';
import FacultyAttendanceReports from './pages/faculty/FacultyAttendanceReports';
import FacultyAnnouncements from './pages/faculty/FacultyAnnouncements';
import FacultyLabManuals from './pages/faculty/FacultyLabManuals';
import FacultyLeave from './pages/faculty/FacultyLeave';
import FacultyProfile from './pages/faculty/FacultyProfile';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminFees from './pages/admin/AdminFees';
import AdminTimetable from './pages/admin/AdminTimetable';
import AdminFaculty from './pages/admin/AdminFaculty';
import HODDashboard from './pages/hod/HODDashboard';
import HODStudents from './pages/hod/HODStudents';
import HODFaculty from './pages/hod/HODFaculty';
import HODSubjects from './pages/hod/HODSubjects';
import HODFeeReport from './pages/hod/HODFeeReport';
import HODLeave from './pages/hod/HODLeave';
import HODClassrooms from './pages/hod/HODClassrooms';
import HODTimetable from './pages/hod/HODTimetable';
import HODReports from './pages/hod/HODReports';
import PageHeader from './components/common/PageHeader';
import { BookOpen, SettingsIcon, UsersIcon, FacultyIcon, FeeIcon, TimetableIcon, ExamIcon, NoticeIcon, LibraryIcon, ReportIcon, DepartmentIcon, AttendanceIcon, AssignmentIcon, MarksIcon, MaterialIcon, SubjectIcon } from './utils/icons';

function PlaceholderPage({ title, description, icon: Icon }) {
  return (
    <div>
      <PageHeader title={title} subtitle={description || 'This page is under development.'} />
      <div className="card flex flex-col items-center justify-center py-20">
        <div className="w-20 h-20 rounded-2xl bg-surface-overlay border border-surface-border flex items-center justify-center mb-5 text-muted-dark">
          {Icon ? <Icon size={36} /> : <BookOpen size={36} />}
        </div>
        <h2 className="text-xl font-semibold text-muted-light mb-2">{title}</h2>
        <p className="text-muted text-sm">Coming soon in the next phase.</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            {/* Reachable while authenticated by any role: AuthMiddleware allows
                /auth/change-password even for an account that must still
                replace its provisioning password. */}
            <Route path="/change-password" element={<ChangePasswordPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<HomePage />} />

            {/* ========== ADMIN ROUTES ========== */}
            <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><PlaceholderPage title="Student Management" description="Add, edit, and manage all students." icon={UsersIcon} /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/faculty" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFaculty /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/departments" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><PlaceholderPage title="Department Management" icon={DepartmentIcon} /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/fees" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminFees /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/timetable" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><AdminTimetable /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/exams" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><PlaceholderPage title="Examination Management" icon={ExamIcon} /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/notices" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><PlaceholderPage title="Notice Board" icon={NoticeIcon} /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/library" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><PlaceholderPage title="Library Management" icon={LibraryIcon} /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><PlaceholderPage title="Reports" icon={ReportIcon} /></DashboardLayout></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><DashboardLayout><PlaceholderPage title="System Settings" icon={SettingsIcon} /></DashboardLayout></ProtectedRoute>} />

            {/* ========== HOD ROUTES ========== */}
            <Route path="/hod/dashboard" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/students" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODStudents /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/faculty" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODFaculty /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/subjects" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODSubjects /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/classrooms" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODClassrooms /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/fees" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODFeeReport /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/timetable" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODTimetable /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/leave" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODLeave /></DashboardLayout></ProtectedRoute>} />
            <Route path="/hod/reports" element={<ProtectedRoute allowedRoles={['hod']}><DashboardLayout><HODReports /></DashboardLayout></ProtectedRoute>} />

            {/* ========== FACULTY ROUTES ========== */}
            <Route path="/faculty" element={<ProtectedRoute allowedRoles={['faculty']}><Navigate to="/faculty/dashboard" replace /></ProtectedRoute>} />
            <Route path="/faculty/dashboard" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/attendance" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyAttendance /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/assignments" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyAssignments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/marks" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyMarks /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/materials" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyMaterials /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/lab-manuals" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyLabManuals /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/attendance-reports" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyAttendanceReports /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/announcements" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyAnnouncements /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/notices" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyNotices /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/leave" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyLeave /></DashboardLayout></ProtectedRoute>} />
            <Route path="/faculty/profile" element={<ProtectedRoute allowedRoles={['faculty']}><DashboardLayout><FacultyProfile /></DashboardLayout></ProtectedRoute>} />

            {/* ========== STUDENT ROUTES ========== */}
            <Route path="/student/dashboard" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentDashboard /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/attendance" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentAttendance /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/assignments" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentAssignments /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/assignments/:id" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentAssignmentDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/timetable" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentTimetable /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/fees" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentFees /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/results" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentResults /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/notices" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentNotices /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/syllabus" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentSyllabus /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/lab-manuals" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentLabManualList /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/lab-manuals/status" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentLabManualStatus /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/lab-manuals/:id" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentLabManualDetail /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/library" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentLibrary /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/leave" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentLeave /></DashboardLayout></ProtectedRoute>} />
            <Route path="/student/profile" element={<ProtectedRoute allowedRoles={['student']}><DashboardLayout><StudentProfile /></DashboardLayout></ProtectedRoute>} />

            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
