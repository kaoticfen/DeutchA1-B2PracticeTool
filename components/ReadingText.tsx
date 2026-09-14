"use client";

import { useState } from "react";
import { SpeakButton } from "@/components/SpeakButton";
import { speak } from "@/lib/speech";

type Question = { prompt: string; options: string[]; answer: string };

/**
 * Tap-to-translate reading. Words are looked up in the text's own glossary,
 * which is seeded alongside it — no network round trip per tap.
 */
export function ReadingText({
  body,
  glossary,
  questions,
}: {
  body: string;
  glossary: Record<string, string>;
  questions: Question[];
}) {
  const [selected, setSelected] = useState<{ word: string; gloss: string | null } | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);

  // Case-insensitive glossary index, so "Der Hund" finds "hund".
  const index = new Map(Object.entries(glossary).map(([k, v]) => [k.toLowerCase(), v]));

  function lookup(raw: string) {
    const clean = raw.replace(/[.,!?;:„""»«()]/g, "");
    if (!clean) return;

    const gloss =
      index.get(clean.toLowerCase()) ??
      // Try the glossary's multi-word keys that contain this word.
      [...index.entries()].find(([k]) => k.split(/\s+/).includes(clean.toLowerCase()))?.[1] ??
      null;

    setSelected({ word: clean, gloss });
    speak(clean);
  }

  const score = questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);

  return (
    <>
      <article className="surface p-5 sm:p-7">
        <p className="muted mb-4 text-xs">Tap any word to hear it and see its meaning.</p>

        <div className="space-y-4 text-lg leading-relaxed">
          {body.split(/\n\n+/).map((para, pi) => (
            <p key={pi}>
              {para.split(/(\s+)/).map((token, ti) =>
                /^\s+$/.test(token) ? (
                  token
                ) : (
                  <button
                    key={ti}
                    onClick={() => lookup(token)}
                    className="rounded px-0.5 transition-colors hover:bg-[color-mix(in_srgb,var(--color-brand-500)_25%,transparent)]"
                  >
                    {token}
                  </button>
                ),
              )}
            </p>
          ))}
        </div>
      </article>

      {selected && (
        <div
          className="surface sticky bottom-4 mt-4 flex flex-wrap items-center justify-between gap-3 p-4"
          style={{ borderColor: "var(--color-brand-500)" }}
        >
          <div>
            <div className="font-medium">{selected.word}</div>
            <div className="muted text-sm">
              {selected.gloss ?? "Not in this text's glossary — try the dictionary."}
            </div>
          </div>
          <div className="flex gap-2">
            <SpeakButton text={selected.word} label="" className="btn btn-ghost px-3 py-1.5" />
            <a
              href={`/dictionary?q=${encodeURIComponent(selected.word)}`}
              className="btn btn-ghost px-3 py-1.5 text-sm"
            >
              Look up
            </a>
            <button className="btn btn-ghost px-3 py-1.5 text-sm" onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <section className="mt-6">
        <h2 className="mb-3 font-medium">Comprehension</h2>
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={i} className="surface p-4">
              <p className="font-medium">{q.prompt}</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((opt) => {
                  const picked = answers[i] === opt;
                  const isAnswer = checked && opt === q.answer;
                  const isWrong = checked && picked && opt !== q.answer;

                  return (
                    <button
                      key={opt}
                      disabled={checked}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: opt }))}
                      className="rounded-lg border p-2.5 text-left text-sm transition-colors"
                      style={{
                        borderColor: isAnswer
                          ? "var(--color-known-500)"
                          : isWrong
                            ? "var(--color-unknown-500)"
                            : picked
                              ? "var(--color-brand-500)"
                              : "var(--border)",
                        background: isAnswer
                          ? "color-mix(in srgb, var(--color-known-500) 14%, transparent)"
                          : isWrong
                            ? "color-mix(in srgb, var(--color-unknown-500) 14%, transparent)"
                            : picked
                              ? "color-mix(in srgb, var(--color-brand-500) 14%, transparent)"
                              : "var(--surface-2)",
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {!checked ? (
            <button
              className="btn btn-primary"
              disabled={Object.keys(answers).length < questions.length}
              onClick={() => setChecked(true)}
            >
              Check answers
            </button>
          ) : (
            <>
              <span className="font-medium">
                {score} / {questions.length} correct
              </span>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setAnswers({});
                  setChecked(false);
                }}
              >
                Try again
              </button>
            </>
          )}
        </div>
      </section>
    </>
  );
}
