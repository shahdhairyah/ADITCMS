import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { NoticeIcon, PlusIcon, XIcon, CalendarIcon, EyeIcon, UsersIcon } from '../../utils/icons';
import { formatDate } from '../../utils/helpers';
import { announcementAPI } from '../../services/api';

export default function FacultyAnnouncements() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', target_class: '', target_subject: '' });
  const [submitting, setSubmitting] = useState(false);
  const [showReadStatus, setShowReadStatus] = useState(null);
  const [readStatusData, setReadStatusData] = useState(null);
  const [readStatusLoading, setReadStatusLoading] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await announcementAPI.getAll({ faculty_id: user?.profile?.id });
      if (res.success) {
        setAnnouncements(res.data || []);
      } else {
        setError(res.message || 'Failed to load announcements');
      }
    } catch (err) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.content) return;
    try {
      setSubmitting(true);
      setError('');
      const res = await announcementAPI.create({
        ...form,
        faculty_id: user?.profile?.id,
        created_by: user?.profile?.id,
      });
      if (res.success) {
        setAnnouncements((prev) => [res.data || res.announcement, ...prev]);
        setShowForm(false);
        setForm({ title: '', content: '', target_class: '', target_subject: '' });
      } else {
        setError(res.message || 'Failed to create announcement');
      }
    } catch (err) {
      setError(err.message || 'Failed to create announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const viewReadStatus = async (id) => {
    try {
      setReadStatusLoading(true);
      setError('');
      const res = await announcementAPI.readStatus(id);
      if (res.success) {
        setReadStatusData(res.data);
      } else {
        setError(res.message || 'Failed to load read status');
      }
    } catch (err) {
      setError(err.message || 'Failed to load read status');
    } finally {
      setReadStatusLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setError('');
      const res = await announcementAPI.delete(id);
      if (res.success) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
      } else {
        setError(res.message || 'Failed to delete announcement');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete announcement');
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading announcements..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Announcements"
        subtitle="Post announcements for your students"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <PlusIcon size={16} />
            New Announcement
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {showForm && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-5">Create Announcement</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field"
                placeholder="Announcement title"
                required
              />
            </div>
            <div>
              <label className="label">Content</label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                rows={4}
                className="input-field resize-none"
                placeholder="Write your announcement..."
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Target Class (optional)</label>
                <input
                  type="text"
                  value={form.target_class}
                  onChange={(e) => setForm({ ...form, target_class: e.target.value })}
                  className="input-field"
                  placeholder="e.g. CE-3A"
                />
              </div>
              <div>
                <label className="label">Target Subject (optional)</label>
                <input
                  type="text"
                  value={form.target_subject}
                  onChange={(e) => setForm({ ...form, target_subject: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Data Structures"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Posting...' : 'Post Announcement'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        {announcements.length === 0 ? (
          <EmptyState title="No announcements" description="No announcements yet. Create your first one." />
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <NoticeIcon size={16} className="text-accent-light flex-shrink-0" />
                      <p className="font-medium text-sm text-muted-light">{ann.title}</p>
                    </div>
                    <p className="text-sm text-muted mt-1">{ann.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-dark">
                      <span className="flex items-center gap-1">
                        <CalendarIcon size={12} />
                        {formatDate(ann.created_at || ann.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <EyeIcon size={12} />
                        {ann.views || ann.view_count || 0} views
                      </span>
                      <button onClick={() => { setShowReadStatus(ann); viewReadStatus(ann.id); }} className="flex items-center gap-1 text-muted-dark hover:text-accent-light transition-colors">
                        <UsersIcon size={12} />
                        {ann.read_count || 0} read
                      </button>
                      {(ann.target_class || ann.target_subject) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-accent/10 text-accent-light">
                          {ann.target_class}{ann.target_class && ann.target_subject ? ' - ' : ''}{ann.target_subject}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(ann.id)}
                    className="p-1.5 rounded-lg text-muted-dark hover:text-danger hover:bg-danger/10 transition-colors opacity-0 group-hover:opacity-100 ml-2"
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showReadStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowReadStatus(null); setReadStatusData(null); }}>
          <div className="bg-surface-raised rounded-xl border border-surface-border max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-white">Read Status</h3>
                  <p className="text-xs text-muted mt-1">{showReadStatus.title}</p>
                </div>
                <button onClick={() => { setShowReadStatus(null); setReadStatusData(null); }} className="text-muted-dark hover:text-muted-light"><XIcon size={18} /></button>
              </div>
              {readStatusLoading ? (
                <LoadingSpinner size="md" text="Loading..." />
              ) : readStatusData ? (
                <div>
                  <p className="text-sm text-muted-light mb-4">Total reads: <span className="text-white font-medium">{readStatusData.total_reads || 0}</span></p>
                  {readStatusData.readers && readStatusData.readers.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {readStatusData.readers.map((reader, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-surface-overlay rounded-xl border border-surface-border/50">
                          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-xs font-medium text-accent-light">
                            {(reader.first_name || 'U')[0]}
                          </div>
                          <div>
                            <p className="text-sm text-muted-light">{reader.first_name} {reader.last_name}</p>
                            <p className="text-xs text-muted">{reader.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted text-center py-4">No one has read this announcement yet.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted text-center py-4">Could not load read status.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
