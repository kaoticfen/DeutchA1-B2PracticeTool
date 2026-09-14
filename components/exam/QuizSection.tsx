"use client";

import { useState } from "react";
import { recordExamAttempt } from "@/lib/actions/exam-actions";
import { SpeakButton } from "@/components/SpeakButton";

type Question = { prompt: string; options: string[]; answer: string };

/**
 * Shared runner for the Reading, Listening and Comprehension sections — they
 * differ only in whether the source material is shown or spoken.
 */
export function QuizSection({
  examItemId,
  text,
  script,
  questions,
}: {
  examItemId: number;
  text?: string;
  script?: string;
  questions: Question[];
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const score = questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const allAnswered = Object.keys(answers).length === questions.length;

  async function submit() {
    setSaving(true);
    await recordExamAttempt({
      examItemId,
      score,
      total: questions.length,
      mistakes: questions
        .map((q, i) => ({ prompt: q.prompt, expected: q.answer, given: answers[i] ?? "" }))
        .filter((m) => m.given !== m.expected),
    });
    setSubmitted(true);
    setSaving(false);
  }

  return (
    <>
      {script && (
        <div className="surface mb-5 p-5">
          <h2 className="mb-3 text-sm font-medium">Listen</h2>
          <div className="flex flex-wrap gap-2">
            <SpeakButton text={script} label="Play recording" />
            <SpeakButton text={script} label="Play slowly" rate={0.6} className="btn btn-ghost" />
          </div>
          {submitted ? (
            <details className="mt-4">
              <summary className="muted cursor-pointer text-sm">Show transcript</summary>
              <p className="mt-2 whitespace-pre-line text-sm">{script}</p>
            </details>
          ) : (
            <p className="muted mt-3 text-xs">
              The transcript stays hidden until you submit — play it as often as you need.
            </p>
          )}
        </div>
      )}

      {text && (
        <article className="surface mb-5 whitespace-pre-line p-5 leading-relaxed sm:p-7">
          {text}
        </article>
      )}

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="surface p-4">
            <p className="font-medium">
              {i + 1}. {q.prompt}
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {q.options.map((opt) => {
                const picked = answers[i] === opt;
                const isAnswer = submitted && opt === q.answer;
                const isWrong = submitted && picked && opt !== q.answer;

                return (
                  <button
                    key={opt}
                    disabled={submitted}
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

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {!submitted ? (
          <button className="btn btn-primary" disabled={!allAnswered || saving} onClick={submit}>
            {saving ? "Saving…" : `Submit (${Object.keys(answers).length}/${questions.length})`}
          </button>
        ) : (
          <>
            <span className="text-lg font-semibold">
              {score} / {questions.length}
            </span>
            <span className="muted text-sm">
              {Math.round((score / questions.length) * 100)}% — recorded in your progress.
            </span>
          </>
        )}
      </div>
    </>
  );
}
