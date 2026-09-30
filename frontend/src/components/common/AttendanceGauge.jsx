function getGaugeColor(pct) {
  if (pct >= 85) return { stroke: '#22c55e', bg: '#22c55e20' };
  if (pct >= 75) return { stroke: '#eab308', bg: '#eab30820' };
  return { stroke: '#ef4444', bg: '#ef444420' };
}

export default function AttendanceGauge({ percentage = 0, size = 160, strokeWidth = 10 }) {
  const pct = Math.min(100, Math.max(0, percentage));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const center = size / 2;
  const colors = getGaugeColor(pct);

  return (
    <div className="inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.bg}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-all duration-700 ease-out"
        />
        <text
          x={center}
          y={center}
          textAnchor="middle"
          dominantBaseline="central"
          className="text-white"
          fontSize={size * 0.18}
          fontWeight="bold"
          fill="currentColor"
        >
          {Math.round(pct)}%
        </text>
      </svg>
    </div>
  );
}
