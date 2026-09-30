import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { SubjectIcon, SearchIcon, PlusIcon } from '../../utils/icons';
import api from '../../services/api';

export default function HODSubjects() {
  const [subjects, setSubjects] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ name: '', code: '', semester: '', credits: 3, type: 'theory' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subRes, facRes] = await Promise.all([
        api.get('/hod/subjects'),
        api.get('/hod/faculty')
      ]);
      if (subRes.success) setSubjects(subRes.data || []);
      else setError(subRes.message || 'Failed to load subjects');
      if (facRes.success) setFacultyList(facRes.data || []);
      else setError(facRes.message || 'Failed to load faculty');
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      const res = await api.post('/hod/add-subject', form);
      if (res.success) {
        setShowForm(false);
        setForm({ name: '', code: '', semester: '', credits: 3, type: 'theory' });
        setSuccess('Subject added successfully');
        setTimeout(() => setSuccess(''), 3000);
        loadData();
      } else {
        setError(res.message || 'Failed to add subject');
      }
    } catch (err) {
      setError(err.message || err.data?.message || 'Failed to add subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (subjectId, facultyId) => {
    try {
      setAssigning(subjectId);
      setError('');
      setSuccess('');
      const res = await api.put(`/hod/assign-faculty/${subjectId}`, { faculty_id: facultyId || null });
      if (res.success) {
        setSuccess('Faculty updated');
        setTimeout(() => setSuccess(''), 2500);
        loadData();
      }
      else setError(res.message || 'Failed to assign faculty');
    } catch (err) {
      setError(err.message || 'Failed to assign faculty');
    } finally {
      setAssigning(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this subject?')) return;
    try {
      setError('');
      setSuccess('');
      const res = await api.delete(`/hod/delete-subject/${id}`);
      if (res.success) {
        setSuccess('Subject deleted');
        setTimeout(() => setSuccess(''), 2500);
        loadData();
      }
      else setError(res.message || 'Failed to delete');
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const filtered = subjects.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.code?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner size="lg" text="Loading subjects..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Department Subjects"
        subtitle="Manage subjects and assign faculty."
        action={
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
            <PlusIcon size={16} /> Add Subject
          </button>
        }
      />

      {error && <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>}
      {success && <div className="bg-accent/10 border border-accent/20 text-accent px-4 py-3 rounded-xl text-sm">{success}</div>}

      {showForm && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-5">Add New Subject</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted mb-1.5">Subject Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Subject Code *</label>
                <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Semester *</label>
                <select value={form.semester} onChange={e => setForm({ ...form, semester: e.target.value })} required
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50">
                  <option value="">Select semester</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                    <option key={n} value={n}>Semester {n}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Credits</label>
                <input type="number" min="1" max="6" value={form.credits} onChange={e => setForm({ ...form, credits: parseInt(e.target.value) || 3 })}
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Type</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50">
                  <option value="theory">Theory</option>
                  <option value="practical">Practical</option>
                  <option value="theory_practical">Theory + Practical</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setError(''); }}
                className="px-4 py-2 bg-surface-overlay border border-surface-border rounded-xl text-sm text-muted-light hover:bg-surface-hover transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-5 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">
                {submitting ? 'Adding...' : 'Add Subject'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subjects..."
              className="w-full pl-9 pr-4 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50" />
          </div>
          <span className="text-xs text-muted">{filtered.length} subject(s)</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No Subjects" description={search ? 'No subjects match your search.' : 'No subjects in your department.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Code</th>
                  <th className="text-left py-3 pr-4">Name</th>
                  <th className="text-center py-3 pr-4">Sem</th>
                  <th className="text-center py-3 pr-4">Credits</th>
                  <th className="text-left py-3 pr-4">Type</th>
                  <th className="text-left py-3 pr-4">Assigned Faculty</th>
                  <th className="text-right py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className="border-b border-surface-border/50 last:border-0">
                    <td className="py-3.5 pr-4 text-muted-light font-medium">{s.code || '-'}</td>
                    <td className="py-3.5 pr-4 text-muted-light">{s.name}</td>
                    <td className="py-3.5 pr-4 text-center text-muted">{s.semester || s.semester_id || '-'}</td>
                    <td className="py-3.5 pr-4 text-center text-muted">{s.credits || '-'}</td>
                    <td className="py-3.5 pr-4 text-muted capitalize">{s.type?.replace('_', ' + ') || '-'}</td>
                    <td className="py-3.5 pr-4">
                      <select
                        value={s.faculty_id || ''}
                        onChange={e => handleAssign(s.id, e.target.value)}
                        disabled={assigning === s.id}
                        className="bg-surface-overlay border border-surface-border rounded-lg px-2 py-1 text-xs text-muted-light focus:outline-none focus:border-accent/50 max-w-[160px]"
                      >
                        <option value="">Unassigned</option>
                        {facultyList.map(f => (
                          <option key={f.id} value={f.id}>{f.first_name} {f.last_name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3.5 text-right">
                      <button onClick={() => handleDelete(s.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-colors">
                        Delete
                      </button>
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