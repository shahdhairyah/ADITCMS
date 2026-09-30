import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatCard from '../../components/common/StatCard';
import { BookOpen, CheckIcon, ClockIcon } from '../../utils/icons';
import { labManualAPI } from '../../services/api';

export default function StudentLabManualStatus() {
  const [manuals, setManuals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      setError('');
      const [manualsRes, subsRes] = await Promise.allSettled([
        labManualAPI.getAll().catch(() => ({ success: false, data: [] })),
        labManualAPI.getStudentSubmissions().catch(() => ({ success: false, data: [] })),
      ]);

      const allManuals = manualsRes.status === 'fulfilled' ? (manualsRes.value.data || []) : [];
      const mySubmissions = subsRes.status === 'fulfilled' ? (subsRes.value.data || []) : [];

      // Map submissions by lab_manual_id
      const subMap = {};
      mySubmissions.forEach(s => {
        subMap[s.lab_manual_id] = s;
      });

      // Attach submission to each manual
      const enriched = allManuals.map(m => ({
        ...m,
        submission: subMap[m.id] || null,
      }));

      setManuals(enriched);
    } catch (err) {
      setError(err.message || 'Failed to load lab manual status');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading lab manual status..." />;

  const subjects = {};
  manuals.forEach((m) => {
    const sub = m.subject_name || m.subject || 'Unknown';
    if (!subjects[sub]) subjects[sub] = { total: 0, submitted: 0, reviewed: 0, marksObtained: 0, maxMarks: 0 };
    subjects[sub].total += 1;
    if (m.submission) {
      subjects[sub].submitted += 1;
      if (m.submission.status === 'reviewed' || m.submission.status === 'graded') {
        subjects[sub].reviewed += 1;
      }
      if (m.submission.marks !== null && m.submission.marks !== undefined) {
        subjects[sub].marksObtained += Number(m.submission.marks);
        subjects[sub].maxMarks += Number(m.max_marks || 100);
      }
    }
  });

  const total = manuals.length;
  const submitted = manuals.filter((m) => m.submission).length;
  const reviewed = manuals.filter((m) => m.submission?.status === 'reviewed' || m.submission?.status === 'graded').length;
  const totalMarks = manuals.reduce((sum, m) => sum + (m.submission?.marks !== null && m.submission?.marks !== undefined ? Number(m.submission.marks) : 0), 0);
  const totalMaxMarks = manuals.reduce((sum, m) => sum + (m.submission?.marks !== null && m.submission?.marks !== undefined ? Number(m.max_marks || 100) : 0), 0);

  const subjectEntries = Object.entries(subjects).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="space-y-8">
      <PageHeader title="Lab Manual Status" subtitle="Track your lab manual progress across subjects" />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard icon={<BookOpen size={22} />} label="Total Lab Manuals" value={total} color="primary" />
        <StatCard icon={<CheckIcon size={22} />} label="Submitted" value={submitted} color="success" />
        <StatCard icon={<ClockIcon size={22} />} label="Pending" value={total - submitted} color="warning" />
        <StatCard icon={<BookOpen size={22} />} label="Reviewed" value={reviewed} color="info" />
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-white mb-5">Subject-wise Breakdown</h3>
        {subjectEntries.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={28} />}
            title="No Lab Manuals"
            description="No lab manuals have been assigned yet."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Subject</th>
                  <th className="text-center py-3 pr-4">Total</th>
                  <th className="text-center py-3 pr-4">Submitted</th>
                  <th className="text-center py-3 pr-4">Pending</th>
                  <th className="text-center py-3 pr-4">Reviewed</th>
                  <th className="text-center py-3">Marks</th>
                </tr>
              </thead>
              <tbody>
                {subjectEntries.map(([subject, data]) => {
                  const pending = data.total - data.submitted;
                  return (
                    <tr key={subject} className="border-b border-surface-border/50 last:border-0">
                      <td className="py-3.5 pr-4 text-muted-light font-medium">{subject}</td>
                      <td className="py-3.5 pr-4 text-center text-muted">{data.total}</td>
                      <td className="py-3.5 pr-4 text-center">
                        <span className="text-success">{data.submitted}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <span className={pending > 0 ? 'text-warning' : 'text-muted-dark'}>{pending}</span>
                      </td>
                      <td className="py-3.5 pr-4 text-center">
                        <span className={data.reviewed > 0 ? 'text-info' : 'text-muted-dark'}>{data.reviewed}</span>
                      </td>
                      <td className="py-3.5 text-center">
                        {data.maxMarks > 0 ? (
                          <span className="text-white font-medium">{data.marksObtained}/{data.maxMarks}</span>
                        ) : (
                          <span className="text-muted-dark">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalMarks > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Overall Performance</h3>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-white">{totalMarks}</p>
              <p className="text-sm text-muted mb-1">/ {totalMaxMarks} marks</p>
            </div>
            <div className="mt-3 h-3 bg-surface-overlay rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all"
                style={{ width: `${(totalMarks / totalMaxMarks) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-2">
              Average: {((totalMarks / totalMaxMarks) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="card">
            <h3 className="text-sm font-semibold text-white mb-3">Completion Summary</h3>
            <div className="flex items-end gap-3">
              <p className="text-3xl font-bold text-white">{submitted}</p>
              <p className="text-sm text-muted mb-1">/ {total} completed</p>
            </div>
            <div className="mt-3 h-3 bg-surface-overlay rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${total > 0 ? (submitted / total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted mt-2">
              {total > 0 ? ((submitted / total) * 100).toFixed(1) : 0}% completion rate
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
