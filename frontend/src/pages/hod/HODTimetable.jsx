import { useState, useEffect, useMemo } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { PlusIcon, TrashIcon, LoaderIcon, XIcon, ClockIcon, CalendarIcon, UsersIcon, BookOpen } from '../../utils/icons';
import api from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat' };
const PERIODS = Array.from({ length: 8 }, (_, i) => i + 1);

const SUBJECT_COLORS = [
  { block: 'bg-indigo-500/10 border-indigo-500/30', text: 'text-indigo-300', dot: 'bg-indigo-400' },
  { block: 'bg-cyan-500/10 border-cyan-500/30', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  { block: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  { block: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-300', dot: 'bg-amber-400' },
  { block: 'bg-rose-500/10 border-rose-500/30', text: 'text-rose-300', dot: 'bg-rose-400' },
  { block: 'bg-violet-500/10 border-violet-500/30', text: 'text-violet-300', dot: 'bg-violet-400' },
  { block: 'bg-teal-500/10 border-teal-500/30', text: 'text-teal-300', dot: 'bg-teal-400' },
  { block: 'bg-sky-500/10 border-sky-500/30', text: 'text-sky-300', dot: 'bg-sky-400' },
];

const colorFor = (subjectId) => {
  const id = parseInt(subjectId) || 0;
  return SUBJECT_COLORS[Math.abs(id) % SUBJECT_COLORS.length];
};

const formatTime = (t) => {
  if (!t) return '--';
  const [h, m] = String(t).split(':');
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return t;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour % 12 || 12;
  return `${h12}:${m || '00'} ${ampm}`;
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
};

export default function HODTimetable() {
  const [weekly, setWeekly] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState('grid');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [subjectList, setSubjectList] = useState([]);
  const [classroomList, setClassroomList] = useState([]);
  const [formData, setFormData] = useState({
    branch_id: '', semester: '3', day_of_week: DAYS[0],
    period_number: '1', subject_id: '', faculty_id: '',
    classroom: '', start_time: '', end_time: '',
  });

  useEffect(() => {
    loadReferences();
    fetchAllDays();
  }, []);

  const loadReferences = async () => {
    try {
      const [facRes, subRes, clsRes] = await Promise.allSettled([
        api.get('/hod/faculty'),
        api.get('/hod/subjects'),
        api.get('/hod/classrooms'),
      ]);
      if (facRes.status === 'fulfilled' && facRes.value.success) setFacultyList(facRes.value.data || []);
      if (subRes.status === 'fulfilled' && subRes.value.success) setSubjectList(subRes.value.data || []);
      if (clsRes.status === 'fulfilled' && clsRes.value.success) setClassroomList(clsRes.value.data || []);
    } catch (err) {
      // Log instead of swallowing: a failed load leaves the form unusable.
      console.error('HODTimetable: could not load reference lists', err);
    }
  };

  const fetchAllDays = async () => {
    try {
      setLoading(true);
      setError('');
      const results = await Promise.allSettled(
        DAYS.map(day => api.get(`/hod/timetable?day=${day}`).catch(() => ({ success: false, data: [] })))
      );
      const map = {};
      DAYS.forEach((day, i) => {
        const r = results[i];
        map[day] = (r.status === 'fulfilled' && r.value.success) ? (r.value.data || []) : [];
      });
      setWeekly(map);
    } catch {
      setError('Failed to load timetable data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const payload = {
        ...formData,
        semester: parseInt(formData.semester),
        period_number: parseInt(formData.period_number),
        subject_id: parseInt(formData.subject_id),
        faculty_id: parseInt(formData.faculty_id),
        branch_id: parseInt(formData.branch_id) || 1,
      };
      const res = await api.post('/hod/add-timetable', payload);
      if (res.success) {
        setShowAddModal(false);
        await fetchAllDays();
      } else {
        setError(res.message || 'Failed to save timetable entry');
      }
    } catch (err) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this timetable entry?')) return;
    try {
      setSelectedEntry(null);
      const res = await api.delete(`/hod/delete-timetable/${id}`);
      if (res.success) {
        await fetchAllDays();
      } else {
        setError(res.message || 'Failed to delete');
      }
    } catch (err) {
      setError(err?.message || 'Failed to delete');
    }
  };

  const openAdd = (day, period) => {
    setFormData({
      branch_id: '1', semester: semesterFilter !== 'all' ? semesterFilter : '3',
      day_of_week: day || DAYS[0], period_number: String(period || 1),
      subject_id: '', faculty_id: '', classroom: '', start_time: '', end_time: '',
    });
    setShowAddModal(true);
  };

  // Derived data
  const allEntries = useMemo(() => {
    const entries = DAYS.flatMap(day => (weekly[day] || []).map(e => ({ ...e, day })));
    return entries.filter(e => semesterFilter === 'all' || parseInt(e.semester) === parseInt(semesterFilter));
  }, [weekly, semesterFilter]);

  const totalClasses = allEntries.length;
  const uniqueSubjects = new Set(allEntries.map(e => e.subject_name || e.subject).filter(Boolean)).size;
  const uniqueFaculty = new Set(allEntries.map(e => e.faculty_name).filter(Boolean)).size;

  const dayCounts = useMemo(() => {
    const counts = {};
    DAYS.forEach(day => {
      counts[day] = (weekly[day] || []).filter(e => semesterFilter === 'all' || parseInt(e.semester) === parseInt(semesterFilter)).length;
    });
    return counts;
  }, [weekly, semesterFilter]);

  const busiestDay = DAYS.reduce((best, day) => {
    const count = dayCounts[day];
    return count > best.count ? { day, count } : best;
  }, { day: '—', count: 0 });

  const facultyLoad = useMemo(() => {
    const counts = {};
    allEntries.forEach(e => {
      const name = e.faculty_name;
      if (!name) return;
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, periods]) => ({ name, periods }))
      .sort((a, b) => b.periods - a.periods)
      .slice(0, 5);
  }, [allEntries]);
  const maxFacultyLoad = facultyLoad[0]?.periods || 1;

  const legend = useMemo(() => {
    const seen = new Set();
    return allEntries
      .filter(e => {
        const key = e.subject_id || e.subject_name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 8)
      .map(e => ({
        name: e.subject_name || e.subject,
        id: e.subject_id,
        color: colorFor(e.subject_id),
      }));
  }, [allEntries]);

  if (loading && Object.keys(weekly).length === 0) return <LoadingSpinner size="lg" text="Loading timetable..." />;

  const gridForDay = (day) => {
    const entries = (weekly[day] || []).filter(e => semesterFilter === 'all' || parseInt(e.semester) === parseInt(semesterFilter));
    const map = {};
    entries.forEach(e => {
      const p = e.period_number;
      if (!map[p]) map[p] = [];
      map[p].push(e);
    });
    return map;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Department Timetable"
        subtitle="Full-week schedule management with live overview"
        action={
          <button onClick={() => openAdd()} className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors">
            <PlusIcon size={16} /> Add Entry
          </button>
        }
      />

      {error && <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>}

      {/* Weekly Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
            <CalendarIcon size={20} className="text-accent-light" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{totalClasses}</p>
            <p className="text-xs text-muted">Classes / Week</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-info/10 flex items-center justify-center flex-shrink-0">
            <BookOpen size={20} className="text-info" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{uniqueSubjects}</p>
            <p className="text-xs text-muted">Subjects</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
            <UsersIcon size={20} className="text-success" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{uniqueFaculty}</p>
            <p className="text-xs text-muted">Faculty</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-11 h-11 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0">
            <ClockIcon size={20} className="text-warning" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{busiestDay.count > 0 ? busiestDay.day.slice(0, 3) : '—'}</p>
            <p className="text-xs text-muted">{busiestDay.count > 0 ? `${busiestDay.count} classes · busiest` : 'No data'}</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="card flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex p-1 bg-surface-overlay border border-surface-border rounded-lg">
            <button onClick={() => setView('grid')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'grid' ? 'bg-accent text-white' : 'text-muted hover:text-muted-light'}`}>
              Week Grid
            </button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'list' ? 'bg-accent text-white' : 'text-muted hover:text-muted-light'}`}>
              Day List
            </button>
          </div>
          <select
            value={semesterFilter}
            onChange={e => setSemesterFilter(e.target.value)}
            className="px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-xs text-muted-light focus:outline-none focus:border-accent/50"
          >
            <option value="all">All Semesters</option>
            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
          </select>
        </div>
        {legend.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {legend.map((l, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[11px] text-muted">
                <span className={`w-2.5 h-2.5 rounded-full ${l.color.dot}`} />
                {l.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2">
          {view === 'grid' ? (
            /* ============ WEEK GRID ============ */
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[860px]">
                  {/* Header */}
                  <div className="grid grid-cols-[56px_repeat(6,1fr)] gap-px bg-surface-border rounded-t-lg overflow-hidden">
                    <div className="bg-surface-overlay p-2 flex items-center justify-center text-[10px] uppercase tracking-wider text-muted-dark">Period</div>
                    {DAYS.map(day => (
                      <div key={day} className="bg-surface-overlay p-2.5 flex flex-col items-center border-l border-surface-border/50">
                        <span className="text-xs font-semibold text-muted-light">{DAY_SHORT[day]}</span>
                        <span className="text-[10px] text-muted-dark">{dayCounts[day]} classes</span>
                      </div>
                    ))}
                  </div>

                  {/* Rows */}
                  {PERIODS.map(period => (
                    <div key={period} className="grid grid-cols-[56px_repeat(6,1fr)] gap-px bg-surface-border">
                      <div className="bg-surface-raised p-2 flex items-center justify-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent-light font-mono font-semibold text-xs">P{period}</span>
                      </div>
                      {DAYS.map(day => {
                        const entries = gridForDay(day)[period] || [];
                        return (
                          <div key={day} className="bg-surface-raised p-1.5 min-h-[86px] border-t border-surface-border/50">
                            {entries.length === 0 ? (
                              <button
                                onClick={() => openAdd(day, period)}
                                className="w-full h-full min-h-[74px] flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-border text-muted-dark hover:border-accent/40 hover:text-accent-light hover:bg-accent/5 transition-all"
                              >
                                <PlusIcon size={14} />
                                <span className="text-[10px]">Add</span>
                              </button>
                            ) : (
                              <div className="space-y-1">
                                {entries.map(entry => {
                                  const c = colorFor(entry.subject_id);
                                  return (
                                    <button
                                      key={entry.id}
                                      onClick={() => setSelectedEntry({ ...entry, day })}
                                      className={`w-full text-left p-2 rounded-lg border ${c.block} hover:opacity-80 transition-opacity`}
                                    >
                                      <p className={`text-[11px] font-semibold truncate ${c.text}`}>
                                        {entry.subject_name || entry.subject}
                                      </p>
                                      <p className="text-[10px] text-muted mt-0.5 truncate">
                                        {formatTime(entry.start_time || entry.start)} – {formatTime(entry.end_time || entry.end)}
                                      </p>
                                      <div className="flex items-center justify-between mt-1 gap-1">
                                        <span className="text-[10px] text-muted-dark truncate">
                                          {entry.faculty_name || '—'}
                                        </span>
                                        <span className="text-[10px] text-muted-dark flex-shrink-0">
                                          {entry.classroom || entry.room || '—'}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ============ DAY LIST ============ */
            <div className="space-y-6">
              {DAYS.map(day => {
                const entries = (weekly[day] || [])
                  .filter(e => semesterFilter === 'all' || parseInt(e.semester) === parseInt(semesterFilter))
                  .sort((a, b) => (a.period_number || 0) - (b.period_number || 0));
                if (entries.length === 0) return null;
                return (
                  <div key={day} className="card">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <CalendarIcon size={15} className="text-accent-light" />
                        {day}
                      </h3>
                      <span className="badge badge-primary text-[10px]">{entries.length} classes</span>
                    </div>
                    <div className="space-y-2">
                      {entries.map(entry => {
                        const c = colorFor(entry.subject_id);
                        return (
                          <button
                            key={entry.id}
                            onClick={() => setSelectedEntry({ ...entry, day })}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border ${c.block} hover:opacity-80 transition-opacity text-left`}
                          >
                            <span className={`w-8 h-8 rounded-lg ${c.dot} opacity-80 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
                              P{entry.period_number}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate ${c.text}`}>{entry.subject_name || entry.subject}</p>
                              <p className="text-[11px] text-muted truncate">
                                {entry.faculty_name || 'No faculty'} · {entry.classroom || entry.room || 'No room'}
                              </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[11px] text-muted font-mono">
                                {formatTime(entry.start_time || entry.start)} – {formatTime(entry.end_time || entry.end)}
                              </p>
                              <p className="text-[10px] text-muted-dark mt-0.5">Sem {entry.semester}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {allEntries.length === 0 && (
                <div className="card text-center py-10">
                  <p className="text-sm text-muted">No classes scheduled {semesterFilter !== 'all' ? `for Semester ${semesterFilter}` : 'this week'}.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: Faculty Load + Week Summary */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <UsersIcon size={15} className="text-accent-light" />
              Faculty Load
            </h3>
            {facultyLoad.length === 0 ? (
              <p className="text-xs text-muted">No faculty assignments.</p>
            ) : (
              <div className="space-y-3">
                {facultyLoad.map(f => (
                  <div key={f.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-muted-light truncate">{f.name}</span>
                      <span className="text-xs text-muted font-medium">{f.periods} periods</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-overlay rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${(f.periods / maxFacultyLoad) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
              <ClockIcon size={15} className="text-accent-light" />
              Week Summary
            </h3>
            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Total classes</span>
                <span className="font-medium text-muted-light">{totalClasses}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Subjects</span>
                <span className="font-medium text-muted-light">{uniqueSubjects}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Faculty</span>
                <span className="font-medium text-muted-light">{uniqueFaculty}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Busiest day</span>
                <span className="font-medium text-muted-light">{busiestDay.count > 0 ? `${busiestDay.day} (${busiestDay.count})` : '—'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}>
          <div className="bg-surface-raised rounded-xl border border-surface-border max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-surface-border">
              <div>
                <h3 className="text-base font-semibold text-white">Add Timetable Entry</h3>
                <p className="text-xs text-muted mt-0.5">
                  Schedule class for {formData.day_of_week} · Period {formData.period_number}
                </p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-muted-dark hover:text-muted-light transition-colors">
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="label">Subject</label>
                  <select value={formData.subject_id} onChange={e => setFormData({...formData, subject_id: e.target.value})} className="input-field" required>
                    <option value="">Select subject</option>
                    {subjectList.map(s => <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Faculty</label>
                  <select value={formData.faculty_id} onChange={e => setFormData({...formData, faculty_id: e.target.value})} className="input-field" required>
                    <option value="">Select faculty</option>
                    {facultyList.map(f => <option key={f.id} value={f.id}>{f.first_name} {f.last_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Period</label>
                  <select value={formData.period_number} onChange={e => setFormData({...formData, period_number: e.target.value})} className="input-field" required>
                    {PERIODS.map(p => <option key={p} value={p}>Period {p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Classroom</label>
                  <input list="classrooms-list" value={formData.classroom} onChange={e => setFormData({...formData, classroom: e.target.value})} placeholder="e.g. CE-101" className="input-field" required />
                  <datalist id="classrooms-list">
                    {classroomList.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="label">Start Time</label>
                  <input type="time" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="label">End Time</label>
                  <input type="time" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} className="input-field" required />
                </div>
                <div>
                  <label className="label">Semester</label>
                  <select value={formData.semester} onChange={e => setFormData({...formData, semester: e.target.value})} className="input-field">
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Day</label>
                  <select value={formData.day_of_week} onChange={e => setFormData({...formData, day_of_week: e.target.value})} className="input-field">
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-surface-border">
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors">
                  {saving ? <LoaderIcon size={16} className="animate-spin" /> : null}
                  {saving ? 'Creating...' : 'Create Entry'}
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted-light hover:bg-surface-hover transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedEntry(null)}>
          <div className="bg-surface-raised rounded-xl border border-surface-border max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-surface-border">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-lg bg-accent/10 text-accent-light font-mono font-semibold text-sm flex items-center justify-center">
                  P{selectedEntry.period_number}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-white">{selectedEntry.subject_name || selectedEntry.subject}</h3>
                  <p className="text-xs text-muted">{selectedEntry.day} · Sem {selectedEntry.semester}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEntry(null)} className="p-1.5 text-muted-dark hover:text-muted-light transition-colors">
                <XIcon size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm">
              <div className="flex items-center gap-3 p-3 bg-surface-overlay rounded-lg">
                <ClockIcon size={16} className="text-accent-light flex-shrink-0" />
                <div>
                  <p className="text-muted text-xs">Time</p>
                  <p className="text-muted-light font-medium">
                    {formatTime(selectedEntry.start_time || selectedEntry.start)} – {formatTime(selectedEntry.end_time || selectedEntry.end)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-overlay rounded-lg">
                <span className="w-8 h-8 rounded-full bg-info/10 text-info text-[10px] font-semibold flex items-center justify-center flex-shrink-0">
                  {getInitials(selectedEntry.faculty_name)}
                </span>
                <div>
                  <p className="text-muted text-xs">Faculty</p>
                  <p className="text-muted-light font-medium">{selectedEntry.faculty_name || 'Not assigned'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-surface-overlay rounded-lg">
                <BookOpen size={16} className="text-warning flex-shrink-0" />
                <div>
                  <p className="text-muted text-xs">Classroom</p>
                  <p className="text-muted-light font-medium">{selectedEntry.classroom || selectedEntry.room || '—'}</p>
                </div>
              </div>

              <button
                onClick={() => handleDelete(selectedEntry.id)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-danger/10 border border-danger/20 rounded-lg text-sm font-medium text-danger hover:bg-danger/20 transition-colors"
              >
                <TrashIcon size={15} />
                Delete Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
