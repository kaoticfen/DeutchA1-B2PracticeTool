"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { answerExercise } from "@/lib/actions/exercise-actions";
import type { ExerciseView } from "@/lib/exercises";
import type { AttemptResult } from "@/lib/exercises";

type Source = "exercises" | "daily" | "lesson" | "game";

export function ExerciseRunner({
  exercises,
  source,
  title,
  onFinishHref = "/dashboard",
}: {
  exercises: ExerciseView[];
  source: Source;
  title?: string;
  onFinishHref?: string;
}) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [tiles, setTiles] = useState<string[]>([]);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [score, setScore] = useState(0);
  const [promotedTo, setPromotedTo] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const ex = exercises[index];
  const finished = index >= exercises.length;

  function submit(given: string) {
    if (!given.trim() || pending || result) return;

    startTransition(async () => {
      const r = await answerExercise({ exerciseId: ex.id, given, source });
      if ("error" in r) return;

      setResult(r);
      if (r.correct) setScore((s) => s + 1);
      if (r.promotedTo) setPromotedTo(r.promotedTo);
    });
  }

  function next() {
    setResult(null);
    setTyped("");
    setTiles([]);
    setIndex((i) => i + 1);
  }

  if (finished) {
    const pct = exercises.length > 0 ? Math.round((score / exercises.length) * 100) : 0;
    return (
      <div className="surface p-8 text-center">
        <div className="text-3xl" aria-hidden>
          {pct >= 80 ? "★" : "✓"}
        </div>
        <h2 className="mt-3 text-xl font-semibold">
          {score} / {exercises.length} correct
        </h2>
        <p className="muted mt-1 text-sm">{pct}% accuracy this set.</p>

        {promotedTo && (
          <p
            className="mx-auto mt-4 max-w-sm rounded-lg p-3 text-sm"
            style={{ background: "color-mix(in srgb, var(--color-known-500) 18%, transparent)" }}
          >
            Congratulations — you have been promoted to <strong>{promotedTo}</strong>.
          </p>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn btn-primary" onClick={() => router.refresh()}>
            Another set
          </button>
          <Link href={onFinishHref} className="btn btn-ghost">
            Done
          </Link>
        </div>
      </div>
    );
  }

  const remainingTiles = (() => {
    if (ex.type !== "SENTENCE_BUILD" || !ex.options) return [];
    const used = [...tiles];
    return ex.options.filter((t) => {
      const i = used.indexOf(t);
      if (i === -1) return true;
      used.splice(i, 1);
      return false;
    });
  })();

  return (
    <div>
      {title && <h2 className="mb-3 font-medium">{title}</h2>}

      <div className="mb-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(index / exercises.length) * 100}%`, background: "var(--color-brand-500)" }}
          />
        </div>
        <span className="muted shrink-0 text-xs">
          {index + 1} / {exercises.length}
        </span>
      </div>

      <div className="surface p-5 sm:p-7">
        <div className="mb-4 flex flex-wrap gap-2 text-xs">
          <span className="pill">{ex.level}</span>
          <span className="pill">{ex.topic}</span>
        </div>

        <p className="text-lg font-medium sm:text-xl">{ex.prompt}</p>

        {/* Multiple choice */}
        {ex.type === "MULTIPLE_CHOICE" && ex.options && (
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {ex.options.map((opt) => {
              const isAnswer = result && opt === result.answer;
              const isPicked = result && !result.correct && opt === typed;
              return (
                <button
                  key={opt}
                  disabled={!!result || pending}
                  onClick={() => {
                    setTyped(opt);
                    submit(opt);
                  }}
                  className="rounded-lg border p-3 text-left transition-colors disabled:cursor-default"
                  style={{
                    borderColor: isAnswer
                      ? "var(--color-known-500)"
                      : isPicked
                        ? "var(--color-unknown-500)"
                        : "var(--border)",
                    background: isAnswer
                      ? "color-mix(in srgb, var(--color-known-500) 14%, transparent)"
                      : isPicked
                        ? "color-mix(in srgb, var(--color-unknown-500) 14%, transparent)"
                        : "var(--surface-2)",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        )}

        {/* Fill in the blank */}
        {ex.type === "FILL_BLANK" && (
          <form
            className="mt-5 flex flex-wrap gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              submit(typed);
            }}
          >
            <input
              className="input max-w-xs flex-1"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              disabled={!!result || pending}
              placeholder="Type your answer"
              autoFocus
              autoComplete="off"
            />
            {!result && (
              <button className="btn btn-primary" type="submit" disabled={pending || !typed.trim()}>
                Check
              </button>
            )}
          </form>
        )}

        {/* Sentence builder */}
        {ex.type === "SENTENCE_BUILD" && ex.options && (
          <div className="mt-5">
            <div
              className="flex min-h-14 flex-wrap items-center gap-2 rounded-lg p-3"
              style={{ background: "var(--surface-2)" }}
            >
              {tiles.length === 0 && <span className="muted text-sm">Tap the words in order…</span>}
              {tiles.map((t, i) => (
                <button
                  key={`${t}-${i}`}
                  className="pill"
                  data-active="true"
                  disabled={!!result}
                  onClick={() => setTiles(tiles.filter((_, j) => j !== i))}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {remainingTiles.map((t, i) => (
                <button
                  key={`${t}-${i}`}
                  className="pill"
                  disabled={!!result}
                  onClick={() => setTiles([...tiles, t])}
                >
                  {t}
                </button>
              ))}
            </div>

            {!result && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  className="btn btn-primary"
                  disabled={tiles.length === 0 || pending}
                  onClick={() => submit(tiles.join(" "))}
                >
                  Check
                </button>
                <button className="btn btn-ghost" onClick={() => setTiles([])} disabled={pending}>
                  Clear
                </button>
              </div>
            )}
          </div>
        )}

        {/* Feedback */}
        {result && (
          <div
            className="mt-5 rounded-lg p-4"
            style={{
              background: result.correct
                ? "color-mix(in srgb, var(--color-known-500) 12%, transparent)"
                : "color-mix(in srgb, var(--color-unknown-500) 12%, transparent)",
            }}
          >
            <div
              className="font-medium"
              style={{
                color: result.correct ? "var(--color-known-500)" : "var(--color-unknown-500)",
              }}
            >
              {result.correct ? "Richtig!" : `Not quite — the answer is “${result.answer}”`}
            </div>
            <p className="muted mt-1.5 text-sm">{result.explanation}</p>
            <button className="btn btn-primary mt-4" onClick={next} autoFocus>
              {index + 1 === exercises.length ? "See results" : "Next"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
