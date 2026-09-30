import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { AttendanceIcon, CheckIcon, XIcon, CalendarIcon, FilterIcon, DownloadIcon } from '../../utils/icons';
import { attendanceAPI, facultyAPI } from '../../services/api';

export default function FacultyAttendanceReports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [report, setReport] = useState(null);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchInitial();
  }, []);

  const fetchInitial = async () => {
    try {
      setLoading(true);
      const res = await facultyAPI.getSubjects();
      if (res.success) {
        const subs = res.data || [];
        setSubjects(subs);
        if (subs.length > 0) setSelectedSubject(subs[0].id || subs[0].subject_id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSubject) {
      fetchReport();
    }
  }, [selectedSubject, dateFrom, dateTo]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        subject_id: selectedSubject,
        faculty_id: user?.profile?.id,
      };
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;

      const res = await attendanceAPI.getReport(params);
      if (res.success) {
        setReport(res.data.summary || res.data);
        setStudents(res.data.students || res.data.attendance || []);
      } else {
        setError(res.message || 'Failed to load report');
      }
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    window.print();
  };

  if (loading && !report) return <LoadingSpinner size="lg" text="Loading report..." />;

  const total = report?.total || students.length;
  const present = report?.present || students.filter((s) => s.status === 'present').length;
  const absent = report?.absent || students.filter((s) => s.status === 'absent').length;
  const late = report?.late || students.filter((s) => s.status === 'late').length;
  const percentage = total ? Math.round((present / total) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Attendance Reports"
        subtitle="View and analyze attendance records"
        action={
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <DownloadIcon size={16} />
            Export / Print
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <FilterIcon size={16} className="text-muted" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50"
          >
            {subjects.map((sub) => {
              const id = sub.id || sub.subject_id;
              return <option key={id} value={id}>{sub.subject_name || sub.name || sub.subject}</option>;
            })}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">From:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">To:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <StatCard icon={<CalendarIcon size={22} />} label="Total Classes" value={total} color="info" />
        <StatCard icon={<CheckIcon size={22} />} label="Present" value={present} color="success" />
        <StatCard icon={<XIcon size={22} />} label="Absent" value={absent} color="error" />
        <StatCard icon={<AttendanceIcon size={22} />} label="Late" value={late} color="warning" />
        <StatCard icon={<AttendanceIcon size={22} />} label="Percentage" value={`${percentage}%`} color={percentage >= 75 ? 'success' : 'warning'} />
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-white mb-5">Student-wise Attendance</h3>
        {students.length === 0 ? (
          <EmptyState title="No records" description="No attendance records found for the selected filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Roll No</th>
                  <th className="text-left py-3 pr-4">Name</th>
                  <th className="text-center py-3 pr-4">Present</th>
                  <th className="text-center py-3 pr-4">Absent</th>
                  <th className="text-center py-3 pr-4">Late</th>
                  <th className="text-center py-3">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, idx) => {
                  const sTotal = student.total || (student.present + student.absent + student.late) || 1;
                  const sPct = Math.round(((student.present || 0) / sTotal) * 100);
                  return (
                    <tr key={student.id || student.student_id || idx} className="border-b border-surface-border/50 last:border-0">
                      <td className="py-3 pr-4 text-muted">{student.roll_number || student.roll_no || '-'}</td>
                      <td className="py-3 pr-4 text-muted-light">{student.first_name ? `${student.first_name} ${student.last_name || ''}` : student.name}</td>
                      <td className="py-3 pr-4 text-center text-success">{student.present || 0}</td>
                      <td className="py-3 pr-4 text-center text-danger">{student.absent || 0}</td>
                      <td className="py-3 pr-4 text-center text-warning">{student.late || 0}</td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${sPct >= 75 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                          {sPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
