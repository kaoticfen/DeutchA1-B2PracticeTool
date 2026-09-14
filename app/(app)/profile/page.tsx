import { PageHeader } from "@/components/PageHeader";
import { ProgressRing } from "@/components/ProgressRing";
import { LevelSettingsForm } from "@/components/LevelSettingsForm";
import { ResetProgressButton } from "@/components/ResetProgressButton";
import { requireUser } from "@/lib/session";
import { levelProgress, streakFor, vocabBreakdown } from "@/lib/stats";
import { LEVELS, LEVEL_LABELS, nextLevel, type LevelName } from "@/lib/levels";

export default async function ProfilePage() {
  const user = await requireUser();
  const level = user.currentLevel as LevelName;

  const [progress, vocab, streak] = await Promise.all([
    levelProgress(user.id, level),
    vocabBreakdown(user.id),
    streakFor(user.id),
  ]);

  const up = nextLevel(level);
  const journey = LEVELS.indexOf(level) / (LEVELS.length - 1);

  return (
    <>
      <PageHeader title={user.name} subtitle={user.email} />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="mb-4 font-medium">Where you are</h2>
          <div className="text-3xl font-semibold">{LEVEL_LABELS[level]}</div>

          <div className="mt-5">
            <div className="muted mb-2 flex justify-between text-xs">
              <span>A1</span>
              <span>Goal: B2</span>
            </div>
            <div className="flex h-2.5 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
              <div
                className="rounded-full"
                style={{ width: `${journey * 100}%`, background: "var(--color-brand-500)" }}
              />
            </div>
            <div className="mt-2 flex justify-between">
              {LEVELS.map((l) => (
                <span
                  key={l}
                  className="text-xs"
                  style={{
                    color:
                      LEVELS.indexOf(l) <= LEVELS.indexOf(level)
                        ? "var(--color-brand-500)"
                        : "var(--text-muted)",
                    fontWeight: l === level ? 600 : 400,
                  }}
                >
                  {l}
                </span>
              ))}
            </div>
          </div>

          <div className="muted mt-5 grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                {vocab.known}
              </div>
              words known
            </div>
            <div>
              <div className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                {streak.current}
              </div>
              day streak
            </div>
            <div>
              <div className="text-xl font-semibold" style={{ color: "var(--text)" }}>
                {streak.longest}
              </div>
              longest streak
            </div>
          </div>
        </section>

        <section className="surface p-5">
          <h2 className="mb-4 font-medium">Progress toward {up ?? "B2 mastery"}</h2>
          <ProgressRing
            value={progress.overall}
            label={up ? `${level} → ${up}` : "B2 reached"}
            sublabel={
              user.levelMode === "MANUAL"
                ? "Automatic promotion is off"
                : progress.eligible
                  ? "Ready to promote on your next review"
                  : "Keep going"
            }
          />
          <ul className="muted mt-4 space-y-1.5 text-xs">
            <li>
              {progress.vocabMet ? "✓" : "○"} {Math.round(progress.vocabRatio * 100)}% of {level}{" "}
              vocabulary known (need 80%)
            </li>
            <li>
              {progress.accuracyMet ? "✓" : "○"} {Math.round(progress.accuracyRatio * 100)}%
              exercise accuracy (need 80%)
            </li>
            <li>
              {progress.attemptsMet ? "✓" : "○"} {progress.attempts} exercise attempts (need 20)
            </li>
          </ul>
        </section>
      </div>

      <section className="surface mt-4 p-5">
        <h2 className="mb-4 font-medium">Settings</h2>
        <LevelSettingsForm currentLevel={level} levelMode={user.levelMode} />
      </section>

      <section className="surface mt-4 p-5">
        <h2 className="mb-1 font-medium">Danger zone</h2>
        <p className="muted mb-4 text-sm">This cannot be undone.</p>
        <ResetProgressButton />
      </section>
    </>
  );
}
