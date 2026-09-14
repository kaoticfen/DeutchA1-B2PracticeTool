"use client";

import { useActionState, useState } from "react";
import { updateLevelSettings } from "@/lib/actions/profile-actions";
import { LEVELS, LEVEL_LABELS, type LevelName } from "@/lib/levels";

export function LevelSettingsForm({
  currentLevel,
  levelMode,
}: {
  currentLevel: LevelName;
  levelMode: "AUTO" | "MANUAL";
}) {
  const [state, formAction, pending] = useActionState(updateLevelSettings, null);
  const [level, setLevel] = useState<LevelName>(currentLevel);
  const [mode, setMode] = useState(levelMode);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="level" value={level} />
      <input type="hidden" name="levelMode" value={mode} />

      <div>
        <span className="mb-2 block text-sm font-medium">Current level</span>
        <div className="grid gap-2 sm:grid-cols-2">
          {LEVELS.map((l) => (
            <button
              type="button"
              key={l}
              onClick={() => setLevel(l)}
              className="rounded-lg border p-3 text-left text-sm transition-colors"
              style={{
                background:
                  level === l
                    ? "color-mix(in srgb, var(--color-brand-500) 16%, transparent)"
                    : "var(--surface-2)",
                borderColor: level === l ? "var(--color-brand-500)" : "transparent",
              }}
            >
              {LEVEL_LABELS[l]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-medium">Level progression</span>
        <div className="space-y-2">
          {(
            [
              ["AUTO", "Automatic", "Promote me when I hit 80% vocabulary mastery and 80% exercise accuracy."],
              ["MANUAL", "Manual", "Never change my level automatically — I'll set it myself."],
            ] as const
          ).map(([value, title, desc]) => (
            <button
              type="button"
              key={value}
              onClick={() => setMode(value)}
              className="block w-full rounded-lg border p-3 text-left transition-colors"
              style={{
                background:
                  mode === value
                    ? "color-mix(in srgb, var(--color-brand-500) 16%, transparent)"
                    : "var(--surface-2)",
                borderColor: mode === value ? "var(--color-brand-500)" : "transparent",
              }}
            >
              <div className="text-sm font-medium">{title}</div>
              <div className="muted mt-0.5 text-xs">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        {state && "ok" in state && state.ok && <span className="muted text-sm">Saved.</span>}
        {state && "error" in state && state.error && (
          <span className="text-sm text-[var(--color-unknown-500)]">{state.error}</span>
        )}
      </div>
    </form>
  );
}
