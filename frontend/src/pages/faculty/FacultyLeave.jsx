import { useState, useEffect } from 'react';
import PageHeader from '../../components/common/PageHeader';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import { leaveAPI } from '../../services/api';
import { formatDate } from '../../utils/helpers';

export default function FacultyLeave() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewing, setReviewing] = useState(null);
  const [comments, setComments] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await leaveAPI.getAll({ status: 'pending' }).catch(() => ({ success: true, data: [] }));
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

  if (loading) return <LoadingSpinner size="lg" text="Loading leave applications..." />;

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Applications" subtitle="Review and forward student leave requests to HOD" />

      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger px-4 py-3 rounded-xl text-sm">{error}</div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-white">Pending Leave Requests</h3>
          <span className="text-xs text-muted bg-surface-overlay px-3 py-1.5 rounded-lg">{leaves.length} pending</span>
        </div>

        {leaves.length === 0 ? (
          <EmptyState title="No Pending Leaves" description="No leave applications awaiting faculty review." />
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
                  <th className="text-left py-3 pr-4">Days</th>
                  <th className="text-left py-3 pr-4">Applied</th>
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
                      </td>
                      <td className="py-3.5 pr-4 text-muted max-w-[200px] truncate">{leave.reason}</td>
                      <td className="py-3.5 pr-4 text-muted">{days} day{days > 1 ? 's' : ''}</td>
                      <td className="py-3.5 pr-4 text-muted-dark text-xs">{formatDate(leave.created_at)}</td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleReview(leave.id, 'forward')}
                            disabled={reviewing === leave.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent/15 text-accent-light hover:bg-accent/25 transition-colors disabled:opacity-50"
                          >
                            Forward to HOD
                          </button>
                          <button
                            onClick={() => handleReview(leave.id, 'reject')}
                            disabled={reviewing === leave.id}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-danger/10 text-danger hover:bg-danger/20 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
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