import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SpeakButton } from "@/components/SpeakButton";
import { TrackRecent } from "@/components/RecentlyViewed";
import { getWordDetail } from "@/lib/dictionary";
import { subcategoryLabel } from "@/lib/taxonomy";
import { LEVEL_LABELS, type LevelName } from "@/lib/levels";

const PRONOUNS = [
  ["ich", "ich"],
  ["du", "du"],
  ["er/sie/es", "er"],
  ["wir", "wir"],
  ["ihr", "ihr"],
  ["sie/Sie", "sie"],
] as const;

export default async function WordDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const word = await getWordDetail(Number(id));
  if (!word) notFound();

  const translations = (word.translationsEn as string[]) ?? [];
  const praesens = (word.verb?.praesens ?? {}) as Record<string, string>;
  const display = word.noun ? `${word.noun.article} ${word.lemma}` : word.lemma;

  return (
    <>
      <TrackRecent id={word.id} lemma={word.lemma} article={word.noun?.article ?? null} />

      <nav className="muted mb-4 text-sm">
        <Link href="/dictionary" className="underline">
          Dictionary
        </Link>{" "}
        / {word.lemma}
      </nav>

      <PageHeader
        title={display}
        subtitle={translations.join(", ")}
        action={<SpeakButton text={word.lemma} />}
      />

      <div className="flex flex-wrap gap-2 text-xs">
        <span className="pill" data-active="true">
          {LEVEL_LABELS[word.level as LevelName]}
        </span>
        <span className="pill">{subcategoryLabel(word.subcategory)}</span>
        {word.verb?.isSeparable && (
          <span
            className="pill"
            style={{ background: "color-mix(in srgb, var(--color-shaky-500) 22%, transparent)" }}
          >
            separable verb{word.verb.prefix ? ` · ${word.verb.prefix}-` : ""}
          </span>
        )}
        {word.verb?.isIrregular && <span className="pill">irregular</span>}
        {word.verb && <span className="pill">Perfekt with {word.verb.auxiliary}</span>}
      </div>

      {word.exampleDe && (
        <section className="surface mt-5 p-5">
          <h2 className="mb-2 text-sm font-medium">Example</h2>
          <p className="text-lg">{word.exampleDe}</p>
          {word.exampleEn && <p className="muted mt-1 text-sm">{word.exampleEn}</p>}
          <div className="mt-3">
            <SpeakButton text={word.exampleDe} label="Play sentence" />
          </div>
        </section>
      )}

      {word.noun && (
        <section className="surface mt-5 p-5">
          <h2 className="mb-3 text-sm font-medium">Noun</h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="muted text-xs">Gender</dt>
              <dd className="text-lg">{word.noun.article}</dd>
            </div>
            <div>
              <dt className="muted text-xs">Singular</dt>
              <dd className="text-lg">
                {word.noun.article} {word.lemma}
              </dd>
            </div>
            <div>
              <dt className="muted text-xs">Plural</dt>
              <dd className="text-lg">die {word.noun.plural}</dd>
            </div>
          </dl>
        </section>
      )}

      {word.verb && (
        <section className="surface mt-5 p-5">
          <h2 className="mb-3 text-sm font-medium">Present tense (Präsens)</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <tbody>
                {PRONOUNS.map(([label, key]) => (
                  <tr key={key}>
                    <td className="muted border px-3 py-2 w-28">{label}</td>
                    <td className="border px-3 py-2 font-medium">{praesens[key] ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(word.verb.praeteritum || word.verb.partizip2) && (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {word.verb.praeteritum && (
                <div>
                  <dt className="muted text-xs">Präteritum</dt>
                  <dd className="text-lg">{word.verb.praeteritum}</dd>
                </div>
              )}
              {word.verb.partizip2 && (
                <div>
                  <dt className="muted text-xs">Partizip II</dt>
                  <dd className="text-lg">
                    {word.verb.auxiliary} {word.verb.partizip2}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {word.verb.isSeparable && (
            <p className="muted mt-4 text-sm">
              This verb is <strong>separable</strong>: the prefix
              {word.verb.prefix ? ` “${word.verb.prefix}”` : ""} splits off and moves to the end of
              a main clause — e.g. <em>{praesens.ich}</em>.
            </p>
          )}
        </section>
      )}

      {word.adj && (
        <section className="surface mt-5 p-5">
          <h2 className="mb-3 text-sm font-medium">Comparison</h2>
          <dl className="grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="muted text-xs">Positive</dt>
              <dd className="text-lg">{word.lemma}</dd>
            </div>
            <div>
              <dt className="muted text-xs">Comparative</dt>
              <dd className="text-lg">{word.adj.comparative}</dd>
            </div>
            {word.adj.superlative && (
              <div>
                <dt className="muted text-xs">Superlative</dt>
                <dd className="text-lg">{word.adj.superlative}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="mt-5">
        <h2 className="muted mb-2 text-xs font-medium uppercase tracking-wide">
          Also findable as
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {word.forms.map((f) => (
            <span key={f.id} className="pill text-xs" title={f.formType}>
              {f.form}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
