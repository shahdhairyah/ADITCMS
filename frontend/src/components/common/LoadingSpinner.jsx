export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="relative">
        <div className={`${sizeClasses[size]} border-2 border-surface-border rounded-full`} />
        <div className={`${sizeClasses[size]} absolute top-0 left-0 border-2 border-transparent border-t-accent rounded-full animate-spin`} />
        <div className={`${sizeClasses[size]} absolute top-0 left-0 border-2 border-transparent border-r-accent/50 rounded-full animate-spin`}
          style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
        />
      </div>
      {text && <p className="mt-4 text-muted text-sm">{text}</p>}
    </div>
  );
}
