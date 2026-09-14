import { PageHeader } from "@/components/PageHeader";
import { SpeakButton } from "@/components/SpeakButton";
import { EmptyState } from "@/components/EmptyState";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";

export default async function PronunciationPage() {
  await requireUser();
  const entries = await prisma.pronunciationEntry.findMany({ orderBy: { order: "asc" } });

  return (
    <>
      <PageHeader
        title="Pronunciation Guide"
        subtitle={`${entries.length} sounds that decide whether you sound German. Tap any example to hear it.`}
      />

      {entries.length === 0 ? (
        <EmptyState
          title="No pronunciation entries seeded"
          body="Run `npm run db:seed` to load the guide."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((e) => (
            <article key={e.id} className="surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold" style={{ color: "var(--color-brand-500)" }}>
                      {e.symbol}
                    </span>
                    <span className="muted text-sm">{e.grapheme}</span>
                  </div>
                  <div className="mt-1.5 text-lg">{e.example}</div>
                </div>
                <SpeakButton text={e.example} label="" className="btn btn-ghost shrink-0 px-3 py-1.5" />
              </div>

              <p className="muted mt-3 text-sm">{e.description}</p>
              <p className="mt-2 rounded-lg p-2.5 text-sm" style={{ background: "var(--surface-2)" }}>
                <strong>Tip:</strong> {e.tip}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
