import Link from "next/link";

export function StatCard({
  label,
  value,
  hint,
  href,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  accent?: string;
}) {
  const body = (
    <div className="surface h-full p-4 transition-colors hover:border-[var(--color-brand-500)]">
      <div className="muted text-xs font-medium uppercase tracking-wide">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold" style={accent ? { color: accent } : undefined}>
        {value}
      </div>
      {hint && <div className="muted mt-1 text-xs">{hint}</div>}
    </div>
  );

  return href ? <Link href={href}>{body}</Link> : body;
}
