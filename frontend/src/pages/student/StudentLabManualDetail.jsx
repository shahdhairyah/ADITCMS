import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { BookOpen, DownloadIcon, UploadIcon, ArrowLeft, CheckIcon, XIcon } from '../../utils/icons';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { labManualAPI } from '../../services/api';

export default function StudentLabManualDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [manual, setManual] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [manualsRes, subsRes] = await Promise.allSettled([
        labManualAPI.getAll().catch(() => ({ success: false, data: [] })),
        labManualAPI.getStudentSubmissions().catch(() => ({ success: false, data: [] })),
      ]);

      const allManuals = manualsRes.status === 'fulfilled' ? (manualsRes.value.data || []) : [];
      const mySubmissions = subsRes.status === 'fulfilled' ? (subsRes.value.data || []) : [];

      const found = allManuals.find((m) => String(m.id) === String(id));
      if (found) {
        setManual(found);
      } else {
        setError('Lab manual not found');
      }

      const mySub = mySubmissions.find((s) => String(s.lab_manual_id) === String(id));
      setSubmission(mySub || null);
    } catch (err) {
      setError(err.message || 'Failed to load lab manual');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;
    try {
      setSubmitting(true);
      setError('');
      const formData = new FormData();
      formData.append('lab_file', file);
      const res = await labManualAPI.submit(id, formData);
      if (res.success) {
        setFile(null);
        fetchData();
      } else {
        setError(res.message || 'Submission failed');
      }
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading lab manual..." />;

  if (!manual) {
    return (
      <div className="space-y-8">
        <PageHeader title="Lab Manual" subtitle="Details not found" />
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error || 'Lab manual not found.'}</div>
      </div>
    );
  }

  const dueDate = manual.due_date || manual.deadline;
  const isOverdue = new Date(dueDate) < new Date();

  return (
    <div className="space-y-8">
      <PageHeader
        title={manual.title}
        subtitle={`${manual.subject_name || manual.subject}`}
        action={
          <button
            onClick={() => navigate('/student/lab-manuals')}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted-light hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft size={16} />
            Back to List
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="text-base font-semibold text-white mb-3">Description</h3>
            <p className="text-sm text-muted-light leading-relaxed">{manual.description || 'No description provided.'}</p>
          </div>

          {manual.instructions && (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-3">Instructions</h3>
              <div className="text-sm text-muted-light leading-relaxed whitespace-pre-wrap">{manual.instructions}</div>
            </div>
          )}

          {submission ? (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-4">Your Submission</h3>
              <div className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <DownloadIcon size={18} className="text-accent-light" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-light">{submission.file_name || 'Submitted file'}</p>
                      <p className="text-xs text-muted">Submitted {formatDate(submission.submitted_at)}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(submission.status)}`}>
                    {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                  </span>
                </div>

                {submission.file_url && (
                  <a
                    href={submission.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-accent-light hover:text-accent mt-3"
                  >
                    <DownloadIcon size={12} />
                    Download submission file
                  </a>
                )}

                {submission.marks !== null && submission.marks !== undefined && (
                  <div className="mt-4 pt-4 border-t border-surface-border">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted">Marks</p>
                        <p className="text-lg font-bold text-white">{submission.marks}/{manual.max_marks || 100}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted">Status</p>
                        <p className={`text-sm font-medium ${submission.status === 'reviewed' || submission.status === 'graded' ? 'text-success' : 'text-warning'}`}>
                          {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)}
                        </p>
                      </div>
                    </div>
                    {submission.feedback && (
                      <div className="mt-3 pt-3 border-t border-surface-border">
                        <p className="text-xs text-muted mb-1">Feedback</p>
                        <p className="text-sm text-muted-light">{submission.feedback}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card">
              <h3 className="text-base font-semibold text-white mb-4">Submit Lab Manual</h3>
              {!isOverdue ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="border-2 border-dashed border-surface-border rounded-xl p-8 text-center hover:border-accent/30 transition-colors cursor-pointer group">
                    <input type="file" id="file" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                    <label htmlFor="file" className="cursor-pointer flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-surface-overlay group-hover:bg-accent/10 flex items-center justify-center transition-colors">
                        <UploadIcon size={24} className="text-muted-dark group-hover:text-accent-light transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-light">{file ? file.name : 'Click or drag to upload your file'}</p>
                        {file ? (
                          <span className="text-xs text-muted">{(file.size / 1024).toFixed(1)} KB</span>
                        ) : (
                          <span className="text-xs text-muted-dark">PDF, DOC, ZIP up to 10MB</span>
                        )}
                      </div>
                    </label>
                  </div>
                  <button
                    type="submit"
                    disabled={!file || submitting}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? 'Submitting...' : 'Submit Lab Manual'}
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-danger/10 border border-danger/20 rounded-xl">
                  <XIcon size={18} className="text-danger flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-danger">Deadline Passed</p>
                    <p className="text-xs text-danger/80 mt-0.5">The due date ({formatDate(dueDate)}) has passed. Submission is closed.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Lab Manual Info</h4>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted">Subject</p>
                <p className="text-sm text-muted-light">{manual.subject_name || manual.subject}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Due Date</p>
                <p className={`text-sm font-medium ${isOverdue ? 'text-danger' : 'text-warning'}`}>
                  {formatDate(dueDate)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Max Marks</p>
                <p className="text-sm text-muted-light">{manual.max_marks || 100}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Status</p>
                <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(submission?.status || 'pending')}`}>
                  {submission ? submission.status.charAt(0).toUpperCase() + submission.status.slice(1) : 'Not Submitted'}
                </span>
              </div>
            </div>
          </div>

          {submission && submission.marks !== null && (
            <div className="card">
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-4">Score</h4>
              <div className="text-center">
                <p className="text-3xl font-bold text-white">{submission.marks}</p>
                <p className="text-xs text-muted mt-1">out of {manual.max_marks || 100}</p>
                <div className="mt-3 h-2 bg-surface-overlay rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all"
                    style={{ width: `${(submission.marks / (manual.max_marks || 100)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
