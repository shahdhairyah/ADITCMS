import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import StatCard from '../../components/common/StatCard';
import { leaveAPI } from '../../services/api';
import { formatDate, getStatusColor } from '../../utils/helpers';
import { CheckIcon, XIcon, ClockIcon } from '../../utils/icons';

export default function HODLeave() {
  const [leaves, setLeaves] = useState([]);
  const [activeTab, setActiveTab] = useState('forwarded');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [comments, setComments] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, [activeTab]);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError('');
      const statusFilter = activeTab === 'all' ? null : activeTab;
      const res = await leaveAPI.getAll(statusFilter ? { status: statusFilter } : {}).catch(() => ({ success: true, data: [] }));
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

  const handleReview = async (id, action) => {
    if (!confirm(`Are you sure you want to ${action} this leave application?`)) return;
    try {
      setError('');
      setReviewing(id);
      const res = await leaveAPI.update(id, { action, comments });
      if (res.success) {
        setComments('');
        setReviewing(null);
        fetchLeaves();
      } else {
        setError(res.message || `Failed to ${action} leave`);
        setReviewing(null);
      }
    } catch (err) {
      setError(err.message || err.data?.message || `Failed to ${action} leave`);
      setReviewing(null);
    }
  };

  if (loading && !leaves.length) return <LoadingSpinner size="lg" text="Loading leave applications..." />;

  const forwarded = leaves.filter((l) => l.status === 'forwarded').length;
  const approved = leaves.filter((l) => l.status === 'approved').length;
  const rejected = leaves.filter((l) => l.status === 'rejected').length;

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Management" subtitle="Review and approve/reject forwarded leave applications" />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard icon={<ClockIcon size={22} />} label="Awaiting Review" value={forwarded} color="warning" />
        <StatCard icon={<CheckIcon size={22} />} label="Approved" value={approved} color="success" />
        <StatCard icon={<XIcon size={22} />} label="Rejected" value={rejected} color="error" />
      </div>

      <div className="card">
        <div className="flex items-center gap-2 mb-5 border-b border-surface-border pb-3">
          {['forwarded', 'approved', 'rejected', 'all'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-accent/15 text-accent-light'
                  : 'text-muted hover:text-muted-light hover:bg-surface-hover'
              }`}
            >
              {tab === 'all' ? 'All' : tab}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner size="md" text="Loading..." />
        ) : leaves.length === 0 ? (
          <EmptyState title="No Applications" description="No leave applications found in this category." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-muted text-xs uppercase tracking-wider">
                  <th className="text-left py-3 pr-4">Student</th>
                  <th className="text-left py-3 pr-4">Roll No</th>
                  <th className="text-left py-3 pr-4">Type</th>
                  <th className="text-left py-3 pr-4">Dates</th>
                  <th className="text-left py-3 pr-4">Reason</th>
                  <th className="text-left py-3 pr-4">Faculty</th>
                  <th className="text-left py-3 pr-4">Status</th>
                  <th className="text-right py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((leave) => {
                  const from = new Date(leave.from_date);
                  const to = new Date(leave.to_date);
                  const days = Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
                  return (
                    <tr key={leave.id} className="border-b border-surface-border/50 last:border-0">
                      <td className="py-3.5 pr-4 text-muted-light whitespace-nowrap">
                        {leave.first_name} {leave.last_name}
                      </td>
                      <td className="py-3.5 pr-4 text-muted whitespace-nowrap">{leave.roll_number}</td>
                      <td className="py-3.5 pr-4 whitespace-nowrap capitalize">{leave.leave_type}</td>
                      <td className="py-3.5 pr-4 text-muted whitespace-nowrap">
                        <div className="text-xs">{formatDate(leave.from_date)}</div>
                        <div className="text-xs text-muted-dark">{formatDate(leave.to_date)}</div>
                        <div className="text-[10px] text-muted-dark">{days} day{days > 1 ? 's' : ''}</div>
                      </td>
                      <td className="py-3.5 pr-4 text-muted max-w-[180px] truncate">{leave.reason}</td>
                      <td className="py-3.5 pr-4 text-muted text-xs">
                        {leave.faculty_reviewer_name || '-'}
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        {leave.status === 'forwarded' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleReview(leave.id, 'approve')}
                              disabled={reviewing === leave.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/15 text-accent-light hover:bg-accent/25 transition-colors disabled:opacity-50"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReview(leave.id, 'reject')}
                              disabled={reviewing === leave.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-dark">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}