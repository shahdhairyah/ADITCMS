import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { AssignmentIcon, EyeIcon, DownloadIcon, UploadIcon, PlusIcon, XIcon } from '../../utils/icons';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { assignmentAPI } from '../../services/api';

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await assignmentAPI.getAll().catch(() => ({ success: true, data: [] }));
      if (res && res.success !== false) {
        setAssignments(res.data || res || []);
      } else {
        setAssignments([]);
      }
    } catch (err) {
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !selected) return;
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await assignmentAPI.submit(selected.id, formData);
      if (res.success) {
        setSelected(null);
        setFile(null);
        fetchAssignments();
      } else {
        setError(res.message || 'Submission failed');
      }
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading assignments..." />;

  return (
    <div className="space-y-8">
      <PageHeader title="Assignments" subtitle="View and submit your assignments" />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="card">
        {assignments.length === 0 ? (
          <EmptyState
            icon={<AssignmentIcon size={28} />}
            title="No Assignments"
            description="No assignments have been posted yet."
          />
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const submission = assignment.submission;
              const status = submission?.status || 'pending';
              return (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <AssignmentIcon size={16} className="text-accent-light flex-shrink-0" />
                      <p className="font-medium text-sm text-muted-light truncate">{assignment.title}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted">
                      <span>{assignment.subject_name || assignment.subject}</span>
                      <span className="text-muted-dark">Deadline: {formatDate(assignment.deadline)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                    <button
                      onClick={() => setSelected(assignment)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent-light rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors"
                    >
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

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setSelected(null); setFile(null); }}>
          <div className="bg-surface-raised rounded-xl border border-surface-border shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selected.title}</h3>
                    <p className="text-xs text-muted mt-1">{selected.subject_name || selected.subject}</p>
                  </div>
                  <button onClick={() => { setSelected(null); setFile(null); }} className="text-muted-dark hover:text-muted-light transition-colors">
                    <XIcon size={18} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 bg-surface-overlay rounded-xl mb-4 text-sm">
                  <div><span className="text-muted">Max Marks</span><p className="text-white font-medium">{selected.max_marks || 100}</p></div>
                  <div><span className="text-muted">Deadline</span><p className={`font-medium ${new Date(selected.deadline) < new Date() ? 'text-danger' : 'text-warning'}`}>{formatDate(selected.deadline)}</p></div>
                </div>

                {selected.description && (
                  <p className="text-sm text-muted-light mb-4 leading-relaxed">{selected.description}</p>
                )}

                {selected.file_url && (
                  <a href={selected.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-accent-light hover:text-accent mb-4">
                    <DownloadIcon size={16} />
                    Download Attachment
                  </a>
                )}

                {selected.submission ? (
                  <div className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 mb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-light">Submitted</p>
                        <p className="text-xs text-muted">{formatDate(selected.submission.submitted_at)}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(selected.submission.status)}`}>
                        {selected.submission.status.charAt(0).toUpperCase() + selected.submission.status.slice(1)}
                      </span>
                    </div>
                    {selected.submission.marks !== null && (
                      <div className="mt-3 pt-3 border-t border-surface-border">
                        <p className="text-sm text-muted">Marks: <span className="text-white font-semibold">{selected.submission.marks}/{selected.max_marks || 100}</span></p>
                        {selected.submission.feedback && <p className="text-sm text-muted mt-1">Feedback: {selected.submission.feedback}</p>}
                      </div>
                    )}
                  </div>
                ) : new Date(selected.deadline) > new Date() ? (
                  <form onSubmit={handleSubmit}>
                    <div className="border-2 border-dashed border-surface-border rounded-xl p-6 text-center hover:border-accent/30 transition-colors mb-4">
                      <input type="file" id="submitFile" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                      <label htmlFor="submitFile" className="cursor-pointer flex flex-col items-center gap-2">
                        <UploadIcon size={24} className="text-muted-dark" />
                        <span className="text-sm text-muted-light">{file ? file.name : 'Click to upload your file'}</span>
                        {file && <span className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</span>}
                      </label>
                    </div>
                    <button type="submit" disabled={!file || submitting} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                      {submitting ? 'Submitting...' : 'Submit Assignment'}
                    </button>
                  </form>
                ) : (
                  <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">Deadline has passed. Submission is closed.</div>
                )}
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
