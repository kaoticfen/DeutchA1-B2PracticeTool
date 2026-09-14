import Link from "next/link";
import { LEVELS, LEVEL_LABELS } from "@/lib/levels";
import { prisma } from "@/lib/db";

export const metadata = { title: "Grammar Cheat Sheet · Deutsch A1–B2" };

export default async function CheatSheetIndex() {
  const counts = await prisma.cheatSheetSection.groupBy({
    by: ["level"],
    _count: { _all: true },
  });
  const countFor = (l: string) => counts.find((c) => c.level === l)?._count._all ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Grammar Cheat Sheet</h1>
      <p className="muted mt-2">
        A condensed grammar reference for each level. No sign-in needed.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {LEVELS.map((level) => (
          <Link
            key={level}
            href={`/cheatsheet/${level}`}
            className="surface p-5 transition-colors hover:border-[var(--color-brand-500)]"
          >
            <div className="text-xl font-semibold">{level}</div>
            <div className="muted mt-1 text-sm">{LEVEL_LABELS[level]}</div>
            <div className="muted mt-3 text-xs">{countFor(level)} sections</div>
          </Link>
        ))}
      </div>

      <p className="muted mt-10 text-sm">
        <Link href="/" className="underline">
          Back to the app
        </Link>
      </p>
    </main>
  );
}
