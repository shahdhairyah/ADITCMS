// `height` was accepted but never applied - the bar track is a fixed h-2.5 -
// so a caller asking for a taller chart got no change. It is honoured here
// through the inline style, and the fixed Tailwind height is dropped.
export default function PerformanceGraph({ data = [], height = 10, color = 'from-accent to-accent/70', showLabels = true }) {
  if (data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d.maxValue || d.value || 0), 1);
  return (
    <div className="space-y-3">
      {data.map((item, idx) => {
        const pct = ((item.value || 0) / (item.maxValue || maxVal)) * 100;
        return (
          <div key={idx}>
            {showLabels && (
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-muted">{item.label}</span>
                <span className="text-xs text-white font-medium">{item.value}{item.suffix || ''}</span>
              </div>
            )}
            <div
              className="relative w-full bg-surface-overlay rounded-full overflow-hidden"
              style={{ height: `${height}px` }}
            >
              <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
