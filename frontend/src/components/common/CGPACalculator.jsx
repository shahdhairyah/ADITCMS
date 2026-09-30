import { ResultIcon, ActivityIcon, BookOpen } from '../../utils/icons';

const gradeMap = {
  'O': { min: 90, color: 'text-green-400 bg-green-900/30' },
  'A+': { min: 80, color: 'text-accent-light bg-accent/10' },
  'A': { min: 70, color: 'text-blue-400 bg-blue-900/30' },
  'B+': { min: 60, color: 'text-warning bg-warning/10' },
  'B': { min: 50, color: 'text-yellow-400 bg-yellow-900/30' },
  'C': { min: 40, color: 'text-orange-400 bg-orange-900/30' },
  'F': { min: 0, color: 'text-danger bg-danger/10' },
};

export default function CGPACalculator({ subjects = [], sgpa = 0, cgpa = 0 }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 text-center">
          <p className="text-xs text-muted mb-1">Current SGPA</p>
          <p className="text-2xl font-bold text-accent-light">{sgpa || '-'}</p>
        </div>
        <div className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 text-center">
          <p className="text-xs text-muted mb-1">Overall CGPA</p>
          <p className="text-2xl font-bold text-white">{cgpa || '-'}</p>
        </div>
      </div>
      {subjects.length > 0 && (
        <div className="space-y-2">
          {subjects.map((sub, idx) => {
            const gradeInfo = Object.entries(gradeMap).find(([_, g]) => (sub.percentage || 0) >= g.min);
            const grade = gradeInfo?.[0] || sub.grade || 'F';
            const gradeColor = gradeMap[grade]?.color || 'text-muted bg-surface-overlay';
            const internal = sub.internal || sub.internal_marks || 0;
            const external = sub.external || sub.external_marks || 0;
            const total = sub.total || internal + external;
            return (
              <div key={idx} className="flex items-center justify-between p-3 bg-surface-overlay rounded-xl border border-surface-border/50">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-muted-light truncate">{sub.name || sub.subject_name}</p>
                  <p className="text-[10px] text-muted">{sub.code || sub.subject_code} &bull; {sub.credits || '-'} credits</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                  <span className="text-xs text-muted">{internal}/{external}/{total}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${gradeColor}`}>{grade}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
