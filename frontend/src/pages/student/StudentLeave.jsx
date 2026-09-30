import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { LeaveIcon, PlusIcon, UploadIcon, CalendarIcon, CheckIcon, XIcon, EyeIcon, ClockIcon } from '../../utils/icons';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { leaveAPI } from '../../services/api';
import api from '../../services/api';

const statusSteps = ['submitted', 'forwarded', 'approved'];

function StatusStepper({ status }) {
  const currentIndex = statusSteps.indexOf(status);
  const step = currentIndex >= 0 ? currentIndex : status === 'rejected' || status === 'withdrawn' ? -1 : 0;

  return (
    <div className="flex items-center gap-1.5">
      {statusSteps.map((s, i) => {
        const done = step >= i;
        const isRejectedOrWithdrawn = status === 'rejected' || status === 'withdrawn';
        return (
          <div key={s} className="flex items-center">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border ${
              isRejectedOrWithdrawn && i === 1
                ? 'border-danger bg-danger/20 text-danger'
                : done
                  ? 'border-accent bg-accent text-white'
                  : 'border-surface-border bg-surface-overlay text-muted-dark'
            }`}>
              {isRejectedOrWithdrawn && i === 1 ? <XIcon size={10} /> : done ? <CheckIcon size={10} /> : i + 1}
            </div>
            {i < statusSteps.length - 1 && (
              <div className={`w-4 h-0.5 mx-0.5 rounded-full ${step > i ? 'bg-accent' : 'bg-surface-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimelineView({ leaves }) {
  const sorted = [...leaves].sort((a, b) => new Date(b.created_at || b.submitted_at) - new Date(a.created_at || a.submitted_at));

  if (sorted.length === 0) return null;

  return (
    <div className="card">
      <h3 className="text-base font-semibold text-white mb-5">Leave Journey</h3>
      <div className="relative">
        <div className="absolute left-[17px] top-2 bottom-2 w-0.5 bg-surface-border rounded-full" />
        <div className="space-y-6">
          {sorted.slice(0, 10).map((leave) => {
            const timeline = [
              { label: 'Submitted', date: leave.created_at || leave.submitted_at, icon: ClockIcon, done: true },
              { label: 'Faculty Review', date: leave.faculty_reviewed_at || null, icon: ClockIcon, done: leave.status !== 'pending' && leave.status !== 'withdrawn' },
              { label: leave.status === 'rejected' ? (leave.hod_reviewed_by ? 'Rejected by HOD' : 'Rejected') : leave.status === 'withdrawn' ? 'Withdrawn' : 'HOD Approved', date: leave.hod_reviewed_at || leave.faculty_reviewed_at || null, icon: leave.status === 'approved' ? CheckIcon : XIcon, done: leave.status !== 'pending' && leave.status !== 'forwarded' && leave.status !== 'withdrawn' },
            ];

            return (
              <div key={leave.id} className="relative pl-10">
                <div className="absolute left-[10px] top-1.5 w-[15px] h-[15px] rounded-full bg-surface-overlay border-2 border-accent flex items-center justify-center z-10">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                </div>
                <div className="p-3 bg-surface-overlay rounded-xl border border-surface-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-light capitalize">{(leave.leave_type || leave.type || '').replace('_', ' ')} Leave</p>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(leave.status)}`}>
                      {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-xs text-muted mb-2 line-clamp-1">{leave.reason}</p>
                  <div className="flex items-center gap-3 text-[10px] text-muted-dark">
                    <span>{formatDate(leave.from_date || leave.start_date || leave.startDate)} - {formatDate(leave.to_date || leave.end_date || leave.endDate)}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-surface-border">
                    <div className="flex items-center gap-4 text-[10px] text-muted">
                      {timeline.map((t, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <t.icon size={10} className={t.done ? 'text-accent-light' : 'text-muted-dark'} />
                          <span className={t.done ? 'text-muted-light' : 'text-muted-dark'}>{t.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function StudentLeave() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leave_type: 'sick', from_date: '', to_date: '', reason: '' });
  const [docFile, setDocFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await leaveAPI.getAll().catch(() => ({ success: true, data: [] }));
      if (res && res.success !== false) {
        setLeaves(res.data || res || []);
      } else {
        setLeaves([]);
      }
    } catch (err) {
      setLeaves([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!form.leave_type) errors.leave_type = 'Leave type is required';
    if (!form.from_date) errors.from_date = 'Start date is required';
    if (!form.to_date) errors.to_date = 'End date is required';
    if (form.from_date && form.to_date && new Date(form.from_date) > new Date(form.to_date)) {
      errors.to_date = 'End date must be on or after start date';
    }
    if (form.from_date && new Date(form.from_date) < new Date(new Date().setHours(0, 0, 0, 0))) {
      errors.from_date = 'Start date cannot be in the past';
    }
    if (!form.reason || form.reason.trim().length < 10) {
      errors.reason = 'Reason must be at least 10 characters';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      setSubmitting(true);
      setError('');
      const formData = new FormData();
      formData.append('leave_type', form.leave_type);
      formData.append('from_date', form.from_date);
      formData.append('to_date', form.to_date);
      formData.append('reason', form.reason);
      if (docFile) formData.append('document', docFile);

      const res = await leaveAPI.create(formData);
      if (res.success) {
        setShowForm(false);
        setForm({ leave_type: 'sick', from_date: '', to_date: '', reason: '' });
        setDocFile(null);
        setFormErrors({});
        setError('');
        fetchLeaves();
      } else {
        let errorMsg = res.message || 'Application failed';
        if (res.errors) {
          const fieldErrors = Object.values(res.errors).flat();
          if (fieldErrors.length > 0) errorMsg = fieldErrors.join(', ');
        }
        setError(errorMsg);
      }
    } catch (err) {
      let errorMsg = 'Application failed. Please try again.';
      if (err.message) {
        errorMsg = err.message;
      } else if (err.data?.message) {
        errorMsg = err.data.message;
      } else if (err.errors) {
        errorMsg = Object.values(err.errors).flat().join(', ');
      }
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (id) => {
    if (!confirm('Are you sure you want to withdraw this leave application?')) return;
    try {
      setError('');
      const res = await api.put(`/leave-applications/${id}/withdraw`);
      if (res.success) {
        fetchLeaves();
      } else {
        setError(res.message || 'Failed to withdraw');
      }
    } catch (err) {
      const errorMsg = err.message || err.data?.message || 'Failed to withdraw leave application.';
      setError(errorMsg);
    }
  };

  if (loading) return <LoadingSpinner size="lg" text="Loading leave history..." />;

  const pending = leaves.filter((l) => l.status === 'pending').length;
  const approved = leaves.filter((l) => l.status === 'approved').length;
  const rejected = leaves.filter((l) => l.status === 'rejected').length;
  const withdrawn = leaves.filter((l) => l.status === 'withdrawn').length;

  const sickUsed = leaves.filter((l) => l.leave_type === 'sick' && l.status === 'approved').length;
  const personalUsed = leaves.filter((l) => l.leave_type === 'personal' && l.status === 'approved').length;
  const totalSick = 12;
  const totalPersonal = 6;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Leave Applications"
        subtitle="Apply for leave and track your requests"
        action={
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-colors"
          >
            <PlusIcon size={16} />
            New Application
          </button>
        }
      />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm flex items-start justify-between gap-3">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-danger hover:text-danger/80 flex-shrink-0 font-bold">&times;</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard icon={<CheckIcon size={22} />} label="Approved" value={approved} color="success" />
        <StatCard icon={<CalendarIcon size={22} />} label="Pending" value={pending} color="warning" />
        <StatCard icon={<XIcon size={22} />} label="Rejected" value={rejected} color="error" />
        <StatCard icon={<ClockIcon size={22} />} label="Withdrawn" value={withdrawn} color="info" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4">Leave Balance</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-light">Sick Leave</span>
                <span className="text-muted">{sickUsed}/{totalSick} used</span>
              </div>
              <div className="h-2 bg-surface-overlay rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(sickUsed / totalSick) * 100}%` }} />
              </div>
              <p className="text-xs text-muted mt-1">{totalSick - sickUsed} remaining</p>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-light">Personal Leave</span>
                <span className="text-muted">{personalUsed}/{totalPersonal} used</span>
              </div>
              <div className="h-2 bg-surface-overlay rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${(personalUsed / totalPersonal) * 100}%` }} />
              </div>
              <p className="text-xs text-muted mt-1">{totalPersonal - personalUsed} remaining</p>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-5">New Leave Application</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted mb-1.5">Leave Type</label>
                <select
                  value={form.leave_type}
                  onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                  className={`w-full bg-surface-overlay border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50 ${formErrors.leave_type ? 'border-danger' : 'border-surface-border'}`}
                >
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="official">Official Leave</option>
                  <option value="other">Other</option>
                </select>
                {formErrors.leave_type && <p className="text-xs text-danger mt-1">{formErrors.leave_type}</p>}
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Document (optional)</label>
                <div className="border-2 border-dashed border-surface-border rounded-xl p-3 text-center hover:border-accent/30 transition-colors cursor-pointer">
                  <input type="file" className="hidden" id="leaveDoc" onChange={(e) => setDocFile(e.target.files[0])} />
                  <label htmlFor="leaveDoc" className="cursor-pointer flex items-center justify-center gap-2 text-xs text-muted">
                    <UploadIcon size={14} />
                    {docFile ? docFile.name : 'Upload'}
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={form.from_date}
                  onChange={(e) => setForm({ ...form, from_date: e.target.value })}
                  className={`w-full bg-surface-overlay border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50 ${formErrors.from_date ? 'border-danger' : 'border-surface-border'}`}
                />
                {formErrors.from_date && <p className="text-xs text-danger mt-1">{formErrors.from_date}</p>}
              </div>
              <div>
                <label className="block text-xs text-muted mb-1.5">End Date</label>
                <input
                  type="date"
                  value={form.to_date}
                  onChange={(e) => setForm({ ...form, to_date: e.target.value })}
                  className={`w-full bg-surface-overlay border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50 ${formErrors.to_date ? 'border-danger' : 'border-surface-border'}`}
                />
                {formErrors.to_date && <p className="text-xs text-danger mt-1">{formErrors.to_date}</p>}
              </div>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                className={`w-full bg-surface-overlay border rounded-xl px-4 py-2.5 text-sm text-muted-light focus:outline-none focus:border-accent/50 resize-none ${formErrors.reason ? 'border-danger' : 'border-surface-border'}`}
                placeholder="Explain your reason for leave (min 10 characters)..."
              />
              {formErrors.reason && <p className="text-xs text-danger mt-1">{formErrors.reason}</p>}
            </div>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setShowForm(false); setError(''); setFormErrors({}); }} className="px-4 py-2 bg-surface-overlay border border-surface-border rounded-xl text-sm text-muted-light hover:bg-surface-hover transition-colors">Cancel</button>
              <button type="submit" disabled={submitting} className="px-5 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors">
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <h3 className="text-base font-semibold text-white mb-5">Leave History</h3>
        {leaves.length === 0 ? (
          <EmptyState title="No Applications" description="No leave applications yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Type</th>
                  <th className="text-left py-3 pr-4">Dates</th>
                  <th className="text-left py-3 pr-4">Reason</th>
                  <th className="text-left py-3 pr-4">Progress</th>
                  <th className="text-left py-3 pr-4">Status</th>
                  <th className="text-left py-3 pr-4">Doc</th>
                  <th className="text-left py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => (
                  <tr key={leave.id} className="border-b border-surface-border/50 last:border-0">
                    <td className="py-3.5 pr-4 text-muted-light whitespace-nowrap capitalize">{(leave.leave_type || leave.type || '').replace('_', ' ')}</td>
                    <td className="py-3.5 pr-4 text-muted whitespace-nowrap">
                      <div className="text-xs">{formatDate(leave.from_date || leave.start_date || leave.startDate)}</div>
                      <div className="text-xs text-muted-dark">{formatDate(leave.to_date || leave.end_date || leave.endDate)}</div>
                    </td>
                    <td className="py-3.5 pr-4 text-muted max-w-[180px] truncate">{leave.reason}</td>
                    <td className="py-3.5 pr-4">
                      <StatusStepper status={leave.status} />
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                        {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4">
                      {leave.document_url || leave.document ? (
                        <a
                          href={leave.document_url || leave.document}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-accent-light hover:text-accent"
                        >
                          <EyeIcon size={12} />
                          View
                        </a>
                      ) : (
                        <span className="text-xs text-muted-dark">-</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      {leave.status === 'pending' && (
                        <button
                          onClick={() => handleWithdraw(leave.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-colors"
                        >
                          Withdraw
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TimelineView leaves={leaves} />
    </div>
  );
}
