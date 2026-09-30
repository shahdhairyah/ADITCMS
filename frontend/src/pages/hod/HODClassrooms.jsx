import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { BookOpen, PlusIcon, EditIcon, TrashIcon } from '../../utils/icons';
import api from '../../services/api';

export default function HODClassrooms() {
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', capacity: 30, building: '', floor: '' });

  useEffect(() => { loadClassrooms(); }, []);

  const loadClassrooms = async () => {
    try {
      setLoading(true);
      const res = await api.get('/hod/classrooms');
      if (res.success) setClassrooms(res.data || []);
    } catch {
      setError('Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      let res;
      if (editing) {
        res = await api.put(`/hod/update-classroom/${editing}`, form);
      } else {
        res = await api.post('/hod/add-classroom', form);
      }
      if (res.success) {
        setShowForm(false);
        setEditing(null);
        setForm({ name: '', capacity: 30, building: '', floor: '' });
        loadClassrooms();
      } else {
        setError(res.message || 'Failed to save classroom');
      }
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (c) => {
    setForm({ name: c.name, capacity: c.capacity || 30, building: c.building || '', floor: c.floor || '' });
    setEditing(c.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this classroom?')) return;
    try {
      const res = await api.delete(`/hod/delete-classroom/${id}`);
      if (res.success) loadClassrooms();
      else setError(res.message || 'Failed to delete');
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading classrooms..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Department Classrooms"
        subtitle="Manage classrooms and rooms in your department."
        action={
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', capacity: 30, building: '', floor: '' }); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
            <PlusIcon size={16} /> {showForm ? 'Cancel' : 'Add Classroom'}
          </button>
        }
      />

      {error && <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>}

      {showForm && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-5">{editing ? 'Edit' : 'Add'} Classroom</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted mb-1.5">Room / Name *</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Capacity</label>
                <input type="number" min="1" max="500" value={form.capacity} onChange={e => setForm({ ...form, capacity: parseInt(e.target.value) || 30 })}
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Building</label>
                <input type="text" value={form.building} onChange={e => setForm({ ...form, building: e.target.value })}
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Floor</label>
                <input type="text" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })}
                  className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50" />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                className="px-4 py-2 bg-surface-overlay border border-surface-border rounded-xl text-sm text-muted-light hover:bg-surface-hover transition-colors">Cancel</button>
              <button type="submit" disabled={submitting}
                className="px-5 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors">
                {submitting ? 'Saving...' : editing ? 'Update' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="text-base font-semibold text-white mb-5">Classrooms</h3>
        {classrooms.length === 0 ? (
          <EmptyState title="No Classrooms" description="No classrooms have been added yet." icon={<BookOpen size={32} />} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Name</th>
                  <th className="text-center py-3 pr-4">Capacity</th>
                  <th className="text-left py-3 pr-4">Building</th>
                  <th className="text-left py-3 pr-4">Floor</th>
                  <th className="text-center py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classrooms.map((c) => (
                  <tr key={c.id} className="border-b border-surface-border/50 last:border-0">
                    <td className="py-3.5 pr-4 text-muted-light font-medium">{c.name}</td>
                    <td className="py-3.5 pr-4 text-center text-muted">{c.capacity || '-'}</td>
                    <td className="py-3.5 pr-4 text-muted">{c.building || '-'}</td>
                    <td className="py-3.5 pr-4 text-muted">{c.floor || '-'}</td>
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(c)} className="p-1.5 text-muted hover:text-accent-light transition-colors">
                          <EditIcon size={15} />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 text-muted hover:text-danger transition-colors">
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