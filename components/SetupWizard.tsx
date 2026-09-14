"use client";

import { useActionState, useMemo, useState } from "react";
import { createFirstAccount, type FormState } from "@/lib/actions/auth-actions";
import { PLACEMENT_QUESTIONS } from "@/lib/placement";
import { scorePlacement } from "@/lib/leveling";
import { LEVELS, LEVEL_LABELS, type LevelName } from "@/lib/levels";

type Step = "account" | "placement" | "confirm";

export function SetupWizard() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(createFirstAccount, null);

  const [step, setStep] = useState<Step>("account");
  const [account, setAccount] = useState({ name: "", email: "", password: "", confirm: "" });
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [level, setLevel] = useState<LevelName>("A1");
  const [tookQuiz, setTookQuiz] = useState(false);

  const accountValid =
    account.name.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(account.email) &&
    account.password.length >= 8 &&
    account.password === account.confirm;

  const suggested = useMemo(() => {
    const perLevel = Object.fromEntries(
      LEVELS.map((l) => [l, { correct: 0, total: 0 }]),
    ) as Record<LevelName, { correct: number; total: number }>;

    PLACEMENT_QUESTIONS.forEach((q, i) => {
      if (answers[i] === undefined) return;
      perLevel[q.level].total += 1;
      if (answers[i] === q.answer) perLevel[q.level].correct += 1;
    });

    return scorePlacement(perLevel);
  }, [answers]);

  const answeredCount = Object.keys(answers).length;

  function finishQuiz() {
    setLevel(suggested);
    setTookQuiz(true);
    setStep("confirm");
  }

  return (
    <div className="surface w-full max-w-2xl p-6 sm:p-8">
      <StepHeader step={step} />

      {step === "account" && (
        <div className="mt-6 space-y-4">
          <Field label="Your name">
            <input
              className="input"
              value={account.name}
              onChange={(e) => setAccount({ ...account, name: e.target.value })}
              placeholder="Chris"
              autoComplete="name"
            />
          </Field>
          <Field label="Email">
            <input
              className="input"
              type="email"
              value={account.email}
              onChange={(e) => setAccount({ ...account, email: e.target.value })}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Password" hint="At least 8 characters">
              <input
                className="input"
                type="password"
                value={account.password}
                onChange={(e) => setAccount({ ...account, password: e.target.value })}
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm password">
              <input
                className="input"
                type="password"
                value={account.confirm}
                onChange={(e) => setAccount({ ...account, confirm: e.target.value })}
                autoComplete="new-password"
              />
            </Field>
          </div>
          {account.confirm.length > 0 && account.password !== account.confirm && (
            <p className="text-sm text-[var(--color-unknown-500)]">Passwords do not match.</p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              className="btn btn-primary"
              disabled={!accountValid}
              onClick={() => setStep("placement")}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === "placement" && (
        <div className="mt-6 space-y-6">
          <p className="muted text-sm">
            Answer what you can and skip the rest — we use this only to pick a starting point, and
            you can change your level at any time.
          </p>

          <div className="space-y-5">
            {PLACEMENT_QUESTIONS.map((q, i) => (
              <div key={i} className="rounded-lg p-4" style={{ background: "var(--surface-2)" }}>
                <div className="mb-3 flex items-center gap-2">
                  <span className="pill text-xs" data-active="true">
                    {q.level}
                  </span>
                  <span className="font-medium">{q.prompt}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      className="pill"
                      data-active={answers[i] === oi}
                      onClick={() =>
                        setAnswers((prev) => {
                          const next = { ...prev };
                          if (next[i] === oi) delete next[i];
                          else next[i] = oi;
                          return next;
                        })
                      }
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn btn-primary" onClick={finishQuiz} disabled={answeredCount === 0}>
              Score my placement
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setTookQuiz(false);
                setStep("confirm");
              }}
            >
              Skip — start at A1
            </button>
            <span className="muted text-sm">
              {answeredCount} of {PLACEMENT_QUESTIONS.length} answered
            </span>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <form action={formAction} className="mt-6 space-y-5">
          <input type="hidden" name="name" value={account.name} />
          <input type="hidden" name="email" value={account.email} />
          <input type="hidden" name="password" value={account.password} />
          <input type="hidden" name="confirm" value={account.confirm} />
          <input type="hidden" name="level" value={level} />

          <p className="muted text-sm">
            {tookQuiz
              ? `Based on your answers we suggest starting at ${level}. Adjust it if that feels wrong.`
              : "You skipped the placement quiz, so we'll start at A1. Pick a different level if you already know some German."}
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {LEVELS.map((l) => (
              <button
                type="button"
                key={l}
                onClick={() => setLevel(l)}
                className="rounded-lg border p-3 text-left transition-colors"
                style={{
                  background: level === l ? "color-mix(in srgb, var(--color-brand-500) 16%, transparent)" : "var(--surface-2)",
                  borderColor: level === l ? "var(--color-brand-500)" : "transparent",
                }}
              >
                <div className="font-medium">{LEVEL_LABELS[l]}</div>
              </button>
            ))}
          </div>

          {state?.error && (
            <p className="text-sm text-[var(--color-unknown-500)]" role="alert">
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button className="btn btn-primary" type="submit" disabled={pending}>
              {pending ? "Creating account…" : "Create account & start"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setStep("placement")}>
              Back
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function StepHeader({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "account", label: "Account" },
    { id: "placement", label: "Placement" },
    { id: "confirm", label: "Level" },
  ];
  const activeIndex = steps.findIndex((s) => s.id === step);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Welcome — let's set up your account</h1>
      <p className="muted mt-1 text-sm">This runs once, the first time the app starts.</p>
      <div className="mt-5 flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-2">
            <div
              className="h-1.5 flex-1 rounded-full transition-colors"
              style={{
                background: i <= activeIndex ? "var(--color-brand-500)" : "var(--surface-2)",
              }}
            />
          </div>
        ))}
      </div>
      <div className="muted mt-2 text-xs">
        Step {activeIndex + 1} of {steps.length} · {steps[activeIndex].label}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="muted mt-1 block text-xs">{hint}</span>}
    </label>
  );
}
