export function MasteryBar({
  known,
  shaky,
  unknown,
  total,
}: {
  known: number;
  shaky: number;
  unknown: number;
  total: number;
}) {
  const denom = Math.max(total, known + shaky + unknown, 1);
  const pct = (n: number) => `${(n / denom) * 100}%`;

  const segments = [
    { n: known, color: "var(--color-known-500)", label: "Known" },
    { n: shaky, color: "var(--color-shaky-500)", label: "Shaky" },
    { n: unknown, color: "var(--color-unknown-500)", label: "Unknown" },
  ];

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        {segments.map((s) => (
          <div key={s.label} style={{ width: pct(s.n), background: s.color }} title={`${s.label}: ${s.n}`} />
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {segments.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            <span className="muted">
              {s.label} · {s.n}
            </span>
          </span>
        ))}
        <span className="muted ml-auto">{denom - known - shaky - unknown} not yet seen</span>
      </div>
    </div>
  );
}
