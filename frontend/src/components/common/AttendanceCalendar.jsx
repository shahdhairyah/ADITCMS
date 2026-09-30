import { ChevronRight, ChevronDown } from '../../utils/icons';

export default function AttendanceCalendar({ year, month, data = [], onMonthChange, onDateClick }) {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);
  
  const getStatus = (day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = data.find(d => d.date === dateStr || d.date?.startsWith(dateStr));
    return record?.status;
  };
  
  const prevMonth = () => {
    const newMonth = month === 1 ? 12 : month - 1;
    const newYear = month === 1 ? year - 1 : year;
    onMonthChange?.(newYear, newMonth);
  };
  
  const nextMonth = () => {
    const newMonth = month === 12 ? 1 : month + 1;
    const newYear = month === 12 ? year + 1 : year;
    onMonthChange?.(newYear, newMonth);
  };
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  
  return (
    <div className="bg-surface-overlay rounded-xl border border-surface-border/50 p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1.5 text-muted-dark hover:text-muted-light transition-colors rounded-lg hover:bg-surface-hover">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span className="text-sm font-medium text-white">{monthNames[month - 1]} {year}</span>
        <button onClick={nextMonth} className="p-1.5 text-muted-dark hover:text-muted-light transition-colors rounded-lg hover:bg-surface-hover">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[10px] text-muted-dark font-medium py-1">{d}</div>
        ))}
        {calendarDays.map((day, idx) => {
          if (day === null) return <div key={`e${idx}`} />;
          const status = getStatus(day);
          const dotColor = status === 'present' ? 'bg-success' : status === 'absent' ? 'bg-danger' : status === 'late' ? 'bg-warning' : '';
          return (
            <button
              key={day}
              onClick={() => onDateClick?.(day)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition-colors hover:bg-surface-hover ${status ? 'text-muted-light' : 'text-muted-dark'}`}
            >
              <span>{day}</span>
              {status && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${dotColor}`} />}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-surface-border/50">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-success" /><span className="text-[10px] text-muted">Present</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-danger" /><span className="text-[10px] text-muted">Absent</span></div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-warning" /><span className="text-[10px] text-muted">Late</span></div>
      </div>
    </div>
  );
}
