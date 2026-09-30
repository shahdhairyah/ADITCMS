import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { FacultyIcon, SearchIcon, PlusIcon } from '../../utils/icons';
import api from '../../services/api';

export default function HODFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', employee_id: '', qualification: '', designation: '', phone: '' });

  useEffect(() => {
    loadFaculty();
  }, []);

  const loadFaculty = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hod/faculty');
      if (res.success) setFaculty(res.data || []);
      else setError(res.message || 'Failed to load faculty');
    } catch (err) {
      setError(err.message || 'Failed to load faculty');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      const res = await api.post('/hod/add-faculty', form);
      if (res.success) {
        setShowForm(false);
        setForm({ email: '', password: '', first_name: '', last_name: '', employee_id: '', qualification: '', designation: '', phone: '' });
        loadFaculty();
      } else {
        setError(res.message || 'Failed to add faculty');
      }
    } catch (err) {
      setError(err.message || err.data?.message || 'Failed to add faculty');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = faculty.filter(f =>
    !search || f.first_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.last_name?.toLowerCase().includes(search.toLowerCase()) ||
    f.employee_code?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <LoadingSpinner size="lg" text="Loading faculty..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Department Faculty"
        subtitle="View and manage faculty members in your department."
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <PlusIcon size={16} />
            Add Faculty
          </button>
        }
      />

      {error && <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>}

      {showForm && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-5">Add New Faculty</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted mb-1.5">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Password *</label>
                <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">First Name *</label>
                <input type="text" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Last Name *</label>
                <input type="text" value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Employee ID *</label>
                <input type="text" value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} required
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Designation</label>
                <input type="text" value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="e.g. Associate Professor"
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Qualification</label>
                <input type="text" value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} placeholder="e.g. M.Tech, Ph.D"
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Phone</label>
                <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setError(''); }}
                className="px-4 py-2 bg-surface-overlay border border-surface-border rounded-xl text-sm text-muted-light hover:bg-surface-hover transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-5 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">
                {submitting ? 'Adding...' : 'Add Faculty'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or employee code..."
              className="w-full pl-9 pr-4 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
            />
          </div>
          <span className="text-xs text-muted">{filtered.length} faculty member(s)</span>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No Faculty" description={search ? 'No faculty match your search.' : 'No faculty in your department.'} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Code</th>
                  <th className="text-left py-3 pr-4">Name</th>
                  <th className="text-left py-3 pr-4">Designation</th>
                  <th className="text-left py-3 pr-4">Email</th>
                  <th className="text-left py-3 pr-4">Phone</th>
                  <th className="text-center py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, idx) => (
                  <tr key={f.id || idx} className="border-b border-surface-border/50 last:border-0">
                    <td className="py-3.5 pr-4 text-muted-light font-medium">{f.employee_code || f.employee_id || '-'}</td>
                    <td className="py-3.5 pr-4">
                      <span className="text-muted-light">{f.first_name} {f.last_name}</span>
                    </td>
                    <td className="py-3.5 pr-4 text-muted">{f.designation || '-'}</td>
                    <td className="py-3.5 pr-4 text-muted">{f.email || '-'}</td>
                    <td className="py-3.5 pr-4 text-muted">{f.phone || '-'}</td>
                    <td className="py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        f.user_status === 'active' ? 'text-green-400 bg-green-500/10' : 'text-muted bg-surface-hover'
                      }`}>
                        {f.user_status || 'Unknown'}
                      </span>
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