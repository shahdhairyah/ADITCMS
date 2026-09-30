import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  DashboardIcon, StudentIcon, FacultyIcon, AttendanceIcon, AssignmentIcon,
  TimetableIcon, FeeIcon, NoticeIcon, LibraryIcon, LeaveIcon, ProfileIcon,
  SettingsIcon, ReportIcon, DepartmentIcon, ExamIcon, MarksIcon, MaterialIcon,
  LogoutIcon, ResultIcon, BookOpen
} from '../../utils/icons';

const menuIconMap = {
  dashboard: DashboardIcon,
  students: StudentIcon,
  faculty: FacultyIcon,
  attendance: AttendanceIcon,
  assignments: AssignmentIcon,
  timetable: TimetableIcon,
  fees: FeeIcon,
  results: ResultIcon,
  notices: NoticeIcon,
  library: LibraryIcon,
  leave: LeaveIcon,
  profile: ProfileIcon,
  settings: SettingsIcon,
  reports: ReportIcon,
  departments: DepartmentIcon,
  examinations: ExamIcon,
  marks: MarksIcon,
  materials: MaterialIcon,
  book: BookOpen,
};

const menuItems = {
  student: [
    { id: 'dashboard', path: '/student/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'attendance', path: '/student/attendance', label: 'Attendance', icon: 'attendance' },
    { id: 'assignments', path: '/student/assignments', label: 'Assignments', icon: 'assignments' },
    { id: 'timetable', path: '/student/timetable', label: 'Timetable', icon: 'timetable' },
    { id: 'fees', path: '/student/fees', label: 'Fees', icon: 'fees' },
    { id: 'results', path: '/student/results', label: 'Results', icon: 'results' },
    { id: 'notices', path: '/student/notices', label: 'Notices', icon: 'notices' },
    { id: 'syllabus', path: '/student/syllabus', label: 'Syllabus', icon: 'book' },
    { id: 'lab-manuals', path: '/student/lab-manuals', label: 'Lab Manuals', icon: 'book' },
    { id: 'lab-status', path: '/student/lab-manuals/status', label: 'Lab Status', icon: 'book' },
    { id: 'library', path: '/student/library', label: 'Library', icon: 'library' },
    { id: 'leave', path: '/student/leave', label: 'Leave', icon: 'leave' },
    { id: 'profile', path: '/student/profile', label: 'Profile', icon: 'profile' },
  ],
  faculty: [
    { id: 'dashboard', path: '/faculty/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'attendance', path: '/faculty/attendance', label: 'Attendance', icon: 'attendance' },
    { id: 'attendance-reports', path: '/faculty/attendance-reports', label: 'Attendance Reports', icon: 'reports' },
    { id: 'assignments', path: '/faculty/assignments', label: 'Assignments', icon: 'assignments' },
    { id: 'marks', path: '/faculty/marks', label: 'Marks Entry', icon: 'marks' },
    { id: 'lab-manuals', path: '/faculty/lab-manuals', label: 'Lab Manuals', icon: 'book' },
    { id: 'materials', path: '/faculty/materials', label: 'Materials', icon: 'materials' },
    { id: 'notices', path: '/faculty/notices', label: 'Notices', icon: 'notices' },
    { id: 'announcements', path: '/faculty/announcements', label: 'Announcements', icon: 'notices' },
    { id: 'leave', path: '/faculty/leave', label: 'Leave Requests', icon: 'leave' },
    { id: 'profile', path: '/faculty/profile', label: 'Profile', icon: 'profile' },
  ],
  admin: [
    { id: 'dashboard', path: '/admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'students', path: '/admin/students', label: 'Students', icon: 'students' },
    { id: 'faculty', path: '/admin/faculty', label: 'Faculty', icon: 'faculty' },
    { id: 'departments', path: '/admin/departments', label: 'Departments', icon: 'departments' },
    { id: 'fees', path: '/admin/fees', label: 'Fee Management', icon: 'fees' },
    { id: 'timetable', path: '/admin/timetable', label: 'Timetable', icon: 'timetable' },
    { id: 'examinations', path: '/admin/exams', label: 'Examinations', icon: 'examinations' },
    { id: 'notices', path: '/admin/notices', label: 'Notices', icon: 'notices' },
    { id: 'library', path: '/admin/library', label: 'Library', icon: 'library' },
    { id: 'reports', path: '/admin/reports', label: 'Reports', icon: 'reports' },
    { id: 'settings', path: '/admin/settings', label: 'Settings', icon: 'settings' },
  ],
  hod: [
    { id: 'dashboard', path: '/hod/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'students', path: '/hod/students', label: 'Students', icon: 'students' },
    { id: 'faculty', path: '/hod/faculty', label: 'Faculty', icon: 'faculty' },
    { id: 'subjects', path: '/hod/subjects', label: 'Subjects', icon: 'book' },
    { id: 'classrooms', path: '/hod/classrooms', label: 'Classrooms', icon: 'book' },
    { id: 'fees', path: '/hod/fees', label: 'Fees', icon: 'fees' },
    { id: 'timetable', path: '/hod/timetable', label: 'Timetable', icon: 'timetable' },
    { id: 'leave', path: '/hod/leave', label: 'Leave Approvals', icon: 'leave' },
    { id: 'reports', path: '/hod/reports', label: 'Reports', icon: 'reports' },
  ],
};

const roleBadge = {
  admin: 'bg-danger/10 text-danger border border-danger/20',
  hod: 'bg-warning/10 text-warning border border-warning/20',
  faculty: 'bg-info/10 text-info border border-info/20',
  student: 'bg-accent/10 text-accent-light border border-accent/20',
};

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const items = menuItems[role] || menuItems.student;
  const profile = user?.profile;

  return (
    <aside className="h-screen sticky top-0 flex flex-col w-64 border-r border-surface-border bg-base overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center border-b border-surface-border">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0">
            <img
              src="/adit.webp"
              alt="ADIT"
              className="w-10 h-10 rounded-lg object-contain bg-white ring-1 ring-surface-border"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="leading-tight min-w-0">
            <p className="font-bold text-sm text-white tracking-tight">ADIT CMS</p>
            <p className="text-[10px] text-muted truncate">A.D. Institute of Technology</p>
            <p className="text-[10px] text-muted">CVM University</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-surface-border">
        <div className="flex items-center gap-3 px-1">
          <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
            <span className="text-accent-light text-sm font-bold">
              {(profile?.first_name || 'U')[0]}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-light truncate">
              {profile?.first_name} {profile?.last_name}
            </p>
            <span className={`inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full capitalize ${roleBadge[role] || roleBadge.student}`}>
              {role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-1">
        {items.map((item) => {
          const Icon = menuIconMap[item.icon];
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-surface-hover text-white font-medium'
                  : 'text-muted hover:bg-surface-hover hover:text-muted-light'
              }`}
            >
              <span className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                isActive
                  ? 'bg-accent text-white'
                  : 'text-muted group-hover:text-accent-light'
              }`}>
                {Icon && <Icon size={16} />}
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-surface-border">
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-muted hover:text-danger hover:bg-danger/10 transition-colors"
        >
          <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-surface-raised text-muted">
            <LogoutIcon size={16} />
          </span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
