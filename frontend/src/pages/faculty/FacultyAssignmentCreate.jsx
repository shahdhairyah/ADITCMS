import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import { AssignmentIcon, UploadIcon, ArrowLeft } from '../../utils/icons';

const MOCK_SUBJECTS = ['Data Structures', 'DBMS', 'OOP', 'Digital Electronics'];

export default function FacultyAssignmentCreate() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    subject: MOCK_SUBJECTS[0],
    description: '',
    deadline: '',
    maxMarks: 100,
  });
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title || !form.deadline) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      navigate('/faculty/assignments');
    }, 1000);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Create Assignment"
        subtitle="Create a new assignment for your students"
        action={
          <button
            onClick={() => navigate('/faculty/assignments')}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-overlay border border-surface-border rounded-lg text-sm text-muted-light hover:bg-surface-hover transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        }
      />

      <div className="card max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs text-muted mb-1.5">Assignment Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50"
                placeholder="e.g. Binary Tree Implementation"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Subject</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50"
              >
                {MOCK_SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Max Marks</label>
              <input
                type="number"
                value={form.maxMarks}
                onChange={(e) => setForm({ ...form, maxMarks: Number(e.target.value) })}
                className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50"
                min={1}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full bg-surface-overlay border border-surface-border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50 resize-none"
              placeholder="Describe the assignment requirements..."
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1.5">Attachment (optional)</label>
            <div className="border-2 border-dashed border-surface-border rounded-xl p-6 text-center hover:border-accent/30 transition-colors cursor-pointer">
              <input type="file" id="attach" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
              <label htmlFor="attach" className="cursor-pointer flex flex-col items-center gap-2">
                <UploadIcon size={22} className="text-muted-dark" />
                <span className="text-sm text-muted-light">{file ? file.name : 'Click to upload file'}</span>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => navigate('/faculty/assignments')}
              className="px-4 py-2 bg-surface-overlay border border-surface-border rounded-xl text-sm text-muted-light hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
