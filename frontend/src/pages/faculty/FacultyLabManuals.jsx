import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { BookOpen, PlusIcon, UploadIcon, DownloadIcon, TrashIcon, EyeIcon, CheckIcon, XIcon } from '../../utils/icons';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { labManualAPI, facultyAPI } from '../../services/api';

export default function FacultyLabManuals() {
  const { user } = useAuth();
  const [manuals, setManuals] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', subject_id: '', subject_name: '', description: '', instructions: '', due_date: '' });
  const [showSubmissions, setShowSubmissions] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [subLoading, setSubLoading] = useState(false);
  const [subForm, setSubForm] = useState({ marks: '', feedback: '', status: 'accepted' });
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    fetchManuals();
    fetchSubjects();
  }, []);

  const fetchManuals = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await labManualAPI.getAll({ faculty_id: user?.profile?.id });
      if (res.success) {
        setManuals(res.data || []);
      } else {
        setError(res.message || 'Failed to load lab manuals');
      }
    } catch (err) {
      setError(err.message || 'Failed to load lab manuals');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await facultyAPI.getSubjects();
      if (res.success) {
        setSubjects(res.data || []);
      }
    } catch (err) {
      // Subject list is a filter; ignore the failure but keep a trace.
      console.error('FacultyLabManuals: could not load subjects', err);
    }
  };

  const fetchSubmissions = async (manualId) => {
    try {
      setSubLoading(true);
      const res = await labManualAPI.getSubmissions(manualId);
      if (res.success) {
        setSubmissions(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load submissions');
    } finally {
      setSubLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    try {
      setCreating(true);
      setError('');
      const data = {
        ...form,
        faculty_id: user?.profile?.id,
      };
      const res = await labManualAPI.create(data);
      if (res.success) {
        setShowCreate(false);
        setForm({ title: '', subject_id: '', subject_name: '', description: '', instructions: '', due_date: '' });
        fetchManuals();
      } else {
        setError(res.message || 'Failed to create lab manual');
      }
    } catch (err) {
      setError(err.message || 'Failed to create lab manual');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this lab manual?')) return;
    try {
      setError('');
      const res = await labManualAPI.delete(id);
      if (res.success) {
        fetchManuals();
      } else {
        setError(res.message || 'Failed to delete');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const handleReview = async (submissionId) => {
    try {
      setReviewing(true);
      setError('');
      const res = await labManualAPI.reviewSubmission(submissionId, subForm);
      if (res.success) {
        setSubForm({ marks: '', feedback: '', status: 'accepted' });
        if (showSubmissions) fetchSubmissions(showSubmissions.id);
      } else {
        setError(res.message || 'Failed to review submission');
      }
    } catch (err) {
      setError(err.message || 'Failed to review submission');
    } finally {
      setReviewing(false);
    }
  };

  const openSubmissions = (manual) => {
    setShowSubmissions(manual);
    fetchSubmissions(manual.id);
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading lab manuals..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Lab Manuals"
        subtitle="Create and manage lab manuals"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <PlusIcon size={16} />
            Create Manual
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="card">
        {manuals.length === 0 ? (
          <EmptyState title="No Lab Manuals" description="Create your first lab manual to get started." action={
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors mt-4">
              <PlusIcon size={16} />
              Create Manual
            </button>
          } />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {manuals.map((manual) => (
              <div key={manual.id} className="p-5 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent-light">
                    <BookOpen size={20} />
                  </div>
                  <button
                    onClick={() => handleDelete(manual.id)}
                    className="p-1.5 text-muted-dark hover:text-danger opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
                <h3 className="font-medium text-sm text-muted-light mb-1 line-clamp-2">{manual.title}</h3>
                <p className="text-xs text-muted mb-3">{manual.subject_name || manual.subject}</p>
                {manual.description && (
                  <p className="text-xs text-muted-dark mb-3 line-clamp-2">{manual.description}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-surface-border/50">
                  <div className="text-xs text-muted">
                    <span className="text-white font-medium">{manual.submissions_count || 0}</span> / {manual.total_students || '-'} submissions
                  </div>
                  <button
                    onClick={() => openSubmissions(manual)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent-light rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors"
                  >
                    <EyeIcon size={14} />
                    View
                  </button>
                </div>
                {manual.due_date && (
                  <p className="text-[10px] text-muted-dark mt-2">Due: {formatDate(manual.due_date)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-surface-raised rounded-xl border border-surface-border max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-5">Create Lab Manual</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="e.g. Data Structures Lab Manual" required />
                </div>
                <div>
                  <label className="label">Subject</label>
                  <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value, subject_name: e.target.options[e.target.selectedIndex]?.text })} className="input-field">
                    <option value="">Select subject</option>
                    {subjects.map((sub) => {
                      const id = sub.id || sub.subject_id || sub;
                      const name = sub.subject_name || sub.name || sub;
                      return <option key={id} value={id}>{name}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input-field resize-none" placeholder="Brief description of the manual" />
                </div>
                <div>
                  <label className="label">Instructions</label>
                  <textarea value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} rows={3} className="input-field resize-none" placeholder="Step-by-step instructions for students..." />
                </div>
                <div>
                  <label className="label">Due Date (optional)</label>
                  <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="input-field" />
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => { setShowCreate(false); setError(''); }} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={creating || !form.title} className="btn-primary">{creating ? 'Creating...' : 'Create Manual'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSubmissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowSubmissions(null); }}>
          <div className="bg-surface-raised rounded-xl border border-surface-border max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-white">{showSubmissions.title}</h3>
                  <p className="text-xs text-muted mt-1">{showSubmissions.subject_name || showSubmissions.subject} - Submissions</p>
                </div>
                <button onClick={() => { setShowSubmissions(null); }} className="text-muted-dark hover:text-muted-light"><XIcon size={18} /></button>
              </div>

              {subLoading ? (
                <LoadingSpinner size="md" text="Loading submissions..." />
              ) : submissions.length === 0 ? (
                <EmptyState title="No Submissions" description="No students have submitted this lab manual yet." />
              ) : (
                <div className="space-y-2">
                  {submissions.map((sub) => (
                    <div key={sub.id} className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium text-accent-light">
                            {(sub.student_name || 'S')[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-light">{sub.student_name || sub.name}</p>
                            <p className="text-xs text-muted">{formatDateTime(sub.submitted_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {sub.file_url && (
                            <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent-light rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors">
                              <DownloadIcon size={14} />
                              Download
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="border-t border-surface-border/30 pt-3">
                        {sub.status === 'submitted' || sub.status === 'pending' ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="label text-xs">Marks</label>
                              <input
                                type="number"
                                value={subForm.marks}
                                onChange={(e) => setSubForm({ ...subForm, marks: e.target.value })}
                                className="input-field text-sm"
                                placeholder="Enter marks"
                                min={0}
                              />
                            </div>
                            <div>
                              <label className="label text-xs">Feedback</label>
                              <input
                                type="text"
                                value={subForm.feedback}
                                onChange={(e) => setSubForm({ ...subForm, feedback: e.target.value })}
                                className="input-field text-sm"
                                placeholder="Feedback"
                              />
                            </div>
                            <div className="md:col-span-2 flex gap-2">
                              <button
                                onClick={() => { setSubForm({ ...subForm, status: 'accepted' }); handleReview(sub.id); }}
                                disabled={reviewing}
                                className="flex-1 py-2 bg-success/10 text-success rounded-lg text-xs font-medium hover:bg-success/20 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <CheckIcon size={14} />
                                Accept
                              </button>
                              <button
                                onClick={() => { setSubForm({ ...subForm, status: 'rejected' }); handleReview(sub.id); }}
                                disabled={reviewing}
                                className="flex-1 py-2 bg-danger/10 text-danger rounded-lg text-xs font-medium hover:bg-danger/20 transition-colors flex items-center justify-center gap-1.5"
                              >
                                <XIcon size={14} />
                                Reject
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                              sub.status === 'accepted' ? 'text-success bg-success/10' : 'text-danger bg-danger/10'
                            }`}>
                              {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                            </span>
                            {sub.marks !== null && sub.marks !== undefined && (
                              <span className="text-sm text-muted-light">Marks: <span className="text-white font-medium">{sub.marks}</span></span>
                            )}
                            {sub.feedback && (
                              <span className="text-xs text-muted">Feedback: {sub.feedback}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
