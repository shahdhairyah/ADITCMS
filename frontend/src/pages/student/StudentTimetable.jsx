import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { TimetableIcon, CalendarIcon } from '../../utils/icons';
import { timetableAPI } from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetable() {
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTimetable();
  }, [selectedDay]);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await timetableAPI.get({ day: selectedDay });
      if (res && res.success !== false) {
        setTimetable(res.data || res || []);
      } else {
        setTimetable([]);
      }
    } catch (err) {
      setTimetable([]);
      setError(err?.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading timetable..." />;

  return (
    <div className="space-y-8">
      <PageHeader title="Timetable" subtitle="View your class schedule" />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="card">
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <CalendarIcon size={16} className="text-muted flex-shrink-0" />
          {DAYS.map((day) => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                selectedDay === day
                  ? 'bg-accent/15 text-accent-light border border-accent/30'
                  : 'bg-surface-overlay text-muted hover:bg-surface-hover hover:text-muted-light border border-surface-border/50'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {timetable.length === 0 ? (
          <EmptyState title="No Classes" description={`No classes scheduled for ${selectedDay}.`} />
        ) : (
          <div className="space-y-3">
            {timetable.map((period, idx) => (
              <div
                key={period.id || idx}
                className="flex items-center gap-4 p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors"
              >
                <div className="w-24 text-xs text-muted font-mono flex-shrink-0 text-center">
                  <span className="block">{period.start_time || period.start}</span>
                  <span className="block text-muted-dark">-</span>
                  <span className="block">{period.end_time || period.end}</span>
                </div>
                <div className="w-0.5 h-12 rounded-full bg-accent/30 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-sm text-muted-light">{period.subject_name || period.subject}</p>
                  <div className="flex items-center gap-3 text-xs text-muted mt-1">
                    <span>{period.room || period.room_number || '-'}</span>
                    {period.faculty_name && (
                      <>
                        <span className="text-muted-dark">|</span>
                        <span>{period.faculty_name}</span>
                      </>
                    )}
                  </div>
                </div>
                {period.type && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    period.type === 'Lab' || period.type === 'lab'
                      ? 'bg-info/10 text-info border border-info/20'
                      : 'bg-accent/10 text-accent-light border border-accent/20'
                  }`}>
                    {period.type}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
