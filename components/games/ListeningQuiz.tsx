"use client";

import { useEffect, useState } from "react";
import { finishGame } from "@/lib/actions/game-actions";
import { GameProgress, GameResult } from "./GameShell";
import { SPEECH_HINT, speak, speechStatus, type SpeechStatus } from "@/lib/speech";
import type { ListeningRound } from "@/lib/games";

export function ListeningQuiz({ rounds }: { rounds: ListeningRound[] }) {
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState<{ prompt: string; expected: string; given: string }[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<SpeechStatus>("ready");

  const round = rounds[index];
  const done = index >= rounds.length;

  useEffect(() => {
    const update = () => setStatus(speechStatus());
    update();
    window.speechSynthesis?.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", update);
  }, []);

  // Speak each new word automatically — the whole point of the game.
  useEffect(() => {
    if (round && status !== "unsupported") speak(round.lemma);
  }, [round?.id, status]);

  function choose(option: string) {
    if (picked) return;
    setPicked(option);

    if (option === round.lemma) setScore((s) => s + 1);
    else setMistakes((m) => [...m, { prompt: "Heard word", expected: round.lemma, given: option }]);
  }

  function next() {
    if (index + 1 >= rounds.length) {
      finishGame({
        game: "LISTENING_QUIZ",
        score,
        total: rounds.length,
        durationMs: Date.now() - startedAt,
        mistakes,
      });
    }
    setPicked(null);
    setIndex((i) => i + 1);
  }

  if (status === "unsupported") {
    return (
      <div className="surface p-8 text-center">
        <p className="muted text-sm">{SPEECH_HINT.unsupported}</p>
      </div>
    );
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

      {status === "no-german-voice" && (
        <p
          className="surface mb-4 p-3 text-xs"
          style={{ borderColor: "var(--color-shaky-500)" }}
        >
          {SPEECH_HINT["no-german-voice"]}
        </p>
      )}

      <div className="surface p-8 text-center">
        <div className="muted text-sm">What did you hear?</div>

        <button className="btn btn-primary mt-5 px-8 py-4 text-lg" onClick={() => speak(round.lemma)}>
          <span aria-hidden>♪</span> Play again
        </button>
        <button
          className="btn btn-ghost mt-3 block mx-auto text-xs"
          onClick={() => speak(round.lemma, { rate: 0.55 })}
        >
          Play slowly
        </button>

        <div className="mt-8 grid gap-2 sm:grid-cols-2">
          {round.options.map((opt) => {
            const isAnswer = picked && opt === round.lemma;
            const isWrongPick = picked === opt && opt !== round.lemma;

            return (
              <button
                key={opt}
                disabled={!!picked}
                onClick={() => choose(opt)}
                className="rounded-lg border p-3 transition-colors disabled:cursor-default"
                style={{
                  borderColor: isAnswer
                    ? "var(--color-known-500)"
                    : isWrongPick
                      ? "var(--color-unknown-500)"
                      : "var(--border)",
                  background: isAnswer
                    ? "color-mix(in srgb, var(--color-known-500) 14%, transparent)"
                    : isWrongPick
                      ? "color-mix(in srgb, var(--color-unknown-500) 14%, transparent)"
                      : "var(--surface-2)",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {picked && (
          <div className="mt-6">
            <p className="text-sm">
              {picked === round.lemma ? "Richtig!" : `It was “${round.lemma}”`}
              {round.translation && <span className="muted"> — {round.translation}</span>}
            </p>
            <button className="btn btn-primary mt-4" onClick={next} autoFocus>
              {index + 1 >= rounds.length ? "See results" : "Next"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
