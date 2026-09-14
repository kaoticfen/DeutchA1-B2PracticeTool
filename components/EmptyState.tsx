import Link from "next/link";

/**
 * Shown when a feature has no seeded content yet — the expected state before
 * `npm run generate:seed` has been run with an API key.
 */
export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="surface flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="text-3xl" aria-hidden>
        ∅
      </div>
      <h2 className="text-lg font-medium">{title}</h2>
      <p className="muted max-w-md text-sm">{body}</p>
      {cta && (
        <Link href={cta.href} className="btn btn-primary mt-2">
          {cta.label}
        </Link>
      )}
    </div>
  );
}
