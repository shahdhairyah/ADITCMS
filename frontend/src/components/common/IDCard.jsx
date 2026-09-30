export default function IDCard({ student = {} }) {
  if (!student || !student.first_name) return null;
  return (
    <div className="max-w-sm mx-auto bg-gradient-to-br from-surface-raised to-surface-overlay rounded-2xl border border-surface-border overflow-hidden shadow-xl">
      <div className="bg-gradient-to-r from-accent to-accent-dark p-5 text-center">
        <div className="w-20 h-20 rounded-full bg-white/20 mx-auto mb-3 flex items-center justify-center text-3xl font-bold text-white border-2 border-white/30">
          {((student.first_name || '')[0] + (student.last_name || '')[0]) || 'S'}
        </div>
        <h3 className="text-lg font-bold text-white">{student.first_name} {student.last_name}</h3>
        <p className="text-sm text-white/70">{student.roll_number || student.roll_no}</p>
      </div>
      <div className="p-5 space-y-3">
        {[
          { label: 'Course', value: student.course_name || student.course || 'B.Tech' },
          { label: 'Semester', value: student.semester_name || student.semester || '3' },
          { label: 'Department', value: student.department_name || student.department || 'Computer Engineering' },
          { label: 'Email', value: student.email || '-' },
          { label: 'Contact', value: student.phone || student.mobile || '-' },
          { label: 'Valid Until', value: student.valid_until || 'June 2028' },
        ].map((item, idx) => (
          <div key={idx} className="flex justify-between items-center border-b border-surface-border/50 pb-2 last:border-0">
            <span className="text-xs text-muted">{item.label}</span>
            <span className="text-xs text-muted-light font-medium">{item.value}</span>
          </div>
        ))}
      </div>
      <div className="px-5 pb-4 text-center">
        <div className="w-32 h-8 mx-auto bg-surface-overlay rounded border border-surface-border/50 flex items-center justify-center">
          <span className="text-[8px] text-muted-dark tracking-widest">ADIT CMS</span>
        </div>
      </div>
    </div>
  );
}
