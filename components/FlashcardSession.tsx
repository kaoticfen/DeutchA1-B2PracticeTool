"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { gradeWord } from "@/lib/actions/review-actions";
import { REVIEW_INTERVAL_DAYS, type MasteryStateName } from "@/lib/srs";
import { SpeakButton } from "@/components/SpeakButton";
import { subcategoryLabel } from "@/lib/taxonomy";
import type { ReviewCard } from "@/lib/review-queue";

const GRADES: { state: MasteryStateName; label: string; color: string }[] = [
  { state: "UNKNOWN", label: "Unknown", color: "var(--color-unknown-500)" },
  { state: "SHAKY", label: "Shaky", color: "var(--color-shaky-500)" },
  { state: "KNOWN", label: "Known", color: "var(--color-known-500)" },
];

export function FlashcardSession({ cards }: { cards: ReviewCard[] }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ KNOWN: 0, SHAKY: 0, UNKNOWN: 0 });
  const [promotedTo, setPromotedTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const card = cards[index];
  const done = index >= cards.length;

  function grade(state: MasteryStateName) {
    if (!card || pending) return;

    startTransition(async () => {
      const result = await gradeWord({ wordId: card.wordId, state });
      if (result.promotedTo) setPromotedTo(result.promotedTo);

      setTally((t) => ({ ...t, [state]: t[state] + 1 }));
      setRevealed(false);
      setIndex((i) => i + 1);
    });
  }

  if (done) {
    const total = tally.KNOWN + tally.SHAKY + tally.UNKNOWN;
    return (
      <div className="surface p-8 text-center">
        <div className="text-3xl" aria-hidden>
          ✓
        </div>
        <h2 className="mt-3 text-xl font-semibold">Session complete</h2>
        <p className="muted mt-1 text-sm">
          You reviewed {total} card{total === 1 ? "" : "s"}.
        </p>

        {promotedTo && (
          <p
            className="mx-auto mt-4 max-w-sm rounded-lg p-3 text-sm"
            style={{ background: "color-mix(in srgb, var(--color-known-500) 18%, transparent)" }}
          >
            Congratulations — you have been promoted to <strong>{promotedTo}</strong>.
          </p>
        )}

        <div className="mt-5 flex flex-wrap justify-center gap-4 text-sm">
          {GRADES.map((g) => (
            <span key={g.state} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: g.color }} />
              {g.label}: {tally[g.state]}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn btn-primary" onClick={() => router.refresh()}>
            Review more
          </button>
          <Link href="/dashboard" className="btn btn-ghost">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const front = card.article ? `${card.article} ${card.lemma}` : card.lemma;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(index / cards.length) * 100}%`,
              background: "var(--color-brand-500)",
            }}
          />
        </div>
        <span className="muted shrink-0 text-xs">
          {index + 1} / {cards.length}
        </span>
      </div>

      <div className="surface p-6 sm:p-10">
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="pill">{card.level}</span>
          <span className="pill">{subcategoryLabel(card.subcategory)}</span>
          {card.isNew ? (
            <span
              className="pill"
              style={{ background: "color-mix(in srgb, var(--color-brand-500) 20%, transparent)" }}
            >
              new
            </span>
          ) : (
            <span className="pill">last: {card.state?.toLowerCase()}</span>
          )}
        </div>

        <div className="mt-8 text-center">
          <div className="text-4xl font-semibold sm:text-5xl">{front}</div>

          {revealed ? (
            <div className="mt-6">
              <div className="text-xl">{card.translationsEn.join(", ")}</div>
              {card.exampleDe && (
                <div className="muted mt-4 text-sm">
                  <div className="italic">{card.exampleDe}</div>
                  {card.exampleEn && <div className="mt-0.5">{card.exampleEn}</div>}
                </div>
              )}
              <div className="mt-4 flex justify-center">
                <SpeakButton text={card.exampleDe || card.lemma} />
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost mt-8" onClick={() => setRevealed(true)}>
              Show meaning
            </button>
          )}
        </div>
      </div>

      {revealed && (
        <div className="mt-5">
          <p className="muted mb-2.5 text-center text-sm">How well did you know it?</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {GRADES.map((g) => (
              <button
                key={g.state}
                disabled={pending}
                onClick={() => grade(g.state)}
                className="rounded-lg border-2 p-4 text-center transition-colors disabled:opacity-50"
                style={{ borderColor: g.color }}
              >
                <div className="font-medium" style={{ color: g.color }}>
                  {g.label}
                </div>
                <div className="muted mt-0.5 text-xs">
                  review in {REVIEW_INTERVAL_DAYS[g.state]} day
                  {REVIEW_INTERVAL_DAYS[g.state] === 1 ? "" : "s"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
