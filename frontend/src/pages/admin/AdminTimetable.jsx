import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { TimetableIcon, PlusIcon, EditIcon, TrashIcon, LoaderIcon } from '../../utils/icons';
import { timetableAPI } from '../../services/api';
import api from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIODS = Array.from({ length: 8 }, (_, i) => `Period ${i + 1}`);

export default function AdminTimetable() {
  const [selectedDay, setSelectedDay] = useState(DAYS[0]);
  const [timetable, setTimetable] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
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
  }, []);

  useEffect(() => {
    if (selectedDay) fetchTimetable();
  }, [selectedDay]);

  const loadReferences = async () => {
    try {
      const [facRes, subRes, clsRes] = await Promise.allSettled([
        api.get('/faculty').catch(() => ({ success: false, data: [] })),
        // /hod/subjects is HOD-only, so an admin got 403 and an empty subject
        // dropdown. /courses/subjects is role-scoped and works for every role.
        api.get('/courses/subjects').catch(() => ({ success: false, data: [] })),
        api.get('/classrooms').catch(() => ({ success: false, data: [] })),
      ]);
      if (facRes.status === 'fulfilled' && facRes.value.success) setFacultyList(facRes.value.data || []);
      if (subRes.status === 'fulfilled' && subRes.value.success) setSubjectList(subRes.value.data || []);
      if (clsRes.status === 'fulfilled' && clsRes.value.success) setClassroomList(clsRes.value.data || []);
    } catch (err) {
      // Previously this failed silently, so a 403 on the subject list left an
      // empty dropdown with no indication of why.
      console.error('AdminTimetable: could not load reference lists', err);
    }
  };

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

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');

      if (!formData.branch_id) {
        setError('Select a branch before saving');
        return;
      }

      const payload = {
        ...formData,
        semester: parseInt(formData.semester),
        period_number: parseInt(formData.period_number),
        subject_id: parseInt(formData.subject_id),
        faculty_id: parseInt(formData.faculty_id),
        // No "|| 1" fallback: that silently filed the entry under branch 1
        // whenever the select was left empty.
        branch_id: parseInt(formData.branch_id),
      };

      let res;
      if (editing) {
        res = await timetableAPI.update(editing, payload);
      } else {
        res = await timetableAPI.create(payload);
      }

      if (res && res.success !== false) {
        setShowForm(false);
        setEditing(null);
        resetForm();
        fetchTimetable();
      } else {
        setError(res?.message || 'Failed to save timetable entry');
      }
    } catch (err) {
      setError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (entry) => {
    setFormData({
      branch_id: entry.branch_id?.toString() || entry.department_id?.toString() || '1',
      semester: entry.semester?.toString() || '3',
      day_of_week: entry.day_of_week || selectedDay,
      period_number: entry.period_number?.toString() || '1',
      subject_id: entry.subject_id?.toString() || '',
      faculty_id: entry.faculty_id?.toString() || '',
      classroom: entry.classroom || entry.room || '',
      start_time: entry.start_time || '',
      end_time: entry.end_time || '',
    });
    setEditing(entry.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this timetable entry?')) return;
    try {
      const res = await timetableAPI.delete(id);
      if (res && res.success !== false) {
        fetchTimetable();
      } else {
        setError(res?.message || 'Failed to delete');
      }
    } catch (err) {
      setError(err?.message || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({
      branch_id: '1', semester: '3', day_of_week: selectedDay,
      period_number: '1', subject_id: '', faculty_id: '',
      classroom: '', start_time: '', end_time: '',
    });
  };

  if (loading && timetable.length === 0) return <LoadingSpinner size="lg" text="Loading timetable..." />;

  const sortedTimetable = [...timetable].sort((a, b) => (a.period_number || 0) - (b.period_number || 0));

  return (
    <div className="space-y-8">
      <PageHeader title="Timetable Management" subtitle="Create and manage class schedules." />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <TimetableIcon size={16} className="text-muted flex-shrink-0" />
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
          <button
            onClick={() => { setShowForm(true); setEditing(null); resetForm(); setFormData(fd => ({...fd, day_of_week: selectedDay})); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors flex-shrink-0"
          >
            <PlusIcon size={16} /> Add Entry
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSave} className="mb-6 p-5 bg-surface-overlay rounded-xl border border-surface-border">
            <h4 className="text-sm font-semibold text-white mb-4">{editing ? 'Edit' : 'Add'} Timetable Entry</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs text-muted mb-1">Subject</label>
                <select
                  value={formData.subject_id}
                  onChange={e => setFormData({...formData, subject_id: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  required
                >
                  <option value="">Select subject</option>
                  {subjectList.map(s => (
                    <option key={s.id} value={s.id}>{s.name} {s.code ? `(${s.code})` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Faculty</label>
                <select
                  value={formData.faculty_id}
                  onChange={e => setFormData({...formData, faculty_id: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  required
                >
                  <option value="">Select faculty</option>
                  {facultyList.map(f => (
                    <option key={f.id} value={f.id}>{f.first_name} {f.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Period</label>
                <select
                  value={formData.period_number}
                  onChange={e => setFormData({...formData, period_number: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  required
                >
                  {PERIODS.map((p, i) => (
                    <option key={i + 1} value={i + 1}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Classroom</label>
                <input
                  list="classrooms-list"
                  value={formData.classroom}
                  onChange={e => setFormData({...formData, classroom: e.target.value})}
                  placeholder="e.g. CE-101"
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  required
                />
                <datalist id="classrooms-list">
                  {classroomList.map(c => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Start Time</label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={e => setFormData({...formData, start_time: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">End Time</label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={e => setFormData({...formData, end_time: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Semester</label>
                <select
                  value={formData.semester}
                  onChange={e => setFormData({...formData, semester: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                >
                  {[1,2,3,4,5,6,7,8].map(s => (
                    <option key={s} value={s}>Semester {s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Day</label>
                <select
                  value={formData.day_of_week}
                  onChange={e => setFormData({...formData, day_of_week: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                >
                  {DAYS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
              >
                {saving ? <LoaderIcon size={16} className="animate-spin" /> : editing ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditing(null); }}
                className="px-4 py-2 bg-surface-hover text-muted rounded-lg text-sm font-medium hover:text-muted-light transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {sortedTimetable.length === 0 ? (
          <EmptyState title="No Classes" description={`No classes scheduled for ${selectedDay}. Click "Add Entry" to create one.`} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4 w-20">Period</th>
                  <th className="text-left py-3 pr-4">Time</th>
                  <th className="text-left py-3 pr-4">Subject</th>
                  <th className="text-left py-3 pr-4">Faculty</th>
                  <th className="text-left py-3 pr-4">Room</th>
                  <th className="text-center py-3 pr-4">Semester</th>
                  <th className="text-center py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedTimetable.map((entry, idx) => (
                  <tr key={entry.id || idx} className="border-b border-surface-border/50 last:border-0">
                    <td className="py-3.5 pr-4">
                      <span className="text-muted-light font-mono font-medium">P{entry.period_number}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-muted font-mono text-xs">
                        {entry.start_time || entry.start} - {entry.end_time || entry.end}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-muted-light font-medium">{entry.subject_name || entry.subject || '-'}</span>
                    </td>
                    <td className="py-3.5 pr-4 text-muted">{entry.faculty_name || '-'}</td>
                    <td className="py-3.5 pr-4 text-muted">{entry.classroom || entry.room || '-'}</td>
                    <td className="py-3.5 pr-4 text-center text-muted">Sem {entry.semester}</td>
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(entry)} className="p-1.5 text-muted hover:text-accent-light transition-colors">
                          <EditIcon size={15} />
                        </button>
                        <button onClick={() => handleDelete(entry.id)} className="p-1.5 text-muted hover:text-danger transition-colors">
                          <TrashIcon size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}