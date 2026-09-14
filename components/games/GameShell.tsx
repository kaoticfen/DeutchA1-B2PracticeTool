"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export function GameResult({
  score,
  total,
  onReplay,
  extra,
}: {
  score: number;
  total: number;
  onReplay: () => void;
  extra?: React.ReactNode;
}) {
  const router = useRouter();
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="surface p-8 text-center">
      <div className="text-3xl" aria-hidden>
        {pct >= 80 ? "★" : pct >= 50 ? "✓" : "↻"}
      </div>
      <h2 className="mt-3 text-2xl font-semibold">
        {score} / {total}
      </h2>
      <p className="muted mt-1 text-sm">{pct}% this round.</p>
      {extra}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          className="btn btn-primary"
          onClick={() => {
            onReplay();
            router.refresh();
          }}
        >
          Play again
        </button>
        <Link href="/games" className="btn btn-ghost">
          All games
        </Link>
      </div>
    </div>
  );
}

export function GameProgress({ index, total }: { index: number; total: number }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${(index / total) * 100}%`, background: "var(--color-brand-500)" }}
        />
      </div>
      <span className="muted shrink-0 text-xs">
        {Math.min(index + 1, total)} / {total}
      </span>
    </div>
  );
}
