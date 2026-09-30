import { BookOpen } from '../../utils/icons';

export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-overlay border border-surface-border flex items-center justify-center mb-5 text-muted-dark">
        {icon || <BookOpen size={32} />}
      </div>
      <h3 className="text-lg font-semibold text-muted-light mb-2">{title || 'No data found'}</h3>
      {description && <p className="text-muted text-sm mb-5 max-w-md">{description}</p>}
      {action}
    </div>
  );
}
