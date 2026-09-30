import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { NoticeIcon, PlusIcon, CalendarIcon, XIcon } from '../../utils/icons';
import { formatDate } from '../../utils/helpers';
import { noticeAPI } from '../../services/api';

export default function FacultyNotices() {
  const { user } = useAuth();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'College', audience: '' });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await noticeAPI.getAll({ faculty_id: user?.profile?.id });
      if (res.success) {
        setNotices(res.data || []);
      } else {
        setError(res.message || 'Failed to load notices');
      }
    } catch (err) {
      setError(err.message || 'Failed to load notices');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    try {
      setCreating(true);
      setError('');
      const res = await noticeAPI.create({
        ...form,
        author_id: user?.profile?.id,
        author_name: `${user?.profile?.first_name || ''} ${user?.profile?.last_name || ''}`.trim(),
      });
      if (res.success) {
        setShowCreate(false);
        setForm({ title: '', content: '', type: 'College', audience: '' });
        fetchNotices();
      } else {
        setError(res.message || 'Failed to create notice');
      }
    } catch (err) {
      setError(err.message || 'Failed to create notice');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this notice?')) return;
    try {
      setError('');
      const res = await noticeAPI.delete(id);
      if (res.success) {
        fetchNotices();
      } else {
        setError(res.message || 'Failed to delete');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading notices..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Notices"
        subtitle="Create and manage announcements"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <PlusIcon size={16} />
            Create Notice
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {showCreate && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-5">New Notice</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Notice title" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                  <option value="College">College</option>
                  <option value="Department">Department</option>
                  <option value="Academic">Academic</option>
                  <option value="Event">Event</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div>
                <label className="label">Target Audience (optional)</label>
                <input type="text" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })} className="input-field" placeholder="e.g. All Students, CE Dept" />
              </div>
            </div>
            <div>
              <label className="label">Content</label>
              <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5} className="input-field resize-none" placeholder="Write notice content..." />
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowCreate(false); setError(''); }} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={creating} className="btn-primary">{creating ? 'Publishing...' : 'Publish Notice'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="text-base font-semibold text-white mb-5">Your Notices</h3>

        {notices.length === 0 ? (
          <EmptyState title="No Notices" description="You haven't created any notices yet." />
        ) : (
          <div className="space-y-3">
            {notices.map((notice) => (
              <div
                key={notice.id}
                className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <NoticeIcon size={16} className="text-accent-light flex-shrink-0" />
                    <p className="font-medium text-sm text-muted-light">{notice.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                      notice.type === 'College'
                        ? 'bg-accent/10 text-accent-light'
                        : notice.type === 'Department'
                        ? 'bg-info/10 text-info'
                        : 'bg-surface-hover text-muted'
                    }`}>
                      {notice.type}
                    </span>
                    <button
                      onClick={() => handleDelete(notice.id)}
                      className="p-1 text-muted-dark hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <XIcon size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted line-clamp-2">{notice.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-dark">
                  <span className="flex items-center gap-1">
                    <CalendarIcon size={12} />
                    {formatDate(notice.created_at || notice.date)}
                  </span>
                  {notice.audience && <span>Target: {notice.audience}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
