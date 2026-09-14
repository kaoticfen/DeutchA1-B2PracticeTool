import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { WordMatch } from "@/components/games/WordMatch";
import { GenderBattle } from "@/components/games/GenderBattle";
import { ListeningQuiz } from "@/components/games/ListeningQuiz";
import { ExerciseRunner } from "@/components/ExerciseRunner";
import { requireUser } from "@/lib/session";
import {
  GAME_BY_SLUG,
  GAME_META,
  genderBattleRound,
  listeningRound,
  wordMatchRound,
} from "@/lib/games";
import { pickExercises } from "@/lib/exercises";
import { isLevel } from "@/lib/levels";
import type { Level } from "@prisma/client";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ game: string }>;
  searchParams: Promise<{ level?: string }>;
}) {
  const user = await requireUser();
  const { game: slug } = await params;
  const sp = await searchParams;

  const key = GAME_BY_SLUG[slug];
  if (!key) notFound();

  const meta = GAME_META[key];
  const level = (isLevel(sp.level) ? sp.level : user.currentLevel) as Level;

  const header = (
    <>
      <nav className="muted mb-4 text-sm">
        <Link href="/games" className="underline">
          Mini Games
        </Link>{" "}
        / {meta.name}
      </nav>
      <PageHeader title={meta.name} subtitle={meta.blurb} />
    </>
  );

  const empty = (
    <EmptyState
      title="Not enough content for this game"
      body="This game needs more seeded vocabulary or exercises at your level. Run `npm run db:seed`, or try a different level."
      cta={{ href: "/games", label: "Back to games" }}
    />
  );

  if (key === "WORD_MATCH") {
    const pairs = await wordMatchRound(level);
    return (
      <>
        {header}
        {pairs.length < 3 ? empty : <WordMatch pairs={pairs} />}
      </>
    );
  }

  if (key === "GENDER_BATTLE") {
    const rounds = await genderBattleRound(level);
    return (
      <>
        {header}
        {rounds.length === 0 ? empty : <GenderBattle rounds={rounds} />}
      </>
    );
  }

  if (key === "LISTENING_QUIZ") {
    const rounds = await listeningRound(level);
    return (
      <>
        {header}
        {rounds.length === 0 ? empty : <ListeningQuiz rounds={rounds} />}
      </>
    );
  }

  // FILL_BLANK reuses the exercise runner against the fill-in-the-blank bank.
  const exercises = await pickExercises({ level, type: "FILL_BLANK", count: 8 });
  return (
    <>
      {header}
      {exercises.length === 0 ? (
        empty
      ) : (
        <ExerciseRunner exercises={exercises} source="game" onFinishHref="/games" />
      )}
    </>
  );
}
