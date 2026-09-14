"use client";

import { useState } from "react";
import { finishGame } from "@/lib/actions/game-actions";
import { GameProgress, GameResult } from "./GameShell";
import type { GenderRound } from "@/lib/games";

const ARTICLES = ["der", "die", "das"] as const;

export function GenderBattle({ rounds }: { rounds: GenderRound[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<{ prompt: string; expected: string; given: string }[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const round = rounds[index];
  const done = index >= rounds.length;

  function choose(article: string) {
    if (picked) return;
    setPicked(article);

    if (article === round.answer) {
      setScore((s) => s + 1);
    } else {
      setMistakes((m) => [...m, { prompt: round.lemma, expected: round.answer, given: article }]);
    }
  }

  function next() {
    const isLast = index + 1 >= rounds.length;
    if (isLast) {
      finishGame({
        game: "GENDER_BATTLE",
        score,
        total: rounds.length,
        durationMs: Date.now() - startedAt,
        mistakes,
      });
    }
    setPicked(null);
    setIndex((i) => i + 1);
  }

  if (done) {
    return (
      <GameResult
        score={score}
        total={rounds.length}
        onReplay={() => {
          setIndex(0);
          setScore(0);
          setPicked(null);
          setMistakes([]);
          setStartedAt(Date.now());
        }}
      />
    );
  }

  return (
    <div>
      <GameProgress index={index} total={rounds.length} />

      <div className="surface p-8 text-center sm:p-12">
        <div className="muted text-sm">Which article?</div>
        <div className="mt-3 text-4xl font-semibold sm:text-5xl">{round.lemma}</div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {ARTICLES.map((a) => {
            const isAnswer = picked && a === round.answer;
            const isWrongPick = picked === a && a !== round.answer;

            return (
              <button
                key={a}
                disabled={!!picked}
                onClick={() => choose(a)}
                className="rounded-lg border-2 py-5 text-xl font-medium transition-colors disabled:cursor-default"
                style={{
                  borderColor: isAnswer
                    ? "var(--color-known-500)"
                    : isWrongPick
                      ? "var(--color-unknown-500)"
                      : "var(--border)",
                  background: isAnswer
                    ? "color-mix(in srgb, var(--color-known-500) 16%, transparent)"
                    : isWrongPick
                      ? "color-mix(in srgb, var(--color-unknown-500) 16%, transparent)"
                      : "var(--surface-2)",
                }}
              >
                {a}
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="mt-6">
            <p className="text-sm">
              {picked === round.answer ? "Richtig!" : `It's ${round.answer} ${round.lemma}.`}{" "}
              <span className="muted">Plural: die {round.plural}</span>
            </p>
            <button className="btn btn-primary mt-4" onClick={next} autoFocus>
              {index + 1 >= rounds.length ? "See results" : "Next"}
            </button>
          </div>
        )}
      </div>

      <p className="muted mt-4 text-center text-sm">
        Score: {score} / {index + (picked ? 1 : 0)}
      </p>
    </div>
  );
}
