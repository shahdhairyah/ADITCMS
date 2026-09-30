import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { UsersIcon, AttendanceIcon, AssignmentIcon, ActivityIcon, MarksIcon, MaterialIcon } from '../../utils/icons';
import { assignmentAPI, facultyAPI, timetableAPI } from '../../services/api';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function FacultyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ students: 0, todayClasses: 0, pendingReviews: 0, avgAttendance: 0 });
  const [pendingSubmissions, setPendingSubmissions] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const today = DAYS[new Date().getDay()];

      const [assignRes, subjectsRes, timetableRes] = await Promise.all([
        assignmentAPI.getAll({ faculty_id: user?.profile?.id }).catch(() => ({ success: false })),
        facultyAPI.getSubjects().catch(() => ({ success: false })),
        timetableAPI.get({ day: today }).catch(() => ({ success: false })),
      ]);

      const assignments = assignRes.success ? (assignRes.data || []) : [];
      const subjects = subjectsRes.success ? (subjectsRes.data || []) : [];
      const todayEntries = timetableRes.success ? (timetableRes.data || []) : [];

      // Assignments awaiting review. The "Recent Activity" panel reads this
      // list but nothing ever wrote to it, so the panel was permanently empty.
      const pending = assignments
        .filter((a) => (a.submissions_count || 0) > 0)
        .map((a) => ({ title: a.title, submissions_count: a.submissions_count }));
      setPendingSubmissions(pending);

      setStats((s) => ({
        ...s,
        pendingReviews: pending.length,
        todayClasses: todayEntries.length,
        // No endpoint reports a per-faculty student count, so the card shows
        // the number of assigned subjects rather than the previous invented
        // "subjects * 30" figure.
        students: subjects.length,
      }));
    } catch (err) {
      console.error('FacultyDashboard: could not load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading dashboard..." />;

  return (
    <div className="space-y-8">
      <PageHeader title="Faculty Dashboard" subtitle="Manage your classes, attendance, and assignments." />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={<UsersIcon size={22} />} label="My Subjects" value={stats.students || '-'} color="primary" subtext="Currently assigned" />
        <StatCard icon={<AttendanceIcon size={22} />} label="Classes Today" value={stats.todayClasses || '-'} color="info" subtext="Scheduled periods" />
        <StatCard icon={<AssignmentIcon size={22} />} label="Pending Reviews" value={stats.pendingReviews} color="warning" />
        {/* No aggregate attendance endpoint is available to the dashboard, so
            this card reports nothing rather than a fabricated 0%. */}
        <StatCard icon={<ActivityIcon size={22} />} label="Avg Attendance" value="-" color="success" subtext="See Attendance Report" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card animate-fade-in">
          <h3 className="text-base font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Mark Attendance', icon: AttendanceIcon, path: '/faculty/attendance', color: 'text-info bg-info/10' },
              { label: 'Create Assignment', icon: AssignmentIcon, path: '/faculty/assignments', color: 'text-warning bg-warning/10' },
              { label: 'Enter Marks', icon: MarksIcon, path: '/faculty/marks', color: 'text-success bg-success/10' },
              { label: 'Upload Material', icon: MaterialIcon, path: '/faculty/materials', color: 'text-accent-light bg-accent/10' },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <button key={idx} onClick={() => navigate(item.path)}
                  className="group flex flex-col items-center gap-3 p-5 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-accent/30 hover:bg-surface-hover transition-all duration-200">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color} border border-current/20`}><Icon size={22} /></div>
                  <span className="text-sm font-medium text-muted-light group-hover:text-white transition-colors">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="card animate-fade-in">
          <h3 className="text-base font-semibold text-white mb-4">Recent Activity</h3>
          {pendingSubmissions.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No recent activity to display.</p>
          ) : (
            <div className="space-y-3">
              {pendingSubmissions.map((s, idx) => (
                <div key={idx} className="p-3 bg-surface-overlay rounded-xl border border-surface-border/50">
                  <p className="text-sm text-muted-light">{s.title}</p>
                  <p className="text-xs text-muted mt-1">{s.submissions_count || 0} submissions pending</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
