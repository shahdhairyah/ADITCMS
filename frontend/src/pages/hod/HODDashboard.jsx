import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { StudentIcon, FacultyIcon, FeeIcon, AttendanceIcon, SubjectIcon, ActivityIcon, ReportIcon, TimetableIcon, BookOpen } from '../../utils/icons';
import api from '../../services/api';

export default function HODDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const [dashRes, trendRes] = await Promise.allSettled([
        api.get('/hod/dashboard'),
        api.get('/hod/academic-trends'),
      ]);
      if (dashRes.status === 'fulfilled' && dashRes.value.success) setStats(dashRes.value.data);
      else if (dashRes.status === 'fulfilled') setError(dashRes.value.message || 'Failed to load dashboard');
      if (trendRes.status === 'fulfilled' && trendRes.value.success) setTrends(trendRes.value.data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading HOD dashboard..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="HOD Dashboard"
        subtitle={stats?.department ? `${stats.department.name} Department Overview` : 'Department overview'}
      />

      {error && <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard icon={<StudentIcon size={22} />} label="Total Students" value={stats?.total_students || 0} color="primary" subtext="In your department" />
        <StatCard icon={<FacultyIcon size={22} />} label="Faculty Members" value={stats?.total_faculty || 0} color="info" subtext="Under your department" />
        <StatCard icon={<FeeIcon size={22} />} label="Fee Payments" value={stats?.total_payments || 0} color="success" subtext="Completed transactions" />
        <StatCard icon={<AttendanceIcon size={22} />} label="Avg Attendance" value={`${stats?.avg_attendance || 0}%`} color={(stats?.avg_attendance || 0) >= 75 ? 'success' : 'warning'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <ActivityIcon size={18} className="text-accent-light" /> Department Info
          </h3>
          {stats?.department ? (
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-surface-overlay rounded-xl">
                <span className="text-sm text-muted">Name</span>
                <span className="text-sm text-muted-light font-medium">{stats.department.name}</span>
              </div>
              <div className="flex justify-between p-3 bg-surface-overlay rounded-xl">
                <span className="text-sm text-muted">Code</span>
                <span className="text-sm text-muted-light font-medium">{stats.department.code || '-'}</span>
              </div>
              <div className="flex justify-between p-3 bg-surface-overlay rounded-xl">
                <span className="text-sm text-muted">HOD</span>
                <span className="text-sm text-muted-light font-medium">{stats.department.hod_name || user?.profile?.first_name || '-'}</span>
              </div>
              <div className="flex justify-between p-3 bg-surface-overlay rounded-xl">
                <span className="text-sm text-muted">Subjects</span>
                <span className="text-sm text-muted-light font-medium">{stats.total_subjects || 0}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted text-center py-6">No department info available.</p>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <SubjectIcon size={18} className="text-accent-light" /> Quick Actions
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: 'Department Students', path: '/hod/students', icon: StudentIcon },
              { label: 'Department Faculty', path: '/hod/faculty', icon: FacultyIcon },
              { label: 'Subjects', path: '/hod/subjects', icon: SubjectIcon },
              { label: 'Classrooms', path: '/hod/classrooms', icon: BookOpen },
              { label: 'Fee Reports', path: '/hod/fees', icon: FeeIcon },
              { label: 'Timetable', path: '/hod/timetable', icon: TimetableIcon },
              { label: 'Reports', path: '/hod/reports', icon: ReportIcon },
              { label: 'Leave Approvals', path: '/hod/leave', icon: ActivityIcon },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  to={item.path}
                  className="flex flex-col items-center gap-2 p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-accent/30 hover:bg-surface-hover transition-all text-center"
                >
                  <span className="text-accent-light"><Icon size={20} /></span>
                  <span className="text-xs font-medium text-muted-light">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {trends && (trends.semester_trends?.length > 0 || trends.attendance_trends?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {trends.semester_trends?.length > 0 && (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-4">Academic Performance Trends</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4">Semester</th>
                      <th className="text-right py-3 pr-4">Avg Internal</th>
                      <th className="text-right py-3">Avg External</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.semester_trends.map((t, i) => (
                      <tr key={i} className="border-b border-surface-border/50 last:border-0">
                        <td className="py-3.5 pr-4 text-muted-light font-medium">Sem {t.semester_number}</td>
                        <td className="py-3.5 pr-4 text-right text-muted">{t.avg_internal || 'N/A'}</td>
                        <td className="py-3.5 text-right text-muted">{t.avg_external || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {trends.attendance_trends?.length > 0 && (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-4">Attendance Trends (6 Months)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4">Month</th>
                      <th className="text-right py-3">Rate (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trends.attendance_trends.map((t, i) => (
                      <tr key={i} className="border-b border-surface-border/50 last:border-0">
                        <td className="py-3.5 pr-4 text-muted-light">{t.month}</td>
                        <td className="py-3.5 text-right text-muted">{t.rate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}