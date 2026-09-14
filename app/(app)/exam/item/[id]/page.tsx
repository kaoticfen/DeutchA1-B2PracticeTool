import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { QuizSection } from "@/components/exam/QuizSection";
import { WritingSection } from "@/components/exam/WritingSection";
import { SpeakingSection } from "@/components/exam/SpeakingSection";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/db";
import { LEVEL_LABELS, type LevelName } from "@/lib/levels";
import { EXAM_SECTIONS } from "@/lib/exam";

type Question = { prompt: string; options: string[]; answer: string };

export default async function ExamItemPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const item = await prisma.examItem.findUnique({ where: { id: Number(id) } });
  if (!item) notFound();

  const section = EXAM_SECTIONS.find((s) => s.key === item.section);
  const payload = (item.payload ?? {}) as Record<string, unknown>;

  return (
    <>
      <nav className="muted mb-4 text-sm">
        <Link href="/exam" className="underline">
          Exam Prep
        </Link>{" "}
        /{" "}
        <Link href={`/exam/${section?.slug ?? ""}`} className="underline">
          {section?.label}
        </Link>{" "}
        / {item.title}
      </nav>

      <PageHeader
        title={item.title}
        subtitle={`${LEVEL_LABELS[item.level as LevelName]} · ${section?.label}`}
      />

      {(item.section === "READING" || item.section === "COMPREHENSION") && (
        <QuizSection
          examItemId={item.id}
          text={payload.text as string}
          questions={(payload.questions as Question[]) ?? []}
        />
      )}

      {item.section === "LISTENING" && (
        <QuizSection
          examItemId={item.id}
          script={payload.script as string}
          questions={(payload.questions as Question[]) ?? []}
        />
      )}

      {item.section === "WRITING" && (
        <WritingSection
          examItemId={item.id}
          task={payload.task as string}
          minWords={(payload.minWords as number) ?? 50}
          hints={(payload.hints as string[]) ?? []}
          modelAnswer={(payload.modelAnswer as string) ?? ""}
        />
      )}

      {item.section === "SPEAKING" && (
        <SpeakingSection
          examItemId={item.id}
          task={payload.task as string}
          prompts={(payload.prompts as string[]) ?? []}
          tips={(payload.tips as string[]) ?? []}
        />
      )}
    </>
  );
}
