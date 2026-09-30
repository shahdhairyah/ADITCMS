import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { AssignmentIcon, DownloadIcon, UploadIcon, ArrowLeft, XIcon } from '../../utils/icons';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { assignmentAPI } from '../../services/api';

export default function StudentAssignmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await assignmentAPI.getAll({ student_id: profile?.id });
      if (res.success) {
        const found = (res.data || []).find(a => String(a.id) === String(id));
        if (found) {
          setAssignment(found);
        } else {
          setError('Assignment not found');
        }
      } else {
        setError(res.message || 'Failed to load assignment');
      }
    } catch (err) {
      setError(err.message || 'Failed to load assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !assignment) return;
    try {
      setSubmitting(true);
      setError('');
      const formData = new FormData();
      formData.append('assignment_file', file);
      const res = await assignmentAPI.submit(assignment.id, formData);
      if (res.success) {
        setFile(null);
        fetchAssignment();
      } else {
        setError(res.message || 'Submission failed');
      }
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading assignment..." />;
  if (error && !assignment) {
    return (
      <div className="space-y-8">
        <PageHeader title="Assignment" subtitle="Details not available" />
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
        <button onClick={() => navigate('/student/assignments')} className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={16} /> Back to Assignments
        </button>
      </div>
    );
  }

  const sub = assignment?.submission;
  const deadline = assignment?.deadline ? new Date(assignment.deadline) : null;
  const isOverdue = deadline && deadline < new Date();

  return (
    <div className="space-y-8">
      <PageHeader
        title={assignment?.title || 'Assignment'}
        subtitle={`${assignment?.subject_name || ''} ${assignment?.subject_code ? `(${assignment.subject_code})` : ''}`}
        action={
          <button
            onClick={() => navigate('/student/assignments')}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted-light hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm flex items-center gap-2">
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto"><XIcon size={14} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {assignment?.description && (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-3">Description</h3>
              <p className="text-sm text-muted-light leading-relaxed whitespace-pre-wrap">{assignment.description}</p>
            </div>
          )}

          {assignment?.attachments && (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-3">Attachment</h3>
              <a href={assignment.attachments} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-accent-light hover:text-accent">
                <DownloadIcon size={16} />
                Download Assignment File
              </a>
            </div>
          )}

          {sub ? (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-4">Your Submission</h3>
              <div className="flex items-center justify-between p-4 bg-surface-overlay rounded-xl border border-surface-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <DownloadIcon size={18} className="text-accent-light" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-light">{sub.file_path || 'Submitted file'}</p>
                    <p className="text-xs text-muted">Submitted {formatDate(sub.submitted_at)}</p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                  {(sub.status || 'pending').charAt(0).toUpperCase() + (sub.status || 'pending').slice(1)}
                </span>
              </div>

              {sub.marks !== null && sub.marks !== undefined && (
                <div className="mt-4 p-4 bg-surface-overlay rounded-xl border border-surface-border/50">
                  <p className="text-sm text-muted mb-2">Marks: <span className="text-white font-semibold">{sub.marks}/{assignment.max_marks || 100}</span></p>
                  {sub.feedback && <p className="text-sm text-muted">Feedback: {sub.feedback}</p>}
                </div>
              )}
            </div>
          ) : !isOverdue ? (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-4">Submit Assignment</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="border-2 border-dashed border-surface-border rounded-xl p-6 text-center hover:border-accent/30 transition-colors">
                  <input
                    type="file"
                    id="submitFile"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                  <label htmlFor="submitFile" className="cursor-pointer flex flex-col items-center gap-2">
                    <UploadIcon size={24} className="text-muted-dark" />
                    <span className="text-sm text-muted-light">
                      {file ? file.name : 'Click to upload your file'}
                    </span>
                    {file && (
                      <span className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</span>
                    )}
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!file || submitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitting ? 'Submitting...' : 'Submit Assignment'}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">
              Deadline has passed. Submission is closed.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Assignment Info</h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted">Subject</p>
                <p className="text-sm text-muted-light">{assignment?.subject_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Subject Code</p>
                <p className="text-sm text-muted-light">{assignment?.subject_code || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Faculty</p>
                <p className="text-sm text-muted-light">{assignment?.faculty_name || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Deadline</p>
                <p className={`text-sm font-medium ${isOverdue ? 'text-danger' : 'text-warning'}`}>
                  {formatDate(assignment?.deadline)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Max Marks</p>
                <p className="text-sm text-muted-light">{assignment?.max_marks || 100}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
