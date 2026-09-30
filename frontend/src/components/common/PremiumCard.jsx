export default function PremiumCard({ className = '', innerClassName = '', children }) {
  return (
    <div className={`relative p-[1.5px] rounded-xl overflow-hidden shadow-glow-sm ${className}`}>
      <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#6366f1,#06b6d4,#f59e0b,#6366f1)] opacity-30 animate-spin-slow" />
      <div className={`relative bg-surface-raised rounded-[10px] h-full ${innerClassName}`}>
        {children}
      </div>
    </div>
  );
}
