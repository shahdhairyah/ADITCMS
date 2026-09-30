import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import AttendanceCalendar from '../../components/common/AttendanceCalendar';
import AttendanceGauge from '../../components/common/AttendanceGauge';
import { AttendanceIcon, CheckIcon, XIcon, CalendarIcon, FilterIcon } from '../../utils/icons';
import { formatDate } from '../../utils/helpers';
import { attendanceAPI } from '../../services/api';

export default function StudentAttendance() {
  const { profile } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [summary, setSummary] = useState([]);
  const [studentSummary, setStudentSummary] = useState({ total_classes: 0, present: 0, absent: 0, late: 0, percentage: 0 });
  const [calendarData, setCalendarData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [calMonth, setCalMonth] = useState(new Date().getMonth() + 1);
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  useEffect(() => { fetchAttendance(); }, []);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      const studentId = profile?.id;

      const [attRes, sumRes, calRes] = await Promise.allSettled([
        attendanceAPI.get({ student_id: studentId }).catch(() => ({ success: false, data: {} })),
        attendanceAPI.getStudentSummary(studentId).catch(() => ({ success: false, data: {} })),
        attendanceAPI.getStudentCalendar(studentId, { month: calMonth, year: calYear }).catch(() => ({ success: false, data: [] })),
      ]);

      const attData = attRes.status === 'fulfilled' ? attRes.value : { success: false, data: {} };
      const sumData = sumRes.status === 'fulfilled' ? sumRes.value : { success: false, data: {} };
      const calData = calRes.status === 'fulfilled' ? calRes.value : { success: false, data: [] };

      if (attData.success) {
        setAttendance(attData.data?.attendance || []);
        setSummary(attData.data?.summary || []);
      }
      if (sumData.success) {
        setStudentSummary(sumData.data || { total_classes: 0, present: 0, absent: 0, late: 0, percentage: 0 });
      }
      if (calData.success) {
        setCalendarData(calData.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendar = async (year, month) => {
    try {
      const res = await attendanceAPI.getStudentCalendar(profile?.id, { month, year });
      if (res.success) setCalendarData(res.data || []);
    } catch (err) { /* ignore */ }
  };

  const handleMonthChange = (year, month) => {
    setCalYear(year);
    setCalMonth(month);
    fetchCalendar(year, month);
  };

  const total = studentSummary.total_classes || 0;
  const present = studentSummary.present || 0;
  const absent = studentSummary.absent || 0;
  const late = studentSummary.late || 0;
  const percentage = studentSummary.percentage || (total > 0 ? Math.round(((present + late) / total) * 100) : 0);

  const subjects = [...new Set(summary.map(s => s.subject_name).filter(Boolean))];
  const filteredAttendance = selectedSubject ? attendance.filter(a => a.subject_name === selectedSubject) : attendance;

  if (loading) return <LoadingSpinner size="lg" text="Loading attendance..." />;

  return (
    <div className="space-y-8">
      <PageHeader title="My Attendance" subtitle="Track your attendance records" />
      {error && <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="md:col-span-1 flex justify-center">
          <AttendanceGauge percentage={percentage} size={120} strokeWidth={8} />
        </div>
        <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-5">
          <StatCard icon={<CalendarIcon size={22} />} label="Total Classes" value={total} color="info" />
          <StatCard icon={<CheckIcon size={22} />} label="Present" value={present} color="success" />
          <StatCard icon={<XIcon size={22} />} label="Absent" value={absent} color="error" />
          <StatCard icon={<AttendanceIcon size={22} />} label="Late" value={late} color="warning" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-accent/15 text-accent-light border border-accent/30' : 'bg-surface-overlay text-muted border border-surface-border/50 hover:bg-surface-hover'}`}>List</button>
          <button onClick={() => setViewMode('calendar')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === 'calendar' ? 'bg-accent/15 text-accent-light border border-accent/30' : 'bg-surface-overlay text-muted border border-surface-border/50 hover:bg-surface-hover'}`}>Calendar</button>
        </div>
        {subjects.length > 0 && (
          <div className="flex items-center gap-2">
            <FilterIcon size={14} className="text-muted-dark" />
            <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="bg-surface-overlay border border-surface-border rounded-lg px-2 py-1.5 text-xs text-muted-light focus:outline-none focus:border-accent/50">
              <option value="">All Subjects</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      {summary.length > 0 && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4">Subject-wise Attendance</h3>
          <div className="space-y-4">
            {summary.map(sub => {
              const pct = parseFloat(sub.percentage) || 0;
              const subTotal = parseInt(sub.total_classes) || 0;
              const subPresent = parseInt(sub.present) || 0;
              const subAbsent = parseInt(sub.absent) || 0;
              const subLate = parseInt(sub.late) || 0;
              return (
                <div key={sub.subject_id || sub.subject_name}>
                  <div className="flex justify-between mb-1.5">
                    <div>
                      <span className="text-sm text-muted-light font-medium">{sub.subject_name}</span>
                      {sub.subject_code && <span className="text-xs text-muted ml-2">{sub.subject_code}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-muted">{subPresent}/{subTotal}</span>
                      <span className={`font-bold ${pct >= 75 ? 'text-success' : 'text-danger'}`}>{pct}%</span>
                    </div>
                  </div>
                  <div className="relative w-full h-2.5 bg-surface-overlay rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${pct >= 75 ? 'bg-gradient-to-r from-success to-success/70' : pct >= 60 ? 'bg-gradient-to-r from-warning to-warning/70' : 'bg-gradient-to-r from-danger to-danger/70'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-dark">
                    <span>Present: {subPresent}</span>
                    <span>Absent: {subAbsent}</span>
                    <span>Late: {subLate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'calendar' ? (
        <AttendanceCalendar year={calYear} month={calMonth} data={calendarData} onMonthChange={handleMonthChange} />
      ) : (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-5">Attendance Records</h3>
          {filteredAttendance.length === 0 ? (
            <EmptyState title="No records" description="No attendance records found." />
          ) : (
            <div className="space-y-3">
              {filteredAttendance.map(record => {
                const statusColors = { present: 'bg-success/10 text-success border-success/20', absent: 'bg-danger/10 text-danger border-danger/20', late: 'bg-warning/10 text-warning border-warning/20' };
                return (
                  <div key={record.id || `${record.date}-${record.subject_id}`} className="flex items-center justify-between p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        record.status === 'present' ? 'bg-success/10 text-success' :
                        record.status === 'absent' ? 'bg-danger/10 text-danger' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {record.status === 'present' ? <CheckIcon size={16} /> : record.status === 'absent' ? <XIcon size={16} /> : <CalendarIcon size={16} />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-light">{record.subject_name || record.subject}</p>
                        <p className="text-xs text-muted">{record.subject_code && `${record.subject_code} · `}{formatDate(record.date)}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[record.status] || ''}`}>
                      {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
