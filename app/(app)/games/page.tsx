import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { GAME_META, type GameKey } from "@/lib/games";

export default async function GamesPage() {
  const user = await requireUser();

  const stats = await prisma.gameSession.groupBy({
    by: ["game"],
    where: { userId: user.id },
    _count: { _all: true },
    _max: { score: true },
  });

  return (
    <>
      <PageHeader
        title="Mini Games"
        subtitle="Short drills that turn vocabulary practice into something you'll actually repeat."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {(Object.keys(GAME_META) as GameKey[]).map((key) => {
          const meta = GAME_META[key];
          const stat = stats.find((s) => s.game === key);

          return (
            <Link
              key={key}
              href={`/games/${meta.slug}`}
              className="surface p-5 transition-colors hover:border-[var(--color-brand-500)]"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>
                  {meta.icon}
                </span>
                <div>
                  <div className="font-medium">{meta.name}</div>
                  <p className="muted mt-1 text-sm">{meta.blurb}</p>
                  <div className="muted mt-3 text-xs">
                    {stat
                      ? `Played ${stat._count._all}× · best ${stat._max.score}`
                      : "Not played yet"}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
