/**
 * Loose schemas handed to the model for structured output.
 *
 * These deliberately omit the cross-field `.refine()` rules in
 * lib/seed-schema.ts — those don't translate to JSON Schema, and we want the
 * strict versions to act as an independent check on what the model returns.
 */

import { z } from "zod";

const level = z.enum(["A1", "A2", "B1", "B2"]);

export const genPraesens = z.object({
  ich: z.string(),
  du: z.string(),
  er: z.string(),
  wir: z.string(),
  ihr: z.string(),
  sie: z.string(),
});

export const genWord = z.object({
  lemma: z.string().describe("The dictionary form. Nouns capitalised, without an article."),
  level,
  pos: z.enum(["VERB", "NOUN", "ADJ", "PREP", "ADV", "OTHER"]),
  subcategory: z.string().describe("Must be exactly the requested subcategory id."),
  translationsEn: z.array(z.string()).describe("1-3 English glosses. Verbs use the 'to ...' form."),
  exampleDe: z.string().describe("A natural German sentence using the word."),
  exampleEn: z.string().describe("The English translation of exampleDe."),
  noun: z
    .object({
      article: z.enum(["der", "die", "das"]),
      plural: z.string().describe("Plural form without an article, e.g. Häuser."),
    })
    .nullable()
    .describe("Required for NOUN, otherwise null."),
  verb: z
    .object({
      isSeparable: z.boolean(),
      prefix: z.string().nullable(),
      isIrregular: z.boolean(),
      auxiliary: z.enum(["haben", "sein"]),
      praesens: genPraesens.describe(
        "Present tense. For separable verbs write the split form, e.g. 'stehe auf'.",
      ),
      praeteritum: z.string().nullable(),
      partizip2: z.string().nullable(),
    })
    .nullable()
    .describe("Required for VERB, otherwise null."),
  adjective: z
    .object({
      comparative: z.string(),
      superlative: z.string().describe("With 'am', e.g. 'am schnellsten'."),
    })
    .nullable()
    .describe("Required for ADJ, otherwise null."),
});

export const genWordBatch = z.object({ words: z.array(genWord) });

export const genExercise = z.object({
  level,
  topic: z.string(),
  tag: z.string().describe("Must be exactly the requested tag."),
  type: z.enum(["MULTIPLE_CHOICE", "FILL_BLANK", "SENTENCE_BUILD"]),
  prompt: z
    .string()
    .describe("For FILL_BLANK the prompt MUST contain ___ marking the gap."),
  options: z
    .array(z.string())
    .nullable()
    .describe(
      "MULTIPLE_CHOICE: 4 options, one exactly equal to answer. SENTENCE_BUILD: the shuffled word tiles. FILL_BLANK: null.",
    ),
  answer: z.string(),
  explanation: z.string().describe("One or two sentences explaining the rule."),
});

export const genExerciseBatch = z.object({ exercises: z.array(genExercise) });

export const genReading = z.object({
  level,
  title: z.string(),
  bodyDe: z.string().describe("A German text of 3-5 short paragraphs, separated by blank lines."),
  glossary: z
    .array(z.object({ de: z.string(), en: z.string() }))
    .describe("10-25 of the harder words in the text, with English meanings."),
  questions: z
    .array(z.object({ prompt: z.string(), options: z.array(z.string()), answer: z.string() }))
    .describe("3-5 comprehension questions, each with 4 options; answer matches one option."),
});

export const genReadingBatch = z.object({ texts: z.array(genReading) });
