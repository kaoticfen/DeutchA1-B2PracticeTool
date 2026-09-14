/**
 * Schemas for the committed seed data in data/seed/**.
 *
 * `scripts/generate-seed.ts` validates AI output against these before writing,
 * and `prisma/seed.ts` validates again before inserting — so malformed content
 * is caught at the file boundary rather than surfacing as broken UI.
 */

import { z } from "zod";
import { ALL_SUBCATEGORY_IDS } from "./taxonomy";

export const levelSchema = z.enum(["A1", "A2", "B1", "B2"]);
export const posSchema = z.enum(["VERB", "NOUN", "ADJ", "PREP", "ADV", "OTHER"]);

export const praesensSchema = z.object({
  ich: z.string().min(1),
  du: z.string().min(1),
  er: z.string().min(1),
  wir: z.string().min(1),
  ihr: z.string().min(1),
  sie: z.string().min(1),
});
export type Praesens = z.infer<typeof praesensSchema>;

export const wordSchema = z
  .object({
    lemma: z.string().min(1).max(120),
    level: levelSchema,
    pos: posSchema,
    subcategory: z.string().refine((s) => ALL_SUBCATEGORY_IDS.includes(s), {
      message: "subcategory must be an id from lib/taxonomy.ts",
    }),
    translationsEn: z.array(z.string().min(1).max(160)).min(1).max(6),
    exampleDe: z.string().max(400).optional(),
    exampleEn: z.string().max(400).optional(),

    noun: z
      .object({
        article: z.enum(["der", "die", "das"]),
        plural: z.string().min(1).max(120),
      })
      .optional(),

    verb: z
      .object({
        isSeparable: z.boolean(),
        prefix: z.string().max(20).nullable().optional(),
        isIrregular: z.boolean(),
        auxiliary: z.enum(["haben", "sein"]),
        praesens: praesensSchema,
        praeteritum: z.string().max(60).optional(),
        partizip2: z.string().max(60).optional(),
      })
      .optional(),

    adjective: z
      .object({
        comparative: z.string().min(1).max(120),
        superlative: z.string().max(120).optional(),
      })
      .optional(),
  })
  // A noun without an article, or a verb without a conjugation, would break the
  // dictionary detail views — reject at the boundary instead.
  .refine((w) => w.pos !== "NOUN" || !!w.noun, { message: "NOUN requires noun details" })
  .refine((w) => w.pos !== "VERB" || !!w.verb, { message: "VERB requires verb details" })
  .refine((w) => w.pos !== "ADJ" || !!w.adjective, { message: "ADJ requires adjective details" });

export type SeedWord = z.infer<typeof wordSchema>;
export const wordFileSchema = z.array(wordSchema);

export const exerciseSchema = z
  .object({
    level: levelSchema,
    topic: z.string().min(1).max(60),
    tag: z.string().min(1).max(60),
    type: z.enum(["MULTIPLE_CHOICE", "FILL_BLANK", "SENTENCE_BUILD"]),
    prompt: z.string().min(1),
    options: z.array(z.string().min(1)).optional(),
    answer: z.string().min(1).max(255),
    explanation: z.string().min(1),
  })
  .refine((e) => e.type !== "MULTIPLE_CHOICE" || (e.options?.length ?? 0) >= 2, {
    message: "MULTIPLE_CHOICE requires at least 2 options",
  })
  .refine((e) => e.type !== "MULTIPLE_CHOICE" || (e.options ?? []).includes(e.answer), {
    message: "MULTIPLE_CHOICE answer must be one of the options",
  })
  .refine((e) => e.type !== "SENTENCE_BUILD" || (e.options?.length ?? 0) >= 2, {
    message: "SENTENCE_BUILD requires word tiles in options",
  })
  .refine((e) => e.type !== "FILL_BLANK" || e.prompt.includes("___"), {
    message: "FILL_BLANK prompt must contain ___ to mark the gap",
  });

export type SeedExercise = z.infer<typeof exerciseSchema>;
export const exerciseFileSchema = z.array(exerciseSchema);

export const lessonSchema = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/, "slug must be kebab-case"),
  level: levelSchema,
  topic: z.string().min(1).max(60),
  title: z.string().min(1).max(200),
  summary: z.string().min(1),
  bodyMd: z.string().min(1),
  keyRules: z.array(z.string().min(1)).min(1),
  examples: z.array(z.object({ de: z.string().min(1), en: z.string().min(1) })).min(1),
  exerciseTag: z.string().min(1).max(60),
  order: z.number().int().min(0).default(0),
});
export type SeedLesson = z.infer<typeof lessonSchema>;
export const lessonFileSchema = z.array(lessonSchema);

export const readingSchema = z.object({
  level: levelSchema,
  title: z.string().min(1).max(200),
  bodyDe: z.string().min(1),
  glossary: z.record(z.string(), z.string()),
  questions: z
    .array(
      z.object({
        prompt: z.string().min(1),
        options: z.array(z.string().min(1)).min(2),
        answer: z.string().min(1),
      }),
    )
    .min(1),
});
export type SeedReading = z.infer<typeof readingSchema>;
export const readingFileSchema = z.array(readingSchema);

export const examSchema = z.object({
  level: levelSchema,
  section: z.enum(["READING", "LISTENING", "WRITING", "SPEAKING", "COMPREHENSION"]),
  title: z.string().min(1).max(200),
  payload: z.record(z.string(), z.unknown()),
});
export type SeedExam = z.infer<typeof examSchema>;
export const examFileSchema = z.array(examSchema);

export const pronunciationSchema = z.object({
  symbol: z.string().min(1).max(20),
  grapheme: z.string().min(1).max(40),
  example: z.string().min(1).max(80),
  description: z.string().min(1),
  tip: z.string().min(1),
  order: z.number().int().min(0).default(0),
});
export type SeedPronunciation = z.infer<typeof pronunciationSchema>;
export const pronunciationFileSchema = z.array(pronunciationSchema);

export const cheatSheetSchema = z.object({
  level: levelSchema,
  title: z.string().min(1).max(200),
  bodyMd: z.string().min(1),
  order: z.number().int().min(0).default(0),
});
export type SeedCheatSheet = z.infer<typeof cheatSheetSchema>;
export const cheatSheetFileSchema = z.array(cheatSheetSchema);
