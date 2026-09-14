import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/Markdown";
import { prisma } from "@/lib/db";
import { LEVELS, LEVEL_LABELS, isLevel } from "@/lib/levels";
import type { Level } from "@prisma/client";

export function generateStaticParams() {
  return LEVELS.map((level) => ({ level }));
}

export default async function CheatSheetLevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  const { level } = await params;
  if (!isLevel(level)) notFound();

  const sections = await prisma.cheatSheetSection.findMany({
    where: { level: level as Level },
    orderBy: { order: "asc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <nav className="muted mb-6 text-sm">
        <Link href="/cheatsheet" className="underline">
          Cheat Sheet
        </Link>{" "}
        / {level}
      </nav>

      <h1 className="text-3xl font-semibold">{LEVEL_LABELS[level]}</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <Link key={l} href={`/cheatsheet/${l}`} className="pill" data-active={l === level}>
            {l}
          </Link>
        ))}
      </div>

      {sections.length === 0 ? (
        <p className="muted mt-10">
          No cheat sheet content seeded for {level} yet. Run <code>npm run db:seed</code>.
        </p>
      ) : (
        <div className="mt-8 space-y-6">
          {sections.map((s) => (
            <section key={s.id} className="surface p-5 sm:p-6">
              <h2 className="text-xl font-semibold">{s.title}</h2>
              <div className="mt-3">
                <Markdown>{s.bodyMd}</Markdown>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
