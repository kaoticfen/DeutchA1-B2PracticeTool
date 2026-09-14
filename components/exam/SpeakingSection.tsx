"use client";

import { useState } from "react";
import { recordExamAttempt } from "@/lib/actions/exam-actions";
import { SpeakButton } from "@/components/SpeakButton";

/**
 * Speaking is record-and-self-assess. Automated pronunciation scoring is out of
 * scope for a fully local app, so the value here is structure and prompts.
 */
export function SpeakingSection({
  examItemId,
  task,
  prompts,
  tips,
}: {
  examItemId: number;
  task: string;
  prompts: string[];
  tips: string[];
}) {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [timer, setTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [saved, setSaved] = useState(false);

  function toggle() {
    if (running) {
      if (timer) clearInterval(timer);
      setTimer(null);
      setRunning(false);
    } else {
      setSeconds(0);
      setRunning(true);
      setTimer(setInterval(() => setSeconds((s) => s + 1), 1000));
    }
  }

  async function selfAssess(score: number) {
    await recordExamAttempt({ examItemId, score, total: 3, detail: { seconds } });
    setSaved(true);
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <>
      <div className="surface p-5">
        <h2 className="text-sm font-medium">Task</h2>
        <p className="mt-2">{task}</p>
        <div className="mt-3">
          <SpeakButton text={task} label="Hear the task" />
        </div>
      </div>

      <div className="surface mt-4 p-5">
        <h2 className="mb-3 text-sm font-medium">Work through these</h2>
        <ol className="space-y-2 text-sm">
          {prompts.map((p, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs"
                style={{ background: "var(--surface-2)" }}
              >
                {i + 1}
              </span>
              <span className="flex-1">{p}</span>
              <SpeakButton text={p} label="" className="btn btn-ghost px-2 py-0.5 text-xs" />
            </li>
          ))}
        </ol>
      </div>

      <div className="surface mt-4 p-5 text-center">
        <div className="font-mono text-4xl tabular-nums">
          {mm}:{ss}
        </div>
        <p className="muted mt-1 text-sm">Speak out loud — time yourself.</p>
        <button className="btn btn-primary mt-4" onClick={toggle}>
          {running ? "Stop" : "Start speaking"}
        </button>
      </div>

      <div className="surface mt-4 p-5">
        <h2 className="mb-2 text-sm font-medium">Tips</h2>
        <ul className="muted list-disc space-y-1 pl-5 text-sm">
          {tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="surface mt-4 p-5">
        <h2 className="text-sm font-medium">How did it go?</h2>
        <p className="muted mt-1 text-sm">
          There is no automatic pronunciation grader here — this is your own honest assessment.
        </p>
        {saved ? (
          <p className="mt-4 text-sm" style={{ color: "var(--color-known-500)" }}>
            Recorded. ✓
          </p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {[
              [3, "Fluent", "Spoke freely, covered everything"],
              [2, "Hesitant", "Got through it with pauses"],
              [1, "Struggled", "Ran out of words"],
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
  );
}
