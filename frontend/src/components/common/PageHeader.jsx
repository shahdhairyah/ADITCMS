export default function PageHeader({ title, subtitle, action, premium }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className={`text-2xl font-bold tracking-tight ${premium ? 'gradient-text text-gradient-animate' : 'text-white'}`}>
          {title}
        </h1>
        {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
