const statusStyles = {
  active: 'badge-success',
  inactive: 'badge bg-surface-hover text-muted border border-surface-border',
  suspended: 'badge-danger',
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
  accepted: 'badge-success',
  completed: 'badge-info',
  failed: 'badge-danger',
  present: 'badge-success',
  absent: 'badge-danger',
  late: 'badge-warning',
  paid: 'badge-success',
  unpaid: 'badge-warning',
  published: 'badge-primary',
  draft: 'badge bg-surface-hover text-muted border border-surface-border',
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || 'badge bg-surface-hover text-muted border border-surface-border';

  return (
    <span className={style}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'active' || status === 'present' || status === 'paid' || status === 'completed' || status === 'approved'
          ? 'bg-success'
          : status === 'pending' || status === 'late' || status === 'unpaid'
          ? 'bg-warning'
          : status === 'absent' || status === 'suspended' || status === 'rejected' || status === 'failed'
          ? 'bg-danger'
          : status === 'published'
          ? 'bg-accent'
          : 'bg-muted-dark'
      }`} />
      {status}
    </span>
  );
}
