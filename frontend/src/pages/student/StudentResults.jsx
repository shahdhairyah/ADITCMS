import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { ResultIcon, ExamIcon, BookOpen, ActivityIcon, DownloadIcon } from '../../utils/icons';
import { examAPI } from '../../services/api';

const GRADE_MAP = [
  { min: 90, grade: 'O', points: 10 },
  { min: 80, grade: 'A+', points: 9 },
  { min: 70, grade: 'A', points: 8 },
  { min: 60, grade: 'B+', points: 7 },
  { min: 50, grade: 'B', points: 6 },
  { min: 40, grade: 'C', points: 5 },
  { min: 0, grade: 'F', points: 0 },
];

const gradeColors = {
  'O': 'text-green-400 bg-green-900/30',
  'A+': 'text-green-400 bg-green-900/30',
  'A': 'text-accent-light bg-accent/10',
  'B+': 'text-warning bg-warning/10',
  'B': 'text-yellow-400 bg-yellow-900/30',
  'C': 'text-orange-400 bg-orange-900/30',
  'F': 'text-red-400 bg-red-900/30',
};

export default function StudentResults() {
  const { profile } = useAuth();
  const [results, setResults] = useState([]);
  const [marksData, setMarksData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hallTicketLoading, setHallTicketLoading] = useState(false);
  const [includedSemesters, setIncludedSemesters] = useState({});

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      setError('');

      const [resultsRes, marksRes] = await Promise.allSettled([
        examAPI.getResults({ student_id: profile?.id }).catch(() => ({ success: false, data: [] })),
        examAPI.getStudentMarks().catch(() => ({ success: false, data: null })),
      ]);

      const resultsData = resultsRes.status === 'fulfilled' ? (resultsRes.value.data || []) : [];
      setResults(resultsData);

      const marks = marksRes.status === 'fulfilled' ? marksRes.value.data : null;
      setMarksData(marks);

      const incl = {};
      resultsData.forEach((r, i) => {
        const semLabel = r.semester_name || `Semester ${r.semester_number || r.semester || i + 1}`;
        incl[semLabel] = true;
      });
      setIncludedSemesters(incl);
    } catch (err) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  /**
   * The API returns the hall ticket as JSON, not a PDF. The old code wrapped
   * that object in `new Blob([...], { type: 'application/pdf' })`, so the
   * browser saved a file called hall_ticket_<roll>.pdf that contained
   * "[object Object]" and no valid PDF header - it could not be opened.
   * A print window produces a genuine document the user can save as PDF.
   */
  const handleHallTicketDownload = async () => {
    try {
      setHallTicketLoading(true);
      const res = await examAPI.getHallTicket(profile?.id);
      const ticket = res?.data;
      if (!ticket) return;

      const esc = (v) =>
        String(v ?? '').replace(/[&<>"']/g, (c) =>
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
        );
      // Only the columns that exist: hall_tickets has hall_ticket_number and
      // generated_at, joined with the student's name/roll and the course and
      // semester. There is no seat, venue or exam_date column, so the document
      // must not invent them.
      const rows = [
        ['Hall ticket number', ticket.hall_ticket_number],
        ['Student', [ticket.first_name, ticket.last_name].filter(Boolean).join(' ')],
        ['Roll number', ticket.roll_number],
        ['Course', ticket.course_name],
        ['Semester', ticket.semester_number],
        ['Generated on', ticket.generated_at],
      ]
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`)
        .join('');

      const photo = ticket.photo
        ? `<p style="text-align:center"><img src="${esc(ticket.photo)}" alt="Student photo" style="width:110px;height:130px;object-fit:cover;border:1px solid #999"></p>`
        : '';

      const win = window.open('', '_blank', 'width=800,height=900');
      if (!win) {
        setError('Allow pop-ups to print your hall ticket.');
        return;
      }
      win.document.write(`<!DOCTYPE html>
<html><head><title>Hall Ticket - ${esc(ticket.roll_number || '')}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; margin: 40px; color: #111; }
  h1 { text-align: center; font-size: 22px; margin: 0 0 4px; }
  .sub { text-align: center; margin: 0 0 24px; font-size: 13px; color: #555; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th, td { border: 1px solid #999; padding: 9px 12px; font-size: 14px; text-align: left; }
  th { width: 34%; background: #f4f4f4; font-weight: 600; }
  .sign { display: flex; justify-content: space-between; margin-top: 64px; font-size: 13px; }
  .sign div { width: 45%; text-align: center; border-top: 1px solid #333; padding-top: 6px; }
  .foot { margin-top: 28px; font-size: 11px; color: #666; text-align: center; }
  @media print { .noprint { display: none; } }
</style></head><body>
<h1>Hall Ticket</h1>
<p class="sub">A.D. Institute of Technology (ADIT)</p>
${photo}<table>${rows}</table>
<div class="sign"><div>Signature of Invigilator</div><div>Principal</div></div>
<p class="foot">This is a computer-generated document. Errors should be reported to the examination cell immediately.</p>
<script>window.onload = function () { window.print(); };</script>
</body></html>`);
      win.document.close();
    } catch (err) {
      setError(err.message || 'Failed to load hall ticket');
    } finally {
      setHallTicketLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading results..." />;

  const subjects = marksData?.subjects || [];
  const totalObtained = subjects.reduce((s, sub) => s + (sub.total || 0), 0);
  const maxMarks = subjects.reduce((s, sub) => s + (sub.total_max || 100), 0);
  const overallPct = maxMarks > 0 ? Math.round((totalObtained / maxMarks) * 100) : 0;

  // Calculate SGPA from marks data
  const sgpa = marksData && subjects.length > 0
    ? (subjects.reduce((sum, sub) => sum + (sub.grade_point || 0) * (sub.credits || 4), 0) / 
       subjects.reduce((sum, sub) => sum + (sub.credits || 4), 0)).toFixed(2)
    : '0.00';

  // CGPA from results
  const sgpaValues = results.map((r, i) => ({
    label: r.semester_name || `Semester ${r.semester_number || r.semester || i + 1}`,
    sgpa: r.sgpa || 0,
    cgpa: r.cgpa || 0,
  }));

  const includedLabels = Object.entries(includedSemesters).filter(([, v]) => v).map(([k]) => k);
  const includedSgpas = sgpaValues.filter(s => includedLabels.includes(s.label));
  const cgpa = includedSgpas.length > 0
    ? (includedSgpas.reduce((a, b) => a + b.sgpa, 0) / includedSgpas.length).toFixed(2)
    : sgpa;

  const barWidth = sgpaValues.length > 0 ? `${Math.floor(80 / sgpaValues.length)}%` : '60px';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Results"
        subtitle="View your academic performance"
        action={
          <button
            onClick={handleHallTicketDownload}
            disabled={hallTicketLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent/10 border border-accent/20 rounded-lg text-sm text-accent-light hover:bg-accent/20 transition-colors"
          >
            <DownloadIcon size={16} />
            {hallTicketLoading ? 'Downloading...' : 'Hall Ticket'}
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {subjects.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <StatCard icon={<ResultIcon size={22} />} label="SGPA" value={sgpa} color="primary" />
            <StatCard icon={<ActivityIcon size={22} />} label="CGPA" value={cgpa} color="info" />
            <StatCard icon={<BookOpen size={22} />} label="Total Marks" value={`${totalObtained}/${maxMarks}`} color="success" />
            <StatCard icon={<ExamIcon size={22} />} label="Percentage" value={`${overallPct}%`} color={overallPct >= 70 ? 'success' : 'warning'} />
          </div>

          {/* Performance Graph */}
          {sgpaValues.length > 0 && (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-6">Performance Graph</h3>
              <div className="relative" style={{ height: '220px' }}>
                <div className="absolute left-0 top-0 bottom-6 w-8 flex flex-col justify-between text-[10px] text-muted">
                  {[10, 8, 6, 4, 2, 0].map((v) => (
                    <span key={v} className="text-right">{v}</span>
                  ))}
                </div>
                <div className="absolute left-10 right-0 top-0 bottom-6 flex flex-col justify-between">
                  {[10, 8, 6, 4, 2, 0].map((v) => (
                    <div key={v} className="border-t border-surface-border/30 w-full" />
                  ))}
                </div>
                <div className="absolute left-10 right-0 top-2 bottom-6 flex items-end justify-around">
                  {sgpaValues.map((sem, idx) => {
                    const sgpaH = (sem.sgpa / 10) * 100;
                    const cgpaH = (sem.cgpa || sem.sgpa / 2) / 10 * 100;
                    return (
                      <div key={idx} className="flex items-end gap-1" style={{ width: barWidth }}>
                        <div className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full rounded-t bg-accent transition-all duration-500"
                            style={{ height: `${Math.max(sgpaH, 2)}%` }}
                            title={`SGPA: ${sem.sgpa}`}
                          />
                          <span className="text-[9px] text-muted mt-1 truncate w-full text-center">
                            {sem.label.replace('Semester ', 'S')}
                          </span>
                        </div>
                        <div className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full rounded-t bg-info transition-all duration-500"
                            style={{ height: `${Math.max(cgpaH, 2)}%` }}
                            title={`CGPA: ${sem.cgpa}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="absolute bottom-0 left-10 right-0 flex justify-center gap-6 text-[11px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-accent" /> SGPA
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-info" /> CGPA
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card lg:col-span-2">
              <h3 className="text-base font-semibold text-white mb-5">Subject-wise Marks</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                      <th className="text-left py-3 pr-4">Subject</th>
                      <th className="text-center py-3 pr-4">Credits</th>
                      <th className="text-center py-3 pr-4">Internal</th>
                      <th className="text-center py-3 pr-4">External</th>
                      <th className="text-center py-3 pr-4">Total</th>
                      <th className="text-center py-3">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjects.map((sub, idx) => (
                      <tr key={idx} className="border-b border-surface-border/50 last:border-0">
                        <td className="py-3 pr-4">
                          <p className="text-muted-light">{sub.name || sub.subject_name}</p>
                          <p className="text-xs text-muted">{sub.code || sub.subject_code}</p>
                        </td>
                        <td className="py-3 pr-4 text-center text-muted">{sub.credits || '-'}</td>
                        <td className="py-3 pr-4 text-center text-muted">{sub.internal ?? '-'}</td>
                        <td className="py-3 pr-4 text-center text-muted">{sub.external ?? '-'}</td>
                        <td className="py-3 pr-4 text-center text-white font-medium">{sub.total ?? '-'}</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${gradeColors[sub.grade] || 'text-muted bg-surface-overlay'}`}>
                            {sub.grade || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              {/* Performance Trend */}
              <div className="card">
                <h3 className="text-base font-semibold text-white mb-5">Performance Trend</h3>
                {results.length > 0 ? (
                  <div className="space-y-4">
                    {results.map((r, idx) => {
                      const semLabel = r.semester_name || `Semester ${r.semester_number || r.semester || idx + 1}`;
                      const sgpaVal = r.sgpa || 0;
                      const pct = (sgpaVal / 10) * 100;
                      return (
                        <div key={idx}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-xs text-muted">{semLabel.replace('Semester ', 'Sem ')}</span>
                            <span className="text-xs text-white font-medium">{sgpaVal}</span>
                          </div>
                          <div className="relative w-full h-2.5 bg-surface-overlay rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted text-sm">No trend data available.</p>
                )}
              </div>

              {/* CGPA Calculator */}
              <div className="card">
                <h3 className="text-base font-semibold text-white mb-4">CGPA Calculator</h3>
                {sgpaValues.length > 0 ? (
                  <>
                    <div className="space-y-2 mb-4">
                      {sgpaValues.map((sem, idx) => (
                        <label key={idx} className="flex items-center gap-2 text-sm text-muted-light cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includedSemesters[sem.label] !== false}
                            onChange={(e) => setIncludedSemesters({ ...includedSemesters, [sem.label]: e.target.checked })}
                            className="w-4 h-4 rounded border-surface-border bg-surface-overlay accent-accent"
                          />
                          <span className="flex-1">{sem.label}</span>
                          <span className="font-medium text-white">{sem.sgpa}</span>
                        </label>
                      ))}
                    </div>
                    <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">Cumulative CGPA</span>
                        <span className="text-xl font-bold text-accent-light">{cgpa}</span>
                      </div>
                      <p className="text-[11px] text-muted mt-1">
                        Based on {includedSgpas.length} semester(s)
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted text-sm">No data to calculate.</p>
                )}
              </div>

              {/* Grade Reference */}
              <div className="card">
                <h3 className="text-base font-semibold text-white mb-4">Grade Reference</h3>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {GRADE_MAP.filter((g) => g.grade !== 'F').map((g) => (
                    <div key={g.grade} className="flex items-center justify-between px-2.5 py-1.5 bg-surface-overlay rounded-lg">
                      <span className="text-muted">{g.grade}</span>
                      <span className="text-muted-light font-medium">{g.min}-{g.min + 9}%</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-2.5 py-1.5 bg-surface-overlay rounded-lg">
                    <span className="text-danger">F</span>
                    <span className="text-muted-light font-medium">&lt;40%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <EmptyState title="No Results" description="No exam results available yet. Results will appear after your exams are evaluated." />
      )}
    </div>
  );
}
