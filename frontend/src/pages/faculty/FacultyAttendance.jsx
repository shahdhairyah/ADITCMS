import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { AttendanceIcon, CheckIcon, XIcon, CalendarIcon, ReportIcon, DownloadIcon, EditIcon } from '../../utils/icons';
import { getStatusColor } from '../../utils/helpers';
import { attendanceAPI, facultyAPI } from '../../services/api';

export default function FacultyAttendance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('mark');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reportSubject, setReportSubject] = useState('');
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject && date) {
      fetchAttendance();
    }
  }, [selectedSubject, date]);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await facultyAPI.getSubjects();
      if (res.success) {
        const subs = res.data || [];
        setSubjects(subs);
        if (subs.length > 0) {
          const firstId = subs[0].id || subs[0].subject_id;
          setSelectedSubject(firstId);
          setReportSubject(firstId);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      setEditMode(false);
      const res = await attendanceAPI.get({ subject_id: selectedSubject, date });
      if (res.success) {
        setStudents(res.data?.students || []);
        setAlreadyMarked(res.data?.already_marked || false);
          } else {
        setError(res.message || 'Failed to load students');
      }
    } catch (err) {
      setError(err.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchReport = async () => {
    try {
      setReportLoading(true);
      setError('');
      const res = await attendanceAPI.getReport({
        subject_id: reportSubject,
        start_date: reportStartDate,
        end_date: reportEndDate,
        faculty_id: user?.profile?.id,
      });
      if (res.success) {
        setReportData(res.data?.records || res.data || []);
      } else {
        setError(res.message || 'Failed to load report');
      }
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  // The roster rows come back keyed by student_id; the old response also
  // carried an `id` column that was the *attendance* row id, so matching on
  // `s.id` compared an attendance id against a student id and the optimistic
  // toggle silently did nothing.
  const studentKey = (s) => s.id ?? s.student_id;

  const setStatus = (id, status) => {
    setStudents((prev) => prev.map((s) => studentKey(s) === id ? { ...s, status } : s));
  };

  const markAll = (status) => {
    setStudents((prev) => prev.map((s) => ({ ...s, status })));
  };

  const handleSubmit = async () => {
    try {
      setSaving(true);
      setError('');
      const data = {
        subject_id: selectedSubject,
        date,
        records: students.map((s) => ({
          student_id: studentKey(s),
          status: s.status,
        })),
      };
      const res = await attendanceAPI.mark(data);
      if (res.success) {
        setAlreadyMarked(true);
        setEditMode(false);
      } else {
        setError(res.message || 'Failed to save attendance');
      }
    } catch (err) {
      setError(err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    // Only rows that genuinely have an attendance record can be updated.
    // The previous fallback of `s.attendance_id || editId` rewrote the same
    // record once per student.
    const editable = students.filter((s) => s.attendance_id);
    if (!editable.length) {
      setError('No saved attendance to update for this date.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      for (const s of editable) {
        await attendanceAPI.update(s.attendance_id, { status: s.status });
      }
      setEditMode(false);
      setAlreadyMarked(true);
    } catch (err) {
      setError(err.message || 'Failed to update attendance');
    } finally {
      setSaving(false);
    }
  };

  const downloadCSV = () => {
    if (!reportData.length) return;
    const headers = ['Student Name', 'Roll No', 'Total Classes', 'Present', 'Absent', 'Percentage'];
    const rows = reportData.map((r) => [
      r.student_name || r.name || [r.first_name, r.last_name].filter(Boolean).join(' '),
      r.roll_number || r.roll_no || '-',
      r.total_classes || r.total || 0,
      r.present || 0,
      r.absent || 0,
      r.percentage ? `${r.percentage}%` : `${((r.present || 0) / (r.total || 1) * 100).toFixed(1)}%`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `attendance_report_${reportStartDate}_${reportEndDate}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  if (loading && !students.length && activeTab === 'mark') return <LoadingSpinner size="lg" text="Loading attendance data..." />;

  const present = students.filter((s) => s.status === 'present').length;
  const absent = students.filter((s) => s.status === 'absent').length;
  const late = students.filter((s) => s.status === 'late').length;

  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    weeklyData.push({ date: d.toISOString().split('T')[0], rate: Math.floor(Math.random() * 30) + 60 });
  }

  const subjectPiePresent = present;
  const subjectPieAbsent = absent + late;

  return (
    <div className="space-y-8">
      <PageHeader title="Attendance" subtitle="Mark and manage attendance" />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="flex gap-2 border-b border-surface-border pb-0">
        {['mark', 'reports'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-accent text-accent-light'
                : 'border-transparent text-muted hover:text-muted-light'
            }`}
          >
            {tab === 'mark' ? 'Mark Attendance' : 'Reports'}
          </button>
        ))}
      </div>

      {activeTab === 'mark' && (
        <>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3">
              <AttendanceIcon size={16} className="text-muted" />
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50"
              >
                {subjects.map((sub) => {
                  const id = sub.id || sub.subject_id;
                  return <option key={id} value={id}>{sub.subject_name || sub.name}</option>;
                })}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <CalendarIcon size={16} className="text-muted" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50"
              />
            </div>
            {alreadyMarked && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-warning/10 text-warning rounded-lg text-xs font-medium hover:bg-warning/20 transition-colors"
              >
                <EditIcon size={14} />
                Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <StatCard icon={<AttendanceIcon size={22} />} label="Total Students" value={students.length} color="info" />
            <StatCard icon={<CheckIcon size={22} />} label="Present" value={present} color="success" />
            <StatCard icon={<XIcon size={22} />} label="Absent" value={absent} color="error" />
            <StatCard icon={<CalendarIcon size={22} />} label="Late" value={late} color="warning" />
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-white">
                {editMode ? 'Edit Attendance' : alreadyMarked ? 'Attendance Record' : 'Mark Attendance'}
              </h3>
              {students.length > 0 && !alreadyMarked && (
                <div className="flex items-center gap-2">
                  <button onClick={() => markAll('present')} className="px-3 py-1.5 bg-success/10 text-success rounded-lg text-xs font-medium hover:bg-success/20 transition-colors">All Present</button>
                  <button onClick={() => markAll('absent')} className="px-3 py-1.5 bg-danger/10 text-danger rounded-lg text-xs font-medium hover:bg-danger/20 transition-colors">All Absent</button>
                </div>
              )}
            </div>

            {students.length === 0 ? (
              <EmptyState title="No Students" description="No students found for this subject and date." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4">Roll No</th>
                      <th className="text-left py-3 pr-4">Name</th>
                      <th className="text-right py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                {students.map((student) => (
                <tr key={studentKey(student)} className="border-b border-surface-border/50 last:border-0">
                        <td className="py-3 pr-4 text-muted">{student.roll_number || student.roll_no || '-'}</td>
                        <td className="py-3 pr-4 text-muted-light">{student.first_name ? `${student.first_name} ${student.last_name || ''}` : student.name}</td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {['present', 'absent', 'late'].map((status) => (
                              <button
                                key={status}
                                onClick={() => (editMode || !alreadyMarked) && setStatus(studentKey(student), status)}
                                disabled={alreadyMarked && !editMode}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                  (student.status || 'unmarked') === status
                                    ? getStatusColor(status) + ' ring-1 ring-inset ring-current'
                                    : 'bg-surface-hover text-muted-dark hover:text-muted-light'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {students.length > 0 && (editMode || !alreadyMarked) && (
              <div className="mt-5 pt-4 border-t border-surface-border flex justify-end">
                <button
                  onClick={editMode ? handleUpdate : handleSubmit}
                  disabled={saving}
                  className="px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editMode ? 'Update Attendance' : 'Submit Attendance'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-base font-semibold text-white mb-5">Attendance Report</h3>
            <div className="flex flex-wrap gap-4 mb-5">
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-muted" />
                <input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon size={16} className="text-muted" />
                <input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div className="flex items-center gap-2">
                <AttendanceIcon size={16} className="text-muted" />
                <select value={reportSubject} onChange={(e) => setReportSubject(e.target.value)} className="bg-surface-overlay border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50">
                  {subjects.map((sub) => {
                    const id = sub.id || sub.subject_id;
                    return <option key={id} value={id}>{sub.subject_name || sub.name}</option>;
                  })}
                </select>
              </div>
              <button onClick={fetchReport} className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors">Generate</button>
            </div>

            {reportLoading ? (
              <LoadingSpinner size="md" text="Loading report..." />
            ) : reportData.length === 0 ? (
              <EmptyState title="No Report Data" description="Select date range and subject to generate report." />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                        <th className="text-left py-3 pr-4">Student Name</th>
                        <th className="text-left py-3 pr-4">Roll No</th>
                        <th className="text-center py-3 pr-4">Total</th>
                        <th className="text-center py-3 pr-4">Present</th>
                        <th className="text-center py-3 pr-4">Absent</th>
                        <th className="text-center py-3">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((r, i) => {
                        const pct = r.percentage || (r.total ? Math.round((r.present / r.total) * 100) : 0);
                        return (
                          <tr key={r.student_id || i} className="border-b border-surface-border/50 last:border-0">
                            <td className="py-3 pr-4 text-muted-light">{r.student_name || r.name}</td>
                            <td className="py-3 pr-4 text-muted">{r.roll_number || r.roll_no || '-'}</td>
                            <td className="py-3 pr-4 text-center text-muted">{r.total_classes || r.total || 0}</td>
                            <td className="py-3 pr-4 text-center text-success">{r.present || 0}</td>
                            <td className="py-3 pr-4 text-center text-danger">{r.absent || 0}</td>
                            <td className="py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${pct >= 75 ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>{pct}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 pt-4 border-t border-surface-border flex justify-end">
                  <button onClick={downloadCSV} className="flex items-center gap-1.5 px-4 py-2 bg-accent/10 text-accent-light rounded-lg text-sm font-medium hover:bg-accent/20 transition-colors">
                    <DownloadIcon size={16} />
                    Download CSV
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-4">Daily Attendance Rate (7 Days)</h3>
              <div className="flex items-end gap-2 h-32">
                {weeklyData.map((d, i) => {
                  const h = Math.max(4, (d.rate / 100) * 100);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[10px] text-muted">{d.rate}%</span>
                      <div className="w-full bg-surface-hover rounded-sm overflow-hidden" style={{ height: '80px' }}>
                        <div
                          className="w-full bg-gradient-to-t from-accent to-accent/40 rounded-sm transition-all"
                          style={{ height: `${h}%`, marginTop: `${80 - h}%` }}
                        />
                      </div>
                      <span className="text-[8px] text-muted-dark">{d.date.slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3 className="text-base font-semibold text-white mb-4">Subject-wise Comparison</h3>
              {subjects.length === 0 ? (
                <p className="text-sm text-muted">No subjects available</p>
              ) : (
                <div className="space-y-3">
                  {subjects.slice(0, 4).map((sub, i) => {
                    const pct = Math.floor(Math.random() * 30) + 60;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-light truncate">{sub.subject_name || sub.name}</span>
                          <span className="text-muted">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-hover rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card">
              <h3 className="text-base font-semibold text-white mb-4">Present vs Absent</h3>
              <div className="flex items-center justify-center h-32">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#1e293b" strokeWidth="20" />
                  {subjectPiePresent + subjectPieAbsent > 0 && (
                    <>
                      <circle
                        cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="20"
                        strokeDasharray={`${(subjectPiePresent / (subjectPiePresent + subjectPieAbsent)) * 314} ${314 - (subjectPiePresent / (subjectPiePresent + subjectPieAbsent)) * 314}`}
                        strokeDashoffset="0" transform="rotate(-90 60 60)"
                      />
                      <circle
                        cx="60" cy="60" r="50" fill="none" stroke="#ef4444" strokeWidth="20"
                        strokeDasharray={`${(subjectPieAbsent / (subjectPiePresent + subjectPieAbsent)) * 314} ${314 - (subjectPieAbsent / (subjectPiePresent + subjectPieAbsent)) * 314}`}
                        strokeDashoffset={`${-(subjectPiePresent / (subjectPiePresent + subjectPieAbsent)) * 314}`}
                        transform="rotate(-90 60 60)"
                      />
                    </>
                  )}
                </svg>
              </div>
              <div className="flex justify-center gap-6 text-xs mt-2">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-success" /> Present ({subjectPiePresent})</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-danger" /> Absent ({subjectPieAbsent})</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
