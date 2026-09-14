import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ReadingText } from "@/components/ReadingText";
import { SpeakButton } from "@/components/SpeakButton";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { LEVEL_LABELS, type LevelName } from "@/lib/levels";

export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const text = await prisma.readingText.findUnique({ where: { id: Number(id) } });
  if (!text) notFound();

  return (
    <>
      <nav className="muted mb-4 text-sm">
        <Link href="/reading" className="underline">
          Reading Mode
        </Link>{" "}
        / {text.title}
      </nav>

      <PageHeader
        title={text.title}
        subtitle={LEVEL_LABELS[text.level as LevelName]}
        action={<SpeakButton text={text.bodyDe} label="Read aloud" />}
      />

      <ReadingText
        body={text.bodyDe}
        glossary={(text.glossary as Record<string, string>) ?? {}}
        questions={(text.questions as { prompt: string; options: string[]; answer: string }[]) ?? []}
      />
    </>
  );
}
