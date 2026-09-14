import { Suspense } from "react";
import { PageHeader } from "@/components/PageHeader";
import { WordCard } from "@/components/WordCard";
import { DictionarySearch } from "@/components/DictionarySearch";
import { CategoryFilter } from "@/components/CategoryFilter";
import { LevelFilter } from "@/components/LevelFilter";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { EmptyState } from "@/components/EmptyState";
import { browseWords, searchWords } from "@/lib/dictionary";
import { isLevel } from "@/lib/levels";
import { CATEGORY_POS, isSubcategoryId, type PosName } from "@/lib/taxonomy";
import { prisma } from "@/lib/db";
import type { Level, Pos } from "@prisma/client";

export default async function DictionaryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; level?: string; pos?: string; sub?: string }>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const level = isLevel(sp.level) ? (sp.level as Level) : null;
  const pos = sp.pos && sp.pos in CATEGORY_POS ? (sp.pos as PosName) : null;
  const sub = sp.sub && isSubcategoryId(sp.sub) ? sp.sub : null;

  const total = await prisma.word.count();

  // Searching ignores the category pills on purpose: the spec requires the
  // dictionary to reach every word regardless of the selected filters.
  const results = q
    ? await searchWords(q, { level })
    : (
        await browseWords({
          level,
          pos: pos ? (CATEGORY_POS[pos] as Pos[]) : null,
          subcategory: sub,
        })
      ).map((w) => ({
        id: w.id,
        lemma: w.lemma,
        level: w.level,
        pos: w.pos,
        subcategory: w.subcategory,
        translationsEn: (w.translationsEn as string[]) ?? [],
        article: w.noun?.article ?? null,
        matchedVia: null,
        matchedForm: null,
        rank: 0,
      }));

  return (
    <>
      <PageHeader
        title="Dictionary"
        subtitle={`${total} words across A1–B2. Search by German word, a conjugated form, or the English meaning.`}
      />

      {total === 0 ? (
        <EmptyState
          title="No vocabulary seeded yet"
          body="Run `npm run db:seed` to load the starter set, or `npm run generate:seed` with an ANTHROPIC_API_KEY to build the full A1–B2 corpus."
        />
      ) : (
        <>
          <div className="space-y-4">
            <Suspense fallback={<input className="input" placeholder="Search…" disabled />}>
              <DictionarySearch initial={q} />
            </Suspense>
            <Suspense fallback={null}>
              <LevelFilter basePath="/dictionary" />
            </Suspense>
            {!q && (
              <Suspense fallback={null}>
                <CategoryFilter basePath="/dictionary" />
              </Suspense>
            )}
          </div>

          <div className="muted mt-5 text-sm">
            {q
              ? `${results.length} result${results.length === 1 ? "" : "s"} for “${q}”`
              : `Showing ${results.length} words`}
          </div>

          {results.length === 0 ? (
            <p className="surface mt-3 p-6 text-center text-sm">
              Nothing found. Try the infinitive (essen), the singular (Haus), or an English word.
            </p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((r) => (
                <WordCard key={r.id} {...r} />
              ))}
            </div>
          )}

          {!q && <RecentlyViewed />}
        </>
      )}
    </>
  );
}
