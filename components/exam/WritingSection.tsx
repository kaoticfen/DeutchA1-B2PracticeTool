"use client";

import { useEffect, useState } from "react";
import { recordExamAttempt } from "@/lib/actions/exam-actions";

const DRAFT_KEY = (id: number) => `exam-writing-${id}`;

/**
 * Writing is self-assessed: there is no automated grader, so the learner
 * compares against a model answer and marks themselves. Drafts persist locally
 * so a refresh doesn't lose work.
 */
export function WritingSection({
  examItemId,
  task,
  minWords,
  hints,
  modelAnswer,
}: {
  examItemId: number;
  task: string;
  minWords: number;
  hints: string[];
  modelAnswer: string;
}) {
  const [text, setText] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setText(window.localStorage.getItem(DRAFT_KEY(examItemId)) ?? "");
  }, [examItemId]);

  useEffect(() => {
    if (text) window.localStorage.setItem(DRAFT_KEY(examItemId), text);
  }, [text, examItemId]);

  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const metLength = words >= minWords;

  async function selfAssess(score: number) {
    await recordExamAttempt({
      examItemId,
      score,
      total: 3,
      detail: { words, text: text.slice(0, 4000) },
    });
    setSaved(true);
  }

  return (
    <>
      <div className="surface p-5">
        <h2 className="text-sm font-medium">Task</h2>
        <p className="mt-2">{task}</p>

        <h3 className="mt-4 text-sm font-medium">Cover these points</h3>
        <ul className="muted mt-2 list-disc space-y-1 pl-5 text-sm">
          {hints.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>

        <p className="muted mt-4 text-sm">
          Minimum length: <strong>{minWords} words</strong>
        </p>
      </div>

      <div className="surface mt-4 p-5">
        <label className="mb-2 block text-sm font-medium" htmlFor="answer">
          Your answer
        </label>
        <textarea
          id="answer"
          className="input min-h-64 resize-y font-[inherit]"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Schreiben Sie hier…"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span style={{ color: metLength ? "var(--color-known-500)" : "var(--text-muted)" }}>
            {words} word{words === 1 ? "" : "s"} {metLength ? "✓" : `(need ${minWords})`}
          </span>
          <span className="muted">Saved locally as you type.</span>
        </div>
      </div>

      {!revealed ? (
        <button
          className="btn btn-primary mt-4"
          disabled={words === 0}
          onClick={() => setRevealed(true)}
        >
          Compare with a model answer
        </button>
      ) : (
        <>
          <div className="surface mt-4 p-5">
            <h2 className="mb-3 text-sm font-medium">Model answer</h2>
            <p className="whitespace-pre-line leading-relaxed">{modelAnswer}</p>
          </div>

          <div className="surface mt-4 p-5">
            <h2 className="text-sm font-medium">How did yours compare?</h2>
            <p className="muted mt-1 text-sm">
              There is no automatic grader for writing — be honest, it only affects your own
              progress data.
            </p>
            {saved ? (
              <p className="mt-4 text-sm" style={{ color: "var(--color-known-500)" }}>
                Recorded. ✓
              </p>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {[
                  [3, "Strong", "Covered every point, few errors"],
                  [2, "Okay", "Covered most points, some errors"],
                  [1, "Weak", "Missed points or many errors"],
                ].map(([score, label, desc]) => (
                  <button
                    key={label as string}
                    className="rounded-lg border p-3 text-left text-sm"
                    style={{ background: "var(--surface-2)" }}
                    onClick={() => selfAssess(score as number)}
                  >
                    <div className="font-medium">{label as string}</div>
                    <div className="muted mt-0.5 text-xs">{desc as string}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
