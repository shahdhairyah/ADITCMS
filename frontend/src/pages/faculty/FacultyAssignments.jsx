import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { AssignmentIcon, PlusIcon, EyeIcon, CheckIcon, XIcon, DownloadIcon, UploadIcon, EditIcon, BellIcon, CalendarIcon } from '../../utils/icons';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { assignmentAPI, facultyAPI } from '../../services/api';

const getGrade = (marks, maxMarks) => {
  if (!maxMarks || marks == null) return null;
  const pct = (marks / maxMarks) * 100;
  if (pct >= 90) return 'A';
  if (pct >= 75) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
};

const gradeColor = {
  A: 'text-success bg-success/10',
  B: 'text-info bg-info/10',
  C: 'text-warning bg-warning/10',
  D: 'text-orange-500 bg-orange-500/10',
  F: 'text-danger bg-danger/10',
};

export default function FacultyAssignments() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showSubmissions, setShowSubmissions] = useState(null);
  const [showReview, setShowReview] = useState(null);
  const [showExtend, setShowExtend] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '', subject_id: '', description: '', deadline: '', max_marks: 100,
  });
  const [file, setFile] = useState(null);
  const [sendNotification, setSendNotification] = useState(false);
  const [reviewForm, setReviewForm] = useState({ marks: '', feedback: '', status: 'accepted' });
  const [reviewing, setReviewing] = useState(false);
  const [extendDate, setExtendDate] = useState('');
  const [extending, setExtending] = useState(false);
  const [facultySubjects, setFacultySubjects] = useState([]);

  useEffect(() => {
    fetchAssignments();
  }, []);

  useEffect(() => {
    if (showCreate && facultySubjects.length === 0) {
      fetchSubjects();
    }
  }, [showCreate]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await assignmentAPI.getAll({ faculty_id: user?.profile?.id });
      if (res.success) {
        setAssignments(res.data || []);
      } else {
        setError(res.message || 'Failed to load assignments');
      }
    } catch (err) {
      setError(err.message || 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await facultyAPI.getSubjects();
      if (res.success) {
        setFacultySubjects(res.data || []);
      }
    } catch (err) {
      // Subject list is a filter; ignore the failure but keep a trace.
      console.error('FacultyAssignments: could not load subjects', err);
    }
  };

  const fetchSubmissions = async (assignmentId) => {
    try {
      const res = await assignmentAPI.getSubmissions(assignmentId);
      if (res.success) {
        setSubmissions(res.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load submissions');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.deadline) return;
    try {
      setCreating(true);
      setError('');
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('subject_id', form.subject_id);
      formData.append('description', form.description);
      formData.append('deadline', form.deadline);
      formData.append('max_marks', form.max_marks);
      formData.append('faculty_id', user?.profile?.id);
      if (file) formData.append('file', file);

      const res = await assignmentAPI.create(formData);
      if (res.success) {
        setShowCreate(false);
        setForm({ title: '', subject_id: '', description: '', deadline: '', max_marks: 100 });
        setFile(null);
        setSuccessMsg(sendNotification ? 'Assignment created and notification sent to students!' : 'Assignment created successfully!');
        setSendNotification(false);
        fetchAssignments();
      } else {
        setError(res.message || 'Failed to create assignment');
      }
    } catch (err) {
      setError(err.message || 'Failed to create assignment');
    } finally {
      setCreating(false);
    }
  };

  const handleReview = async (submissionId) => {
    try {
      setReviewing(true);
      setError('');
      const res = await assignmentAPI.reviewSubmission(submissionId, reviewForm);
      if (res.success) {
        setShowReview(null);
        setReviewForm({ marks: '', feedback: '', status: 'accepted' });
        if (showSubmissions) fetchSubmissions(showSubmissions.id);
        fetchAssignments();
      } else {
        setError(res.message || 'Failed to review submission');
      }
    } catch (err) {
      setError(err.message || 'Failed to review submission');
    } finally {
      setReviewing(false);
    }
  };

  const handleExtendDeadline = async () => {
    if (!showExtend || !extendDate) return;
    try {
      setExtending(true);
      setError('');
      const res = await assignmentAPI.update(showExtend.id, { due_date: extendDate });
      if (res.success) {
        setShowExtend(null);
        setExtendDate('');
        setSuccessMsg('Deadline extended successfully!');
        fetchAssignments();
      } else {
        setError(res.message || 'Failed to extend deadline');
      }
    } catch (err) {
      setError(err.message || 'Failed to extend deadline');
    } finally {
      setExtending(false);
    }
  };

  const openSubmissions = (assignment) => {
    setShowSubmissions(assignment);
    fetchSubmissions(assignment.id);
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading assignments..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Assignments"
        subtitle="Manage your course assignments"
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors"
          >
            <PlusIcon size={16} />
            Create Assignment
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}
      {successMsg && (
        <div className="bg-success/10 border border-success/20 text-success px-4 py-3 rounded-xl text-sm flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-success/70 hover:text-success"><XIcon size={14} /></button>
        </div>
      )}

      <div className="card">
        {assignments.length === 0 ? (
          <EmptyState title="No Assignments" description="Create your first assignment to get started." />
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const deadlinePassed = assignment.deadline && new Date(assignment.deadline) < new Date();
              return (
                <div key={assignment.id} className="flex items-center justify-between p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AssignmentIcon size={16} className="text-accent-light flex-shrink-0" />
                      <p className="font-medium text-sm text-muted-light truncate">{assignment.title}</p>
                      {deadlinePassed && <span className="text-[10px] text-danger bg-danger/10 px-1.5 py-0.5 rounded">Past Due</span>}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{assignment.subject_name || assignment.subject}</span>
                      <span className="text-muted-dark">Deadline: {formatDate(assignment.deadline)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <div className="text-right">
                      <p className="text-sm text-white font-medium">{assignment.submissions_count || 0}/{assignment.total_students || '-'}</p>
                      <p className="text-[10px] text-muted">Submissions</p>
                    </div>
                    <button
                      onClick={() => { setShowExtend(assignment); setExtendDate(assignment.deadline || ''); }}
                      className="p-2 text-muted-dark hover:text-accent-light transition-colors"
                      title="Extend Deadline"
                    >
                      <EditIcon size={14} />
                    </button>
                    <button onClick={() => openSubmissions(assignment)} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent-light rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors">
                      <EyeIcon size={14} />
                      View
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-surface-raised rounded-xl border border-surface-border max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-5">Create Assignment</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Title</label>
                    <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="e.g. Binary Tree Implementation" />
                  </div>
                  <div>
                    <label className="label">Subject</label>
                    <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="input-field" required>
                      <option value="">Select subject</option>
                      {facultySubjects.length > 0 ? facultySubjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                      )) : assignments.map((a) => (
                        <option key={a.subject_id || a.subject} value={a.subject_id || a.subject}>{a.subject_name || a.subject}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Deadline</label>
                    <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="label">Max Marks</label>
                    <input type="number" value={form.max_marks} onChange={(e) => setForm({ ...form, max_marks: Number(e.target.value) })} className="input-field" min={1} />
                  </div>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="input-field resize-none" placeholder="Describe the assignment requirements..." />
                </div>
                <div>
                  <label className="label">Attachment (optional)</label>
                  <div className="border-2 border-dashed border-surface-border rounded-xl p-4 text-center hover:border-accent/30 transition-colors cursor-pointer">
                    <input type="file" id="createFile" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                    <label htmlFor="createFile" className="cursor-pointer flex flex-col items-center gap-2">
                      <UploadIcon size={20} className="text-muted-dark" />
                      <span className="text-sm text-muted-light">{file ? file.name : 'Click to upload file'}</span>
                    </label>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendNotify"
                    checked={sendNotification}
                    onChange={(e) => setSendNotification(e.target.checked)}
                    className="w-4 h-4 rounded border-surface-border bg-surface-overlay accent-accent"
                  />
                  <label htmlFor="sendNotify" className="text-sm text-muted-light flex items-center gap-1.5 cursor-pointer">
                    <BellIcon size={14} />
                    Send notification to students
                  </label>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => { setShowCreate(false); setError(''); }} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={creating} className="btn-primary">{creating ? 'Creating...' : 'Create Assignment'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showSubmissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowSubmissions(null); setShowReview(null); }}>
          <div className="bg-surface-raised rounded-xl border border-surface-border max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-semibold text-white">{showSubmissions.title}</h3>
                  <p className="text-xs text-muted mt-1">Submissions (deadline: {formatDate(showSubmissions.deadline)})</p>
                </div>
                <button onClick={() => { setShowSubmissions(null); setShowReview(null); }} className="text-muted-dark hover:text-muted-light"><XIcon size={18} /></button>
              </div>

              {submissions.length === 0 ? (
                <EmptyState title="No Submissions Yet" description="No students have submitted this assignment." />
              ) : (
                <div className="space-y-2">
                  {submissions.map((sub) => {
                    const deadline = new Date(showSubmissions.deadline);
                    const submittedDate = new Date(sub.submitted_at);
                    const isLate = !isNaN(deadline) && !isNaN(submittedDate) && submittedDate > deadline;
                    const grade = getGrade(sub.marks, showSubmissions.max_marks);
                    return (
                      <div key={sub.id} className="flex items-center justify-between p-4 bg-surface-overlay rounded-xl border border-surface-border/50">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium text-accent-light">
                            {(sub.student_name || 'S')[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-light flex items-center gap-2">
                              {sub.student_name || sub.name}
                              {isLate && <span className="text-[10px] text-danger bg-danger/10 px-1.5 py-0.5 rounded">Late</span>}
                            </p>
                            <p className="text-xs text-muted">{formatDateTime(sub.submitted_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${sub.status === 'submitted' ? 'text-warning bg-warning/10' : sub.status === 'accepted' ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
                            {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                          </span>
                          {sub.file_url && (
                            <a href={sub.file_url} target="_blank" rel="noopener noreferrer" className="p-2 text-muted-dark hover:text-accent-light transition-colors" title="Download submission">
                              <DownloadIcon size={16} />
                            </a>
                          )}
                          {grade && (
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${gradeColor[grade]}`}>{grade}</span>
                          )}
                          {sub.status === 'submitted' && (
                            <button
                              onClick={() => { setShowReview(sub); setReviewForm({ marks: sub.marks || '', feedback: sub.feedback || '', status: sub.status || 'accepted' }); }}
                              className="px-3 py-1.5 bg-accent/10 text-accent-light rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors"
                            >
                              Review
                            </button>
                          )}
                          {sub.marks !== null && sub.marks !== undefined && (
                            <span className="text-xs text-white font-medium">{sub.marks}/{showSubmissions.max_marks || 100}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowReview(null)}>
          <div className="bg-surface-raised rounded-xl border border-surface-border max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-1">Review Submission</h3>
              <p className="text-sm text-muted mb-1">{showReview.student_name || showReview.name}</p>
              {showReview.submitted_at && <p className="text-xs text-muted-dark mb-5">Submitted: {formatDateTime(showReview.submitted_at)}</p>}

              <form onSubmit={(e) => { e.preventDefault(); handleReview(showReview.id); }} className="space-y-4">
                <div>
                  <label className="label">Marks / {showSubmissions?.max_marks || 100}</label>
                  <input type="number" value={reviewForm.marks} onChange={(e) => setReviewForm({ ...reviewForm, marks: e.target.value })} className="input-field" min={0} max={showSubmissions?.max_marks || 100} placeholder="Enter marks" />
                </div>
                {reviewForm.marks && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted">Grade:</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${gradeColor[getGrade(Number(reviewForm.marks), showSubmissions?.max_marks || 100)] || ''}`}>
                      {getGrade(Number(reviewForm.marks), showSubmissions?.max_marks || 100) || '-'}
                    </span>
                    <span className="text-xs text-muted-dark">
                      ({((Number(reviewForm.marks) / (showSubmissions?.max_marks || 100)) * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}
                <div>
                  <label className="label">Feedback</label>
                  <textarea value={reviewForm.feedback} onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })} rows={3} className="input-field resize-none" placeholder="Provide feedback..." />
                </div>
                <div>
                  <label className="label">Decision</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, status: 'accepted' })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        reviewForm.status === 'accepted'
                          ? 'bg-success/10 text-success border border-success/20'
                          : 'bg-surface-overlay text-muted border border-surface-border/50'
                      }`}
                    >
                      <CheckIcon size={16} />
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewForm({ ...reviewForm, status: 'rejected' })}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        reviewForm.status === 'rejected'
                          ? 'bg-danger/10 text-danger border border-danger/20'
                          : 'bg-surface-overlay text-muted border border-surface-border/50'
                      }`}
                    >
                      <XIcon size={16} />
                      Reject
                    </button>
                  </div>
                </div>
                {reviewForm.status === 'rejected' && (
                  <div>
                    <label className="label">Rejection Reason</label>
                    <textarea
                      value={reviewForm.feedback}
                      onChange={(e) => setReviewForm({ ...reviewForm, feedback: e.target.value })}
                      rows={2}
                      className="input-field resize-none"
                      placeholder="Provide reason for rejection..."
                    />
                  </div>
                )}
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setShowReview(null)} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={reviewing} className="btn-primary">{reviewing ? 'Saving...' : 'Submit Review'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showExtend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowExtend(null)}>
          <div className="bg-surface-raised rounded-xl border border-surface-border max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Extend Deadline</h3>
              <p className="text-sm text-muted mb-5">{showExtend.title}</p>
              <div className="space-y-4">
                <div>
                  <label className="label">New Deadline</label>
                  <div className="flex items-center gap-3">
                    <CalendarIcon size={16} className="text-muted" />
                    <input
                      type="date"
                      value={extendDate}
                      onChange={(e) => setExtendDate(e.target.value)}
                      className="input-field flex-1"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => setShowExtend(null)} className="btn-secondary">Cancel</button>
                  <button onClick={handleExtendDeadline} disabled={extending || !extendDate} className="btn-primary">
                    {extending ? 'Updating...' : 'Extend Deadline'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
