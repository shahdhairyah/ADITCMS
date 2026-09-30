import { DownloadIcon, ResultIcon } from '../../utils/icons';

function getGradeColor(grade) {
  if (!grade) return 'text-muted';
  const g = grade.toUpperCase();
  if (g.startsWith('O') || g.startsWith('A+')) return 'text-green-400';
  if (g.startsWith('A')) return 'text-emerald-400';
  if (g.startsWith('B+')) return 'text-blue-400';
  if (g.startsWith('B')) return 'text-yellow-400';
  if (g.startsWith('C') || g.startsWith('D')) return 'text-orange-400';
  return 'text-red-400';
}

export default function MarksheetView({ subjects, student, semester, onDownload }) {
  if (!subjects || subjects.length === 0) {
    return (
      <div className="bg-surface-raised rounded-2xl border border-surface-border p-5 shadow-card text-center text-sm text-muted">
        No marksheet data available
      </div>
    );
  }

  const grandTotal = subjects.reduce((s, sub) => s + (Number(sub.total) || 0), 0);
  const maxTotal = subjects.length * 100;
  const percentage = maxTotal > 0 ? ((grandTotal / maxTotal) * 100).toFixed(2) : '0.00';
  const cgpa = maxTotal > 0 ? ((grandTotal / maxTotal) * 10).toFixed(2) : '0.00';

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      window.print();
    }
  };

  return (
    <div className="bg-surface-raised rounded-2xl border border-surface-border p-5 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ResultIcon size={22} className="text-accent-light" />
          <h3 className="text-lg font-semibold text-white">Marksheet</h3>
        </div>
        <button
          onClick={handleDownload}
          className="btn-secondary flex items-center gap-2 py-2 px-3 text-sm"
        >
          <DownloadIcon size={16} />
          Download PDF
        </button>
      </div>

      {(student || semester) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 mb-4 text-sm bg-surface-overlay rounded-xl px-4 py-3 border border-surface-border">
          {student && <p className="text-muted">Student: <span className="text-white font-medium">{student}</span></p>}
          {semester && <p className="text-muted">Semester: <span className="text-white font-medium">{semester}</span></p>}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border">
              <th className="text-left py-2.5 px-2 text-muted-dark font-medium text-xs uppercase tracking-wider">Subject</th>
              <th className="text-center py-2.5 px-2 text-muted-dark font-medium text-xs uppercase tracking-wider">Code</th>
              <th className="text-center py-2.5 px-2 text-muted-dark font-medium text-xs uppercase tracking-wider">Internal</th>
              <th className="text-center py-2.5 px-2 text-muted-dark font-medium text-xs uppercase tracking-wider">External</th>
              <th className="text-center py-2.5 px-2 text-muted-dark font-medium text-xs uppercase tracking-wider">Total</th>
              <th className="text-center py-2.5 px-2 text-muted-dark font-medium text-xs uppercase tracking-wider">Grade</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((sub, i) => (
              <tr key={i} className="border-b border-surface-border last:border-b-0 hover:bg-surface-hover/40 transition-colors">
                <td className="py-2.5 px-2 text-white font-medium">{sub.name || 'N/A'}</td>
                <td className="py-2.5 px-2 text-muted text-center">{sub.code || '—'}</td>
                <td className="py-2.5 px-2 text-muted text-center">{sub.internal ?? '—'}</td>
                <td className="py-2.5 px-2 text-muted text-center">{sub.external ?? '—'}</td>
                <td className="py-2.5 px-2 text-white text-center font-semibold">{sub.total ?? '—'}</td>
                <td className={`py-2.5 px-2 text-center font-semibold ${getGradeColor(sub.grade)}`}>{sub.grade || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 pt-4 border-t border-surface-border grid grid-cols-3 gap-4">
        <div className="bg-surface-overlay rounded-xl p-3 text-center border border-surface-border">
          <p className="text-xs text-muted-dark uppercase tracking-wider">Total</p>
          <p className="text-lg font-bold text-white">{grandTotal}/{maxTotal}</p>
        </div>
        <div className="bg-surface-overlay rounded-xl p-3 text-center border border-surface-border">
          <p className="text-xs text-muted-dark uppercase tracking-wider">Percentage</p>
          <p className="text-lg font-bold text-accent-light">{percentage}%</p>
        </div>
        <div className="bg-surface-overlay rounded-xl p-3 text-center border border-surface-border">
          <p className="text-xs text-muted-dark uppercase tracking-wider">CGPA</p>
          <p className="text-lg font-bold text-accent-light">{cgpa}</p>
        </div>
      </div>
    </div>
  );
}
