import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { CategoryFilter } from "@/components/CategoryFilter";
import { LevelFilter } from "@/components/LevelFilter";
import { FlashcardSession } from "@/components/FlashcardSession";
import { EmptyState } from "@/components/EmptyState";
import { requireUser } from "@/lib/session";
import { buildReviewSession } from "@/lib/review-queue";
import { isLevel } from "@/lib/levels";
import { CATEGORY_POS, isSubcategoryId, type PosName } from "@/lib/taxonomy";
import type { Level, Pos } from "@prisma/client";

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; pos?: string; sub?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const level = isLevel(sp.level) ? (sp.level as Level) : null;
  const pos = sp.pos && sp.pos in CATEGORY_POS ? (sp.pos as PosName) : null;
  const sub = sp.sub && isSubcategoryId(sp.sub) ? sp.sub : null;

  const { cards, dueTotal } = await buildReviewSession(user.id, {
    level,
    pos: pos ? (CATEGORY_POS[pos] as Pos[]) : null,
    subcategory: sub,
  });

  // The filter key remounts the session component when filters change, so a
  // half-finished session never bleeds into a differently-filtered one.
  const filterKey = `${level ?? ""}-${pos ?? ""}-${sub ?? ""}`;

  return (
    <>
      <PageHeader
        title="Flashcards"
        subtitle={
          dueTotal > 0
            ? `${dueTotal} card${dueTotal === 1 ? "" : "s"} due for review.`
            : "Nothing due right now — new words will be introduced."
        }
      />

      <div className="mb-6 space-y-4">
        <Suspense fallback={null}>
          <LevelFilter basePath="/flashcards" />
        </Suspense>
        <Suspense fallback={null}>
          <CategoryFilter basePath="/flashcards" />
        </Suspense>
      </div>

      {cards.length === 0 ? (
        <EmptyState
          title="Nothing to review here"
          body="Every card matching this filter is scheduled for later, or there is no vocabulary for it yet. Try a different category or level."
          cta={{ href: "/dictionary", label: "Browse the dictionary" }}
        />
      ) : (
        <FlashcardSession key={filterKey} cards={cards} />
      )}
    </>
  );
}
