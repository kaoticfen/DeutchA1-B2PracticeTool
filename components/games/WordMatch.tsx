"use client";

import { useEffect, useMemo, useState } from "react";
import { finishGame } from "@/lib/actions/game-actions";
import { GameResult } from "./GameShell";
import type { MatchPair } from "@/lib/games";

type Side = "de" | "en";
type Pick = { side: Side; id: number } | null;

export function WordMatch({ pairs }: { pairs: MatchPair[] }) {
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [picked, setPicked] = useState<Pick>(null);
  const [mistakes, setMistakes] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [saved, setSaved] = useState(false);

  // Shuffle the English column independently so the rows never line up.
  const englishOrder = useMemo(() => [...pairs].sort(() => Math.random() - 0.5), [pairs]);

  const done = matched.size === pairs.length && pairs.length > 0;

  useEffect(() => {
    if (!done || saved) return;
    setSaved(true);
    finishGame({
      game: "WORD_MATCH",
      score: Math.max(0, pairs.length - mistakes),
      total: pairs.length,
      durationMs: Date.now() - startedAt,
    });
  }, [done, saved, pairs.length, mistakes, startedAt]);

  function choose(side: Side, id: number) {
    if (matched.has(id)) return;

    if (!picked || picked.side === side) {
      setPicked({ side, id });
      return;
    }

    if (picked.id === id) {
      setMatched((m) => new Set(m).add(id));
    } else {
      setMistakes((n) => n + 1);
      setWrong(id);
      setTimeout(() => setWrong(null), 450);
    }
    setPicked(null);
  }

  if (done) {
    return (
      <GameResult
        score={Math.max(0, pairs.length - mistakes)}
        total={pairs.length}
        onReplay={() => {
          setMatched(new Set());
          setMistakes(0);
          setSaved(false);
          setStartedAt(Date.now());
        }}
        extra={
          <p className="muted mt-2 text-sm">
            {mistakes} wrong attempt{mistakes === 1 ? "" : "s"}.
          </p>
        }
      />
    );
  }

  const tile = (id: number, label: string, side: Side) => {
    const isMatched = matched.has(id);
    const isPicked = picked?.side === side && picked.id === id;
    const isWrong = wrong === id;

    return (
      <button
        key={`${side}-${id}`}
        disabled={isMatched}
        onClick={() => choose(side, id)}
        className="w-full rounded-lg border p-3 text-left text-sm transition-all disabled:opacity-40"
        style={{
          borderColor: isWrong
            ? "var(--color-unknown-500)"
            : isMatched
              ? "var(--color-known-500)"
              : isPicked
                ? "var(--color-brand-500)"
                : "var(--border)",
          background: isMatched
            ? "color-mix(in srgb, var(--color-known-500) 14%, transparent)"
            : isPicked
              ? "color-mix(in srgb, var(--color-brand-500) 16%, transparent)"
              : "var(--surface-2)",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div>
      <p className="muted mb-4 text-sm">
        Tap a German word, then its English meaning. {matched.size}/{pairs.length} matched.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <div className="muted text-xs font-medium uppercase tracking-wide">Deutsch</div>
          {pairs.map((p) => tile(p.id, p.de, "de"))}
        </div>
        <div className="space-y-2">
          <div className="muted text-xs font-medium uppercase tracking-wide">English</div>
          {englishOrder.map((p) => tile(p.id, p.en, "en"))}
        </div>
      </div>
    </div>
  );
}
