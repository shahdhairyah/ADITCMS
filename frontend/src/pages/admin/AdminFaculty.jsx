import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { FacultyIcon, SearchIcon, PlusIcon, EditIcon, TrashIcon, LoaderIcon } from '../../utils/icons';
import { facultyAPI, departmentAPI } from '../../services/api';

export default function AdminFaculty() {
  const [faculty, setFaculty] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    email: '', password: '', employee_id: '',
    first_name: '', last_name: '', department_id: '',
    designation: '', qualification: '', experience_years: '', phone: '',
  });

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadFaculty();
  }, [page, deptFilter]);

  const loadDepartments = async () => {
    try {
      const res = await departmentAPI.getAll();
      if (res.success) setDepartments(res.data || []);
    } catch (err) {
      // The department list only filters the table; a failure here should not
      // replace the page with an error screen.
      console.error('AdminFaculty: could not load departments', err);
    }
  };

  const loadFaculty = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, page_size: 15 };
      if (deptFilter) params.department_id = deptFilter;
      if (search) params.search = search;
      const res = await facultyAPI.getAll(params);
      if (res.success) {
        const data = res.data || [];
        const pagination = res.pagination || {};
        setFaculty(data);
        setTotal(pagination.total || data.length);
        setTotalPages(pagination.total_pages || 1);
      } else {
        setError(res.message || 'Failed to load faculty');
      }
    } catch (err) {
      setError(err?.message || 'Failed to load faculty');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadFaculty();
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');

      const payload = {
        employee_id: formData.employee_id,
        first_name: formData.first_name,
        last_name: formData.last_name,
        department_id: parseInt(formData.department_id),
        designation: formData.designation || null,
        qualification: formData.qualification || null,
        experience_years: parseInt(formData.experience_years) || 0,
        phone: formData.phone || null,
      };

      let res;
      if (editing) {
        res = await facultyAPI.update(editing, payload);
      } else {
        payload.email = formData.email;
        payload.password = formData.password;
        res = await facultyAPI.create(payload);
      }

      if (res.success) {
        setShowForm(false);
        setEditing(null);
        resetForm();
        loadFaculty();
      } else {
        setError(res.message || 'Failed to save');
      }
    } catch (err) {
      setError(err?.message || 'Failed to save faculty');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (f) => {
    setFormData({
      email: '', password: '',
      employee_id: f.employee_id || '',
      first_name: f.first_name || '',
      last_name: f.last_name || '',
      department_id: f.department_id?.toString() || '',
      designation: f.designation || '',
      qualification: f.qualification || '',
      experience_years: f.experience_years?.toString() || '0',
      phone: f.phone || '',
    });
    setEditing(f.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this faculty member? This will also deactivate their user account.')) return;
    try {
      const res = await facultyAPI.delete(id);
      if (res.success) {
        loadFaculty();
      } else {
        setError(res.message || 'Failed to delete');
      }
    } catch (err) {
      setError(err?.message || 'Failed to delete');
    }
  };

  const resetForm = () => {
    setFormData({
      email: '', password: '', employee_id: '',
      first_name: '', last_name: '', department_id: '',
      designation: '', qualification: '', experience_years: '', phone: '',
    });
  };

  if (loading && faculty.length === 0) return <LoadingSpinner size="lg" text="Loading faculty..." />;

  return (
    <div className="space-y-8">
      <PageHeader title="Faculty Management" subtitle="Add, edit, and manage all faculty members." />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-xs">
              <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Search by name or ID..."
                className="w-full pl-9 pr-4 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
              />
            </div>
            <select
              value={deptFilter}
              onChange={e => { setDeptFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button onClick={handleSearch} className="px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted hover:text-muted-light transition-colors">
              Search
            </button>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditing(null); resetForm(); }}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors w-full sm:w-auto justify-center"
          >
            <PlusIcon size={16} /> Add Faculty
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSave} className="mb-6 p-5 bg-surface-overlay rounded-xl border border-surface-border">
            <h4 className="text-sm font-semibold text-white mb-4">
              {editing ? 'Edit Faculty Member' : 'Add New Faculty Member'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs text-muted mb-1">Employee ID *</label>
                <input
                  type="text"
                  value={formData.employee_id}
                  onChange={e => setFormData({...formData, employee_id: e.target.value})}
                  placeholder="e.g. ADIT-FAC-003"
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Department *</label>
                <select
                  value={formData.department_id}
                  onChange={e => setFormData({...formData, department_id: e.target.value})}
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  required
                >
                  <option value="">Select department</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Designation</label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={e => setFormData({...formData, designation: e.target.value})}
                  placeholder="e.g. Associate Professor"
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">First Name *</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={e => setFormData({...formData, first_name: e.target.value})}
                  placeholder="First name"
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Last Name *</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={e => setFormData({...formData, last_name: e.target.value})}
                  placeholder="Last name"
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Phone</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  placeholder="Phone number"
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Qualification</label>
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={e => setFormData({...formData, qualification: e.target.value})}
                  placeholder="e.g. Ph.D. Computer Science"
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Experience (Years)</label>
                <input
                  type="number"
                  value={formData.experience_years}
                  onChange={e => setFormData({...formData, experience_years: e.target.value})}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                />
              </div>
              {!editing && (
                <>
                  <div>
                    <label className="block text-xs text-muted mb-1">Email (Login) *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      placeholder="email@example.com"
                      className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                      required={!editing}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">Password (Login) *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      placeholder="Min 8 characters"
                      minLength={8}
                      className="w-full px-3 py-2 bg-surface-hover border border-surface-border rounded-lg text-sm text-muted-light focus:outline-none focus:border-accent/50"
                      required={!editing}
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {saving && <LoaderIcon size={14} className="animate-spin" />}
                {editing ? 'Update Faculty' : 'Create Faculty'}
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

        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted">{total} faculty member(s)</span>
        </div>

        {faculty.length === 0 ? (
          <EmptyState
            title="No Faculty"
            description={search || deptFilter ? 'No faculty match your filters.' : 'No faculty members yet. Click "Add Faculty" to create one.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Employee ID</th>
                  <th className="text-left py-3 pr-4">Name</th>
                  <th className="text-left py-3 pr-4">Department</th>
                  <th className="text-left py-3 pr-4">Designation</th>
                  <th className="text-left py-3 pr-4">Qualification</th>
                  <th className="text-center py-3 pr-4">Experience</th>
                  <th className="text-left py-3 pr-4">Phone</th>
                  <th className="text-center py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {faculty.map((f, idx) => (
                  <tr key={f.id || idx} className="border-b border-surface-border/50 last:border-0 hover:bg-surface-overlay/50 transition-colors">
                    <td className="py-3.5 pr-4">
                      <span className="text-muted-light font-mono text-xs font-medium">{f.employee_id || '-'}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-muted-light font-medium">{f.first_name} {f.last_name}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-muted">{f.department_name || f.department_code || '-'}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-muted">{f.designation || '-'}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-muted text-xs">{f.qualification || '-'}</span>
                    </td>
                    <td className="py-3.5 pr-4 text-center">
                      <span className="text-muted">{f.experience_years ? `${f.experience_years}y` : '-'}</span>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-muted text-xs">{f.phone || '-'}</span>
                    </td>
                    <td className="py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(f)}
                          className="p-1.5 text-muted hover:text-accent-light transition-colors"
                          title="Edit"
                        >
                          <EditIcon size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(f.id)}
                          className="p-1.5 text-muted hover:text-danger transition-colors"
                          title="Delete"
                        >
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

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-5">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted hover:text-muted-light disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(1, page - 2);
              const p = start + i;
              if (p > totalPages) return null;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    p === page ? 'bg-accent/20 text-accent-light border border-accent/30' : 'bg-surface-overlay text-muted hover:text-muted-light border border-surface-border/50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted hover:text-muted-light disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}