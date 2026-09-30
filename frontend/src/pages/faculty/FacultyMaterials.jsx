import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { MaterialIcon, PlusIcon, UploadIcon, DownloadIcon, BookOpen, TrashIcon, FilterIcon } from '../../utils/icons';
import { formatDate } from '../../utils/helpers';
import { materialAPI, downloadFile } from '../../services/api';

export default function FacultyMaterials() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', topic: '', subject_id: '' });
  const [file, setFile] = useState(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await materialAPI.getAll({ faculty_id: user?.profile?.id });
      if (res.success) {
        const data = res.data || [];
        setMaterials(data);
        const subMap = {};
        data.forEach((m) => {
          if (m.subject_id && !subMap[m.subject_id]) {
            subMap[m.subject_id] = { id: m.subject_id, name: m.subject_name || m.subject || 'Unknown' };
          }
        });
        const subs = Object.values(subMap);
        setSubjects(subs);
      } else {
        setError(res.message || 'Failed to load materials');
      }
    } catch (err) {
      setError(err.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const filtered = selectedSubject
    ? materials.filter((m) => String(m.subject_id) === String(selectedSubject))
    : materials;

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.title || !file || !form.subject_id) return;
    try {
      setUploading(true);
      setError('');
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('topic', form.topic);
      formData.append('subject_id', form.subject_id);
      formData.append('faculty_id', user?.profile?.id);
      formData.append('file', file);

      const res = await materialAPI.create(formData);
      if (res.success) {
        setShowUpload(false);
        setForm({ title: '', description: '', topic: '', subject_id: '' });
        setFile(null);
        fetchMaterials();
      } else {
        setError(res.message || 'Failed to upload material');
      }
    } catch (err) {
      setError(err.message || 'Failed to upload material');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this material?')) return;
    try {
      setError('');
      const res = await materialAPI.delete(id);
      if (res.success) {
        fetchMaterials();
      } else {
        setError(res.message || 'Failed to delete');
      }
    } catch (err) {
      setError(err.message || 'Failed to delete');
    }
  };

  const handleDownload = async (id, fileName, e) => {
    if (e) e.preventDefault();
    setError('');
    try {
      // Fetched as a blob with the Authorization header rather than
      // window.open(`...?token=jwt`), which sent no auth header (401) and
      // leaked the JWT into the URL.
      await downloadFile(`/materials/${id}/download`, fileName || undefined);
    } catch (err) {
      setError(err.message || 'Failed to download material');
    }
  };

  const fileTypeIcon = (filename) => {
    if (!filename) return <BookOpen size={18} />;
    const ext = filename.split('.').pop().toLowerCase();
    const colors = {
      pdf: 'text-danger bg-danger/10',
      doc: 'text-info bg-info/10', docx: 'text-info bg-info/10',
      ppt: 'text-warning bg-warning/10', pptx: 'text-warning bg-warning/10',
      xls: 'text-success bg-success/10', xlsx: 'text-success bg-success/10',
      zip: 'text-accent-light bg-accent/10',
    };
    const color = colors[ext] || 'text-muted bg-surface-hover';
    return <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}><MaterialIcon size={18} /></div>;
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading materials..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Study Materials"
        subtitle="Upload and manage course materials"
        action={
          <button onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 transition-colors">
            <PlusIcon size={16} />
            Upload Material
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      {subjects.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <FilterIcon size={16} className="text-muted" />
          {subjects.map((sub) => (
            <button key={sub.id}
              onClick={() => setSelectedSubject(sub.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${selectedSubject === sub.id ? 'bg-accent/15 text-accent-light border border-accent/30' : 'bg-surface-overlay text-muted hover:bg-surface-hover border border-surface-border/50'}`}>
              {sub.name}
            </button>
          ))}
          <button onClick={() => setSelectedSubject('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!selectedSubject ? 'bg-accent/15 text-accent-light border border-accent/30' : 'bg-surface-overlay text-muted hover:bg-surface-hover border border-surface-border/50'}`}>
            All
          </button>
        </div>
      )}

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState title="No Materials" description="Upload study materials to get started." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((material) => (
              <div key={material.id} className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50 hover:border-surface-border transition-colors group">
                <div className="flex items-start gap-3 mb-3">
                  {fileTypeIcon(material.file_path)}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-muted-light truncate">{material.title}</p>
                    <p className="text-xs text-muted mt-0.5">{material.subject_name || material.subject}</p>
                  </div>
                  <button onClick={() => handleDelete(material.id)}
                    className="p-1.5 text-muted-dark hover:text-danger opacity-0 group-hover:opacity-100 transition-all">
                    <TrashIcon size={14} />
                  </button>
                </div>
                {material.description && (
                  <p className="text-xs text-muted mb-3 line-clamp-2">{material.description}</p>
                )}
                <div className="flex items-center justify-between pt-3 border-t border-surface-border/50">
                  <span className="text-[10px] text-muted-dark">{formatDate(material.created_at)}</span>
                  <button onClick={(e) => handleDownload(material.id, material.file_path?.split('/').pop(), e)}
                    className="flex items-center gap-1 text-xs text-accent-light hover:text-accent">
                    <DownloadIcon size={12} />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowUpload(false)}>
          <div className="bg-surface-raised rounded-xl border border-surface-border max-w-lg w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-5">Upload Study Material</h3>
              <form onSubmit={handleUpload} className="space-y-4">
                <div>
                  <label className="label">Title</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="e.g. Chapter 1 Notes" />
                </div>
                <div>
                  <label className="label">Subject</label>
                  <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="input-field" required>
                    <option value="">Select subject</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Topic (optional)</label>
                  <input type="text" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} className="input-field" placeholder="e.g. Arrays and Pointers" />
                </div>
                <div>
                  <label className="label">Description (optional)</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="input-field resize-none" />
                </div>
                <div>
                  <label className="label">File</label>
                  <div className="border-2 border-dashed border-surface-border rounded-xl p-4 text-center hover:border-accent/30 transition-colors cursor-pointer">
                    <input type="file" id="materialFile" className="hidden" onChange={(e) => setFile(e.target.files[0])} required />
                    <label htmlFor="materialFile" className="cursor-pointer flex flex-col items-center gap-2">
                      <UploadIcon size={20} className="text-muted-dark" />
                      <span className="text-sm text-muted-light">{file ? file.name : 'Click to select file'}</span>
                    </label>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-2">
                  <button type="button" onClick={() => { setShowUpload(false); setError(''); }} className="btn-secondary">Cancel</button>
                  <button type="submit" disabled={uploading || !file || !form.subject_id} className="btn-primary">{uploading ? 'Uploading...' : 'Upload'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
