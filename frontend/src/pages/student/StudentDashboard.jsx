import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import AttendanceGauge from '../../components/common/AttendanceGauge';
import { AttendanceIcon, AssignmentIcon, FeeIcon, ResultIcon, NoticeIcon, LeaveIcon, BookOpen, CalendarIcon } from '../../utils/icons';
import { formatDate } from '../../utils/helpers';
import { attendanceAPI, assignmentAPI, examAPI, noticeAPI, leaveAPI, labManualAPI, feeAPI } from '../../services/api';
import { Link } from 'react-router-dom';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    attendance: 0,
    totalClasses: 0,
    present: 0,
    absent: 0,
    pendingAssignments: 0,
    sgpa: 0,
    cgpa: 0,
    pendingFees: 0,
    pendingLeaves: 0,
    labSubmissions: 0,
  });
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [notices, setNotices] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError('');

      const studentId = profile?.id;

      const [
        attSummaryRes,
        attRes,
        assignRes,
        resultsRes,
        noticesRes,
        leavesRes,
        labSubRes,
        feesRes,
      ] = await Promise.allSettled([
        attendanceAPI.getStudentSummary(studentId).catch(() => ({ success: false, data: {} })),
        attendanceAPI.get({ student_id: studentId }).catch(() => ({ success: false, data: {} })),
        assignmentAPI.getAll({ student_id: studentId }).catch(() => ({ success: false, data: [] })),
        examAPI.getResults({ student_id: studentId }).catch(() => ({ success: false, data: [] })),
        noticeAPI.getStudent().catch(() => ({ success: false, data: [] })),
        leaveAPI.getAll({ student_id: studentId }).catch(() => ({ success: false, data: [] })),
        labManualAPI.getStudentSubmissions().catch(() => ({ success: false, data: [] })),
        feeAPI.getPayments(studentId).catch(() => ({ success: false, data: [] })),
      ]);

      // Attendance
      const attSummary = attSummaryRes.status === 'fulfilled' ? attSummaryRes.value : { success: false, data: {} };
      const attData = attRes.status === 'fulfilled' ? attRes.value : { success: false, data: {} };
      const subjectSummary = attData.data?.summary || [];
      const studentSummary = attSummary.data || {};
      const totalClasses = studentSummary.total_classes || subjectSummary.reduce((s, sub) => s + (parseInt(sub.total_classes) || 0), 0);
      const presentCount = studentSummary.present || subjectSummary.reduce((s, sub) => s + (parseInt(sub.present) || 0), 0);
      const absentCount = studentSummary.absent || subjectSummary.reduce((s, sub) => s + (parseInt(sub.absent) || 0), 0);
      const lateCount = studentSummary.late || subjectSummary.reduce((s, sub) => s + (parseInt(sub.late) || 0), 0);
      const attendancePct = totalClasses > 0 ? Math.round(((presentCount + lateCount) / totalClasses) * 100) : 0;
      setAttendanceSummary(subjectSummary);

      // Assignments
      const assignments = assignRes.status === 'fulfilled' ? (assignRes.value.data || []) : [];
      const pending = assignments.filter(a => !a.submission || a.submission.status === 'pending').length;
      const upcoming = assignments
        .filter(a => a.deadline && new Date(a.deadline) > new Date())
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5);

      // Results
      const results = resultsRes.status === 'fulfilled' ? (resultsRes.value.data || []) : [];
      const latestResult = results.length > 0 ? results[results.length - 1] : null;

      // Notices
      const noticeData = noticesRes.status === 'fulfilled' ? (noticesRes.value.data || []) : [];
      setNotices(noticeData.slice(0, 5));

      // Leaves
      const leaves = leavesRes.status === 'fulfilled' ? (leavesRes.value.data || []) : [];
      const pendingLeaves = leaves.filter(l => l.status === 'pending').length;

      // Lab submissions
      const labSubs = labSubRes.status === 'fulfilled' ? (labSubRes.value.data || []) : [];
      const pendingLabs = labSubs.filter(s => !s.status || s.status === 'pending').length;

      // Fees
      const feesRaw = feesRes.status === 'fulfilled' ? (feesRes.value.data || {}) : {};
      const feePayments = feesRaw?.payments || (Array.isArray(feesRaw) ? feesRaw : []);
      const pendingFeeAmount = feePayments.filter(p => p.status !== 'paid' && p.status !== 'completed').reduce((s, p) => s + (p.amount || 0), 0);

      setStats({
        attendance: attendancePct,
        totalClasses,
        present: presentCount,
        absent: absentCount,
        pendingAssignments: pending,
        sgpa: latestResult?.sgpa || 0,
        cgpa: latestResult?.cgpa || 0,
        pendingFees: pendingFeeAmount,
        pendingLeaves,
        labSubmissions: pendingLabs,
      });
      setUpcomingAssignments(upcoming);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading dashboard..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Student Dashboard"
        subtitle={`Welcome back, ${profile?.first_name || 'Student'}! Here's your academic overview.`}
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          icon={<AttendanceIcon size={22} />}
          label="Attendance"
          value={`${stats.attendance}%`}
          color={stats.attendance >= 75 ? 'success' : 'warning'}
          subtext={`${stats.present}/${stats.totalClasses} classes`}
          onClick={() => window.location.href = '/student/attendance'}
        />
        <StatCard
          icon={<AssignmentIcon size={22} />}
          label="Pending Assignments"
          value={stats.pendingAssignments}
          color="info"
          subtext="Require submission"
          onClick={() => window.location.href = '/student/assignments'}
        />
        <StatCard
          icon={<ResultIcon size={22} />}
          label="Current SGPA"
          value={stats.sgpa || '-'}
          color="primary"
          subtext={stats.cgpa ? `CGPA: ${stats.cgpa}` : 'No results yet'}
          onClick={() => window.location.href = '/student/results'}
        />
        <StatCard
          icon={<LeaveIcon size={22} />}
          label="Pending Leaves"
          value={stats.pendingLeaves}
          color="warning"
          subtext="Awaiting approval"
          onClick={() => window.location.href = '/student/leave'}
        />
      </div>

      {/* Attendance Overview + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Gauge */}
        <div className="card p-6 flex flex-col items-center justify-center">
          <h3 className="text-base font-semibold text-white mb-4">Attendance Overview</h3>
          <AttendanceGauge percentage={stats.attendance} size={140} strokeWidth={10} />
          <div className="flex items-center gap-4 mt-4 text-xs">
            <span className="text-success flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-success" /> Present: {stats.present}
            </span>
            <span className="text-danger flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-danger" /> Absent: {stats.absent}
            </span>
          </div>
          <p className="text-xs text-muted mt-2">{stats.totalClasses} total classes</p>
        </div>

        {/* Upcoming Assignments */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <AssignmentIcon size={18} className="text-accent-light" /> Upcoming
            </h3>
            {upcomingAssignments.length > 0 && (
              <Link to="/student/assignments" className="text-xs text-accent-light hover:text-accent font-medium">View all</Link>
            )}
          </div>
          {upcomingAssignments.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No upcoming assignments.</p>
          ) : (
            <div className="space-y-3">
              {upcomingAssignments.map(a => {
                const deadline = new Date(a.deadline);
                const now = new Date();
                const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
                const urgent = daysLeft <= 2;
                return (
                  <Link
                    key={a.id}
                    to={`/student/assignments/${a.id}`}
                    className="flex items-center justify-between p-3.5 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-accent/30 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm text-muted-light truncate">{a.title}</p>
                      <p className="text-xs text-muted mt-0.5">{a.subject_name || a.subject}</p>
                    </div>
                    <span className={`text-xs font-medium flex-shrink-0 ml-2 ${urgent ? 'text-danger' : 'text-warning'}`}>
                      {daysLeft <= 0 ? 'Overdue' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft}d left`}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Notices */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <NoticeIcon size={18} className="text-accent-light" /> Notices
            </h3>
            <Link to="/student/notices" className="text-xs text-accent-light hover:text-accent font-medium">View all</Link>
          </div>
          {notices.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">No recent notices.</p>
          ) : (
            <div className="space-y-3">
              {notices.map(n => (
                <div key={n.id} className="p-3 bg-surface-overlay rounded-xl border border-surface-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      n.type === 'Exam' ? 'bg-danger/10 text-danger' :
                      n.type === 'Academic' ? 'bg-blue-500/10 text-blue-400' :
                      n.type === 'Holiday' ? 'bg-green-500/10 text-green-400' :
                      'bg-surface-hover text-muted'
                    }`}>{n.type || 'General'}</span>
                  </div>
                  <p className="font-medium text-sm text-muted-light line-clamp-1">{n.title}</p>
                  <p className="text-[10px] text-muted-dark mt-1 flex items-center gap-1">
                    <CalendarIcon size={10} />
                    {formatDate(n.published_at || n.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Subject-wise Attendance */}
      {attendanceSummary.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <AttendanceIcon size={18} className="text-accent-light" /> Subject-wise Attendance
            </h3>
            <Link to="/student/attendance" className="text-xs text-accent-light hover:text-accent font-medium">View details</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attendanceSummary.map(sub => {
              const pct = parseFloat(sub.percentage) || 0;
              return (
                <div key={sub.subject_id || sub.subject_name} className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-light truncate">{sub.subject_name}</p>
                    <span className={`text-sm font-bold ${pct >= 75 ? 'text-success' : 'text-danger'}`}>{pct}%</span>
                  </div>
                  <div className="relative w-full h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${pct >= 75 ? 'bg-gradient-to-r from-success to-success/70' : pct >= 60 ? 'bg-gradient-to-r from-warning to-warning/70' : 'bg-gradient-to-r from-danger to-danger/70'}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-dark">
                    <span>{sub.present || 0}/{sub.total_classes || 0} classes</span>
                    {sub.absent > 0 && <span className="text-danger">{sub.absent} absent</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="card">
        <h3 className="text-base font-semibold text-white mb-5">Quick Links</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { label: 'Timetable', path: '/student/timetable', icon: <CalendarIcon size={20} /> },
            { label: 'Syllabus', path: '/student/syllabus', icon: <BookOpen size={20} /> },
            { label: 'Lab Manuals', path: '/student/lab-manuals', icon: <BookOpen size={20} /> },
            { label: 'Fees', path: '/student/fees', icon: <FeeIcon size={20} /> },
            { label: 'Library', path: '/student/library', icon: <BookOpen size={20} /> },
            { label: 'Profile', path: '/student/profile', icon: <FeeIcon size={20} /> },
          ].map(link => (
            <Link
              key={link.path}
              to={link.path}
              className="flex flex-col items-center gap-2 p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border hover:bg-surface-hover transition-all text-center"
            >
              <span className="text-accent-light">{link.icon}</span>
              <span className="text-xs font-medium text-muted-light">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
