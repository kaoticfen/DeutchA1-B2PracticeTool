/**
 * Loads data/seed/** into MySQL.
 *
 * Idempotent: safe to re-run after regenerating content. Every file is
 * re-validated against lib/seed-schema.ts before insertion, and all searchable
 * word forms / translations are derived here rather than being authored.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, type Prisma } from "@prisma/client";
import { z } from "zod";
import { deriveForms, deriveTranslations } from "../lib/forms";
import { dedupeWords } from "../lib/merge-words";
import { normalize } from "../lib/search";
import {
  cheatSheetFileSchema,
  examFileSchema,
  exerciseFileSchema,
  lessonFileSchema,
  pronunciationFileSchema,
  readingFileSchema,
  wordFileSchema,
  type SeedWord,
} from "../lib/seed-schema";

const prisma = new PrismaClient();
const SEED_DIR = join(process.cwd(), "data", "seed");

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

/** Reads every .json file in a seed subdirectory and concatenates the arrays. */
function loadDir<T>(name: string, schema: z.ZodType<T[]>): T[] {
  const dir = join(SEED_DIR, name);
  if (!existsSync(dir)) return [];

  const out: T[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const parsed = schema.safeParse(readJson(join(dir, file)));
    if (!parsed.success) {
      console.error(`\n✗ ${name}/${file} failed validation:`);
      for (const issue of parsed.error.issues.slice(0, 10)) {
        console.error(`   [${issue.path.join(".")}] ${issue.message}`);
      }
      throw new Error(`Invalid seed file: ${name}/${file}`);
    }
    out.push(...parsed.data);
  }
  return out;
}

function loadFile<T>(name: string, schema: z.ZodType<T[]>): T[] {
  const path = join(SEED_DIR, name);
  if (!existsSync(path)) return [];

  const parsed = schema.safeParse(readJson(path));
  if (!parsed.success) {
    console.error(`\n✗ ${name} failed validation:`);
    for (const issue of parsed.error.issues.slice(0, 10)) {
      console.error(`   [${issue.path.join(".")}] ${issue.message}`);
    }
    throw new Error(`Invalid seed file: ${name}`);
  }
  return parsed.data;
}

async function seedWords(words: SeedWord[]) {
  for (const w of words) {
    const base = {
      level: w.level,
      pos: w.pos,
      subcategory: w.subcategory,
      translationsEn: w.translationsEn as Prisma.InputJsonValue,
      exampleDe: w.exampleDe ?? null,
      exampleEn: w.exampleEn ?? null,
      searchLemma: normalize(w.lemma),
    };

    const word = await prisma.word.upsert({
      where: { lemma_pos: { lemma: w.lemma, pos: w.pos } },
      create: { lemma: w.lemma, ...base },
      update: base,
    });

    if (w.noun) {
      await prisma.nounDetail.upsert({
        where: { wordId: word.id },
        create: { wordId: word.id, ...w.noun },
        update: w.noun,
      });
    }

    if (w.verb) {
      const v = {
        isSeparable: w.verb.isSeparable,
        prefix: w.verb.prefix ?? null,
        isIrregular: w.verb.isIrregular,
        auxiliary: w.verb.auxiliary,
        praesens: w.verb.praesens as Prisma.InputJsonValue,
        praeteritum: w.verb.praeteritum ?? null,
        partizip2: w.verb.partizip2 ?? null,
      };
      await prisma.verbDetail.upsert({
        where: { wordId: word.id },
        create: { wordId: word.id, ...v },
        update: v,
      });
    }

    if (w.adjective) {
      const a = {
        comparative: w.adjective.comparative,
        superlative: w.adjective.superlative ?? null,
      };
      await prisma.adjectiveDetail.upsert({
        where: { wordId: word.id },
        create: { wordId: word.id, ...a },
        update: a,
      });
    }

    // Rebuild the derived indexes wholesale — cheaper and safer than diffing,
    // and it means a corrected conjugation actually removes the stale form.
    await prisma.wordForm.deleteMany({ where: { wordId: word.id } });
    await prisma.wordForm.createMany({
      data: deriveForms(w).map((f) => ({ wordId: word.id, ...f })),
      skipDuplicates: true,
    });

    await prisma.translation.deleteMany({ where: { wordId: word.id } });
    await prisma.translation.createMany({
      data: deriveTranslations(w).map((t) => ({ wordId: word.id, ...t })),
      skipDuplicates: true,
    });
  }
}

async function main() {
  console.log("Seeding from", SEED_DIR);

  const rawWords = loadDir("words", wordFileSchema);

  // Wordlists are cumulative — the same word appears in several decks at
  // different levels. Collapse before inserting, keeping the level where each
  // word is first introduced, so file order can never decide a word's level.
  const { words, report } = dedupeWords(rawWords);
  const lessons = loadDir("lessons", lessonFileSchema);
  const exercises = loadDir("exercises", exerciseFileSchema);
  const readings = loadDir("reading", readingFileSchema);
  const exams = loadDir("exam", examFileSchema);
  const pronunciation = loadFile("pronunciation.json", pronunciationFileSchema);
  const cheatsheet = loadFile("cheatsheet.json", cheatSheetFileSchema);

  await seedWords(words);
  console.log(`  ✓ ${words.length} words`);
  if (report.merged > 0) {
    console.log(
      `      (${report.total} entries across all sources; ${report.merged} duplicate(s) merged` +
        `${report.relabelled > 0 ? `, ${report.relabelled} kept at their lowest level` : ""})`,
    );
  }

  for (const l of lessons) {
    const data = {
      level: l.level,
      topic: l.topic,
      title: l.title,
      summary: l.summary,
      bodyMd: l.bodyMd,
      keyRules: l.keyRules as Prisma.InputJsonValue,
      examples: l.examples as Prisma.InputJsonValue,
      exerciseTag: l.exerciseTag,
      order: l.order,
    };
    await prisma.lesson.upsert({
      where: { slug: l.slug },
      create: { slug: l.slug, ...data },
      update: data,
    });
  }
  console.log(`  ✓ ${lessons.length} lessons`);

  // Upserted on (tag, prompt) so re-seeding keeps ids stable — which keeps
  // every learner's attempt history and accuracy stats intact.
  for (const e of exercises) {
    const data = {
      level: e.level,
      topic: e.topic,
      type: e.type,
      options: (e.options ?? null) as Prisma.InputJsonValue,
      answer: e.answer,
      explanation: e.explanation,
    };
    await prisma.exercise.upsert({
      where: { tag_prompt: { tag: e.tag, prompt: e.prompt } },
      create: { tag: e.tag, prompt: e.prompt, ...data },
      update: data,
    });
  }
  console.log(`  ✓ ${exercises.length} exercises`);

  for (const r of readings) {
    const data = {
      bodyDe: r.bodyDe,
      glossary: r.glossary as Prisma.InputJsonValue,
      questions: r.questions as Prisma.InputJsonValue,
    };
    await prisma.readingText.upsert({
      where: { level_title: { level: r.level, title: r.title } },
      create: { level: r.level, title: r.title, ...data },
      update: data,
    });
  }
  console.log(`  ✓ ${readings.length} reading texts`);

  for (const x of exams) {
    const data = { level: x.level, payload: x.payload as Prisma.InputJsonValue };
    await prisma.examItem.upsert({
      where: { section_title: { section: x.section, title: x.title } },
      create: { section: x.section, title: x.title, ...data },
      update: data,
    });
  }
  console.log(`  ✓ ${exams.length} exam items`);

  for (const p of pronunciation) {
    await prisma.pronunciationEntry.upsert({
      where: { symbol: p.symbol },
      create: p,
      update: p,
    });
  }
  console.log(`  ✓ ${pronunciation.length} pronunciation entries`);

  for (const c of cheatsheet) {
    await prisma.cheatSheetSection.upsert({
      where: { level_title: { level: c.level, title: c.title } },
      create: c,
      update: c,
    });
  }
  console.log(`  ✓ ${cheatsheet.length} cheat sheet sections`);

  const forms = await prisma.wordForm.count();
  const translations = await prisma.translation.count();
  console.log(`  ✓ ${forms} searchable forms, ${translations} translation entries`);
  console.log("\nSeed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
