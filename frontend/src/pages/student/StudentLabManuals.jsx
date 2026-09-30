import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { BookOpen, UploadIcon, CheckIcon, XIcon, FilterIcon, EyeIcon, DownloadIcon } from '../../utils/icons';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { labManualAPI } from '../../services/api';

export default function StudentLabManuals() {
  const { user } = useAuth();
  const [manuals, setManuals] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await labManualAPI.getAll({ student_id: user?.profile?.id });
      if (res.success) {
        const data = res.data || [];
        setManuals(data);
        const subs = [...new Set(data.map(m => m.subject_name || m.subject).filter(Boolean))];
        setSubjects(subs);
        if (subs.length > 0) setSelectedSubject(subs[0]);
      } else {
        setError(res.message || 'Failed to load lab manuals');
      }
    } catch (err) {
      setError(err.message || 'Failed to load lab manuals');
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
      formData.append('lab_file', file);
      formData.append('student_id', user?.profile?.id);
      const res = await labManualAPI.submit(selected.id, formData);
      if (res.success) {
        setSelected(null);
        setFile(null);
        loadData();
      } else {
        setError(res.message || 'Submission failed');
      }
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = selectedSubject ? manuals.filter(m => (m.subject_name || m.subject) === selectedSubject) : manuals;

  if (loading) return <LoadingSpinner size="lg" text="Loading lab manuals..." />;

  return (
    <div className="space-y-8">
      <PageHeader title="Lab Manuals" subtitle="View experiments and submit your work" />

      {error && <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>}

      {subjects.length > 0 && (
        <div className="flex items-center gap-2">
          <FilterIcon size={16} className="text-muted" />
          {subjects.map(s => (
            <button key={s} onClick={() => setSelectedSubject(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedSubject === s ? 'bg-accent/15 text-accent-light border border-accent/30' : 'bg-surface-overlay text-muted hover:bg-surface-hover border border-surface-border/50'
              }`}>{s}</button>
          ))}
        </div>
      )}

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState icon={<BookOpen size={28} />} title="No Lab Manuals" description="No lab manuals available yet." />
        ) : (
          <div className="space-y-3">
            {filtered.map((manual) => {
              const sub = manual.submission;
              const status = sub?.status || 'not_submitted';
              return (
                <div key={manual.id} className="flex items-center justify-between p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center text-accent-light">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-light truncate">{manual.title}</p>
                      <p className="text-xs text-muted">Experiment {manual.experiment_number} &bull; {manual.subject_name || manual.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                    {status !== 'not_submitted' && (
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    )}
                    <button onClick={() => setSelected(manual)} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent-light rounded-lg text-xs font-medium hover:bg-accent/20 transition-colors">
                      {status === 'not_submitted' ? <UploadIcon size={14} /> : <EyeIcon size={14} />}
                      {status === 'not_submitted' ? 'Submit' : 'View'}
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
          <div className="bg-surface-raised rounded-xl border border-surface-border shadow-xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <div className="p-6">
                <h3 className="text-lg font-semibold text-white mb-1">{selected.title}</h3>
                <p className="text-xs text-muted mb-4">Experiment #{selected.experiment_number} &bull; {selected.subject_name || selected.subject}</p>
                {selected.description && <p className="text-sm text-muted-light mb-4">{selected.description}</p>}
                {selected.submission ? (
                  <div className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 space-y-2">
                    <div className="flex justify-between"><span className="text-xs text-muted">Submitted</span><span className="text-xs text-muted-light">{formatDate(selected.submission.submitted_at)}</span></div>
                    <div className="flex justify-between"><span className="text-xs text-muted">Status</span><span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selected.submission.status)}`}>{selected.submission.status}</span></div>
                    {selected.submission.marks !== null && (
                      <div className="flex justify-between"><span className="text-xs text-muted">Marks</span><span className="text-xs text-white font-medium">{selected.submission.marks}</span></div>
                    )}
                    {selected.submission.feedback && <div className="flex justify-between"><span className="text-xs text-muted">Feedback</span><span className="text-xs text-muted-light">{selected.submission.feedback}</span></div>}
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="border-2 border-dashed border-surface-border rounded-xl p-6 text-center hover:border-accent/30 transition-colors mb-4">
                      <input type="file" id="labFile" className="hidden" onChange={e => setFile(e.target.files[0])} />
                      <label htmlFor="labFile" className="cursor-pointer flex flex-col items-center gap-2">
                        <UploadIcon size={24} className="text-muted-dark" />
                        <span className="text-sm text-muted-light">{file ? file.name : 'Upload your experiment file'}</span>
                      </label>
                    </div>
                    <button type="submit" disabled={!file || submitting} className="w-full py-2.5 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent-hover disabled:opacity-50 transition-colors">
                      {submitting ? 'Submitting...' : 'Submit Experiment'}
                    </button>
                  </form>
                )}
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
