const colorConfig = {
  primary: { icon: 'text-accent-light bg-accent/10', bar: 'bg-accent' },
  success: { icon: 'text-success bg-success/10', bar: 'bg-success' },
  warning: { icon: 'text-warning bg-warning/10', bar: 'bg-warning' },
  error: { icon: 'text-danger bg-danger/10', bar: 'bg-danger' },
  info: { icon: 'text-info bg-info/10', bar: 'bg-info' },
};

function CardContent({ icon, label, value, subtext, color, trend }) {
  const colors = colorConfig[color] || colorConfig.primary;
  return (
    <>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors.icon}`}>
          {icon}
        </div>
        <p className="text-sm text-muted">{label}</p>
      </div>

      <p className="text-2xl font-bold text-white mt-3">{value}</p>

      {subtext && (
        <p className="text-xs text-muted-dark mt-1">{subtext}</p>
      )}

      {trend !== undefined && (
        <span className={`text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-danger'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
        </span>
      )}
    </>
  );
}

export default function StatCard({ icon, label, value, subtext, color = 'primary', trend, onClick, premium }) {
  if (premium) {
    return (
      <div
        onClick={onClick}
        className={`relative p-[1.5px] rounded-xl overflow-hidden shadow-glow-sm ${onClick ? 'cursor-pointer hover:border-accent/40' : ''}`}
      >
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#6366f1,#06b6d4,#f59e0b,#6366f1)] opacity-30 animate-spin-slow" />
        <div className="relative bg-surface-raised rounded-[10px] p-5 h-full transition-colors">
          <CardContent icon={icon} label={label} value={value} subtext={subtext} color={color} trend={trend} />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`bg-surface-raised rounded-xl border border-surface-border p-5 transition-colors ${onClick ? 'cursor-pointer hover:border-accent/40' : ''}`}
    >
      <CardContent icon={icon} label={label} value={value} subtext={subtext} color={color} trend={trend} />
    </div>
  );
}
