export function ProgressRing({
  value,
  label,
  sublabel,
  size = 132,
}: {
  /** 0..1 */
  value: number;
  label: string;
  sublabel?: string;
  size?: number;
}) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.min(1, Math.max(0, value));

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} className="shrink-0 -rotate-90" role="img" aria-label={`${Math.round(clamped * 100)}% complete`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-brand-500)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      <div>
        <div className="text-3xl font-semibold">{Math.round(clamped * 100)}%</div>
        <div className="text-sm font-medium">{label}</div>
        {sublabel && <div className="muted mt-0.5 text-xs">{sublabel}</div>}
      </div>
    </div>
  );
}
