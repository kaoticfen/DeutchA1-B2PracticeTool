import Link from "next/link";
import { subcategoryLabel } from "@/lib/taxonomy";

const POS_LABEL: Record<string, string> = {
  VERB: "verb",
  NOUN: "noun",
  ADJ: "adjective",
  PREP: "preposition",
  ADV: "adverb",
  OTHER: "word",
};

export function WordCard({
  id,
  lemma,
  article,
  level,
  pos,
  subcategory,
  translationsEn,
  matchedVia,
  matchedForm,
}: {
  id: number;
  lemma: string;
  article?: string | null;
  level: string;
  pos: string;
  subcategory: string;
  translationsEn: string[];
  matchedVia?: string | null;
  matchedForm?: string | null;
}) {
  return (
    <Link
      href={`/dictionary/${id}`}
      className="surface block p-4 transition-colors hover:border-[var(--color-brand-500)]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="font-medium">
          {article && <span className="muted mr-1.5">{article}</span>}
          {lemma}
        </div>
        <span className="muted shrink-0 text-xs">{level}</span>
      </div>

      <div className="muted mt-1 text-sm">{translationsEn.join(", ")}</div>

      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
        <span className="muted">{POS_LABEL[pos] ?? pos}</span>
        <span className="muted">·</span>
        <span className="muted">{subcategoryLabel(subcategory)}</span>
        {matchedVia && matchedForm && (
          <span
            className="rounded-full px-2 py-0.5"
            style={{
              background: "color-mix(in srgb, var(--color-brand-500) 18%, transparent)",
            }}
          >
            matched “{matchedForm}”
          </span>
        )}
      </div>
    </Link>
  );
}
