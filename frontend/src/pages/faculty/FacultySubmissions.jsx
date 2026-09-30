import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import { DownloadIcon, ArrowLeft, CheckIcon, XIcon } from '../../utils/icons';
import { formatDate, getStatusColor } from '../../utils/helpers';

const MOCK_SUBMISSIONS = [
  { id: 1, studentName: 'Aarav Patel', roll: 'CE001', fileName: 'binary_tree_aarav.cpp', submittedAt: '2026-08-14', status: 'pending', marks: null, feedback: '' },
  { id: 2, studentName: 'Priya Sharma', roll: 'CE002', fileName: 'bst_priya.cpp', submittedAt: '2026-08-13', status: 'pending', marks: null, feedback: '' },
  { id: 3, studentName: 'Rahul Singh', roll: 'CE003', fileName: 'tree_rahul.cpp', submittedAt: '2026-08-12', status: 'accepted', marks: 85, feedback: 'Good implementation' },
  { id: 4, studentName: 'Sneha Reddy', roll: 'CE004', fileName: 'binary_tree_sneha.cpp', submittedAt: '2026-08-10', status: 'rejected', marks: 45, feedback: 'Needs improvement' },
  { id: 5, studentName: 'Vikram Joshi', roll: 'CE005', fileName: 'tree_vikram.cpp', submittedAt: '2026-08-09', status: 'pending', marks: null, feedback: '' },
];

export default function FacultySubmissions() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState(MOCK_SUBMISSIONS);
  const [marksInput, setMarksInput] = useState({});
  const [feedbackInput, setFeedbackInput] = useState({});
  const assignmentTitle = 'Binary Tree Implementation';

  const updateMarks = (subId) => {
    setSubmissions((prev) => prev.map((s) =>
      s.id === subId
        ? { ...s, marks: Number(marksInput[subId]) || s.marks, feedback: feedbackInput[subId] || s.feedback, status: 'accepted' }
        : s
    ));
  };

  const rejectSubmission = (subId) => {
    setSubmissions((prev) => prev.map((s) =>
      s.id === subId
        ? { ...s, status: 'rejected', marks: Number(marksInput[subId]) || s.marks, feedback: feedbackInput[subId] || s.feedback }
        : s
    ));
  };

  const pending = submissions.filter((s) => s.status === 'pending').length;
  const accepted = submissions.filter((s) => s.status === 'accepted').length;
  const rejected = submissions.filter((s) => s.status === 'rejected').length;

  return (
    <div className="space-y-8">
      <PageHeader
        title={assignmentTitle}
        subtitle="Review and grade student submissions"
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard icon={<DownloadIcon size={22} />} label="Pending" value={pending} color="warning" />
        <StatCard icon={<CheckIcon size={22} />} label="Accepted" value={accepted} color="success" />
        <StatCard icon={<XIcon size={22} />} label="Rejected" value={rejected} color="error" />
      </div>

      <div className="card">
        <h3 className="text-base font-semibold text-white mb-5">Submissions ({submissions.length})</h3>

        <div className="space-y-4">
          {submissions.map((sub) => (
            <div key={sub.id} className="p-4 bg-surface-overlay rounded-xl border border-surface-border/50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-muted-light">{sub.studentName}</p>
                  <p className="text-xs text-muted">{sub.roll}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                  {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4 p-3 bg-surface-raised rounded-lg border border-surface-border/30">
                <DownloadIcon size={16} className="text-accent-light" />
                <span className="text-sm text-muted-light flex-1">{sub.fileName}</span>
                <span className="text-xs text-muted">{formatDate(sub.submittedAt)}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Marks</label>
                  <input
                    type="number"
                    placeholder="Enter marks"
                    defaultValue={sub.marks || ''}
                    onChange={(e) => setMarksInput({ ...marksInput, [sub.id]: e.target.value })}
                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Feedback</label>
                  <input
                    type="text"
                    placeholder="Add feedback"
                    defaultValue={sub.feedback || ''}
                    onChange={(e) => setFeedbackInput({ ...feedbackInput, [sub.id]: e.target.value })}
                    className="w-full bg-surface-raised border border-surface-border rounded-lg px-3 py-2 text-sm text-muted-light focus:outline-none focus:border-accent/50"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => updateMarks(sub.id)}
                    className="flex-1 px-3 py-2 bg-success/10 text-success rounded-lg text-xs font-medium hover:bg-success/20 transition-colors"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => rejectSubmission(sub.id)}
                    className="flex-1 px-3 py-2 bg-danger/10 text-danger rounded-lg text-xs font-medium hover:bg-danger/20 transition-colors"
                  >
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
