/**
 * Offline seed generation.
 *
 * Calls the Claude API to expand data/seed/** toward the full A1–B2 corpus.
 * The app itself never calls the API — this script runs on your machine, its
 * output is committed as JSON, and `npm run db:seed` loads it.
 *
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   npm run generate:seed -- --what words --target 3000
 *   npm run generate:seed -- --what exercises --per-tag 20
 *   npm run generate:seed -- --what reading --per-level 6
 *
 * Every batch is validated against lib/seed-schema.ts before it is written, so
 * malformed output is rejected at the file boundary rather than in the UI.
 * Progress is recorded in data/seed/.manifest.json, so an interrupted run
 * resumes instead of paying for the same batches twice.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { LEVELS, type LevelName } from "../lib/levels";
import { TAXONOMY } from "../lib/taxonomy";
import {
  wordSchema,
  exerciseSchema,
  readingSchema,
  importedWordFileSchema,
  type ImportedWord,
} from "../lib/seed-schema";
import {
  genExerciseBatch,
  genGrammarBatch,
  genReadingBatch,
  genWordBatch,
} from "../lib/generation-schema";

const MODEL = "claude-opus-5";
const SEED_DIR = join(process.cwd(), "data", "seed");
const MANIFEST = join(SEED_DIR, ".manifest.json");

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const has = (name: string) => process.argv.includes(`--${name}`);

const WHAT = arg("what", "words");
const TARGET_WORDS = Number(arg("target", "3000"));
const PER_TAG = Number(arg("per-tag", "15"));
const PER_LEVEL = Number(arg("per-level", "5"));
const ONLY_LEVEL = arg("level", "");
const DRY_RUN = has("dry-run");
const RESET = has("reset");
const BATCH_SIZE = Number(arg("batch-size", "20"));

// ---------------------------------------------------------------------------
// Manifest — lets an interrupted run resume for free
// ---------------------------------------------------------------------------

type Manifest = { done: string[] };

function readManifest(): Manifest {
  if (!existsSync(MANIFEST)) return { done: [] };
  try {
    return JSON.parse(readFileSync(MANIFEST, "utf-8")) as Manifest;
  } catch {
    return { done: [] };
  }
}

function markDone(key: string) {
  const m = readManifest();
  if (!m.done.includes(key)) m.done.push(key);
  writeFileSync(MANIFEST, JSON.stringify(m, null, 2));
}

/**
 * A full sweep over every cell can only produce BATCH_SIZE words per cell, so
 * reaching a large target takes several runs. Keying each batch by pass number
 * lets a later run add more instead of seeing the cell as "done" forever.
 */
function nextPass(dir: string, prefix: string): number {
  const path = join(SEED_DIR, dir);
  if (!existsSync(path)) return 1;
  const existing = readdirSync(path).filter((f) => f.startsWith(`${prefix}-p`) && f.endsWith(".json"));
  return existing.length + 1;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

if (!process.env.ANTHROPIC_API_KEY && !DRY_RUN) {
  console.error(
    "\nANTHROPIC_API_KEY is not set.\n\n" +
      "This script is the only part of the project that talks to the Claude API,\n" +
      "and it runs offline — the app never calls it at runtime.\n\n" +
      "  export ANTHROPIC_API_KEY=sk-ant-...\n\n" +
      "Run with --dry-run to see what would be generated without calling the API.\n",
  );
  process.exit(1);
}

const client = new Anthropic();

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One structured-output call, retried on transient failures. */
async function generate<T>(
  schema: z.ZodType<T>,
  system: string,
  prompt: string,
  label: string,
): Promise<T | null> {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const response = await client.messages.parse({
        model: MODEL,
        max_tokens: 16000,
        system,
        thinking: { type: "adaptive" },
        output_config: { format: zodOutputFormat(schema as never) },
        messages: [{ role: "user", content: prompt }],
      });

      if (response.stop_reason === "refusal") {
        console.warn(`   ! ${label}: refused (${response.stop_details?.category ?? "unknown"})`);
        return null;
      }
      if (!response.parsed_output) {
        console.warn(`   ! ${label}: no parsed output (attempt ${attempt})`);
        continue;
      }
      return response.parsed_output as T;
    } catch (err) {
      const retryable =
        err instanceof Anthropic.RateLimitError ||
        err instanceof Anthropic.APIConnectionError ||
        (err instanceof Anthropic.APIError && err.status >= 500);

      if (!retryable || attempt === 4) {
        console.error(`   ✗ ${label}: ${(err as Error).message}`);
        return null;
      }

      const backoff = 2 ** attempt * 1000;
      console.warn(`   … ${label}: retrying in ${backoff / 1000}s (${(err as Error).message})`);
      await sleep(backoff);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Existing content — so we never ask for duplicates
// ---------------------------------------------------------------------------

function loadExisting(dir: string): unknown[] {
  const path = join(SEED_DIR, dir);
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(readFileSync(join(path, f), "utf-8")) as unknown[]);
}

/** Reads the importer's staging files, validating as it goes. */
function loadStaged(): ImportedWord[] {
  const raw = loadExisting("imported");
  if (raw.length === 0) return [];

  const parsed = importedWordFileSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("\ndata/seed/imported/ failed validation:");
    for (const issue of parsed.error.issues.slice(0, 5)) {
      console.error(`   [${issue.path.join(".")}] ${issue.message}`);
    }
    process.exit(1);
  }
  return parsed.data;
}

function writeBatch(dir: string, name: string, rows: unknown[]) {
  const path = join(SEED_DIR, dir);
  mkdirSync(path, { recursive: true });
  writeFileSync(join(path, `${name}.json`), JSON.stringify(rows, null, 2) + "\n");
}

const SYSTEM = `You are a German language expert producing reference-quality learning content for a CEFR A1–B2 study app.

Absolute requirements:
- Every German form must be grammatically correct. Accuracy beats quantity — if you are unsure of a conjugation or plural, choose a different, more common word.
- Use real, current, standard German (Hochdeutsch). No invented words, no archaic forms.
- Respect the requested CEFR level: A1/A2 = high-frequency everyday vocabulary, B1/B2 = abstract, formal and lower-frequency vocabulary.
- Never repeat a word that is listed as already covered.
- Write umlauts and ß correctly (ä ö ü ß), never as ae/oe/ue/ss.`;

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

async function generateWords() {
  const existing = loadExisting("words") as { lemma: string; level: string; subcategory: string }[];
  const known = new Set(existing.map((w) => w.lemma.toLowerCase()));

  console.log(`\nExisting vocabulary: ${existing.length} words`);
  console.log(`Target: ${TARGET_WORDS}\n`);

  const needed = TARGET_WORDS - existing.length;
  if (needed <= 0) {
    console.log("Target already reached. Raise --target to generate more.");
    return;
  }

  // Spread the shortfall evenly over every (level, subcategory) cell.
  const levels = (ONLY_LEVEL ? [ONLY_LEVEL as LevelName] : LEVELS).filter(Boolean);
  const cells: { level: LevelName; pos: string; sub: string; subLabel: string }[] = [];
  for (const level of levels) {
    for (const category of TAXONOMY) {
      for (const sub of category.subcategories) {
        // "Other" gathers several parts of speech; pick the right one per sub.
        const pos =
          sub.id.startsWith("adj-") ? "ADJ" :
          sub.id.startsWith("adv-") ? "ADV" :
          category.pos === "OTHER" ? "OTHER" : category.pos;
        cells.push({ level, pos, sub: sub.id, subLabel: sub.label });
      }
    }
  }

  const perCell = Math.max(1, Math.ceil(needed / cells.length));
  const manifest = readManifest();
  let produced = 0;

  for (const cell of cells) {
    const pass = nextPass("words", `gen-${cell.level}-${cell.sub}`);
    const key = `words:${cell.level}:${cell.sub}:p${pass}`;
    if (manifest.done.includes(key)) {
      console.log(`  ⟳ ${key} (already done)`);
      continue;
    }

    const count = Math.min(perCell, BATCH_SIZE);
    const alreadyHere = existing
      .filter((w) => w.level === cell.level && w.subcategory === cell.sub)
      .map((w) => w.lemma);

    console.log(`  → ${cell.level} / ${cell.subLabel}: requesting ${count}`);
    if (DRY_RUN) continue;

    const prompt = `Produce ${count} German words for a vocabulary trainer.

Level: ${cell.level}
Part of speech: ${cell.pos}
Category: ${cell.subLabel}
You MUST set "subcategory" to exactly: ${cell.sub}
You MUST set "pos" to exactly: ${cell.pos}
You MUST set "level" to exactly: ${cell.level}

Already covered — do NOT repeat any of these:
${alreadyHere.length ? alreadyHere.join(", ") : "(nothing yet in this category)"}

Field rules:
- NOUN: fill "noun" with article and plural; set "verb" and "adjective" to null.
- VERB: fill "verb" with the full present tense and Partizip II; set "noun" and "adjective" to null.
  Separable verbs: isSeparable true, prefix set, and praesens written split, e.g. "stehe auf".
  Use auxiliary "sein" only for motion, change of state, and sein/bleiben/passieren.
- ADJ: fill "adjective" with comparative and superlative; set "noun" and "verb" to null.
- Anything else: all three of noun/verb/adjective are null.
- Always include a natural exampleDe and its exampleEn translation.`;

    const result = await generate(genWordBatch, SYSTEM, prompt, key);
    if (!result) continue;

    // Strict validation + de-duplication before anything is written.
    const accepted: unknown[] = [];
    for (const raw of result.words) {
      const candidate = {
        ...raw,
        noun: raw.noun ?? undefined,
        verb: raw.verb ? { ...raw.verb, prefix: raw.verb.prefix ?? undefined, praeteritum: raw.verb.praeteritum ?? undefined, partizip2: raw.verb.partizip2 ?? undefined } : undefined,
        adjective: raw.adjective ?? undefined,
        subcategory: cell.sub,
        level: cell.level,
      };

      const parsed = wordSchema.safeParse(candidate);
      if (!parsed.success) {
        console.warn(`     ✗ ${raw.lemma}: ${parsed.error.issues[0]?.message}`);
        continue;
      }
      if (known.has(parsed.data.lemma.toLowerCase())) continue;

      known.add(parsed.data.lemma.toLowerCase());
      accepted.push(parsed.data);
    }

    if (accepted.length > 0) {
      writeBatch("words", `gen-${cell.level}-${cell.sub}-p${pass}`, accepted);
      produced += accepted.length;
      console.log(`     ✓ wrote ${accepted.length} (running total ${existing.length + produced})`);
    }
    markDone(key);
  }

  console.log(`\nGenerated ${produced} new words. Run \`npm run db:seed\` to load them.`);
}

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

async function generateExercises() {
  const existing = loadExisting("exercises") as { tag: string; prompt: string; level: string }[];
  const byTag = new Map<string, string[]>();
  for (const e of existing) {
    byTag.set(e.tag, [...(byTag.get(e.tag) ?? []), e.prompt]);
  }

  const lessons = loadExisting("lessons") as {
    exerciseTag: string;
    title: string;
    level: string;
    topic: string;
    keyRules: string[];
  }[];

  console.log(`\nExisting exercises: ${existing.length} across ${byTag.size} tags\n`);
  const manifest = readManifest();

  for (const lesson of lessons) {
    if (ONLY_LEVEL && lesson.level !== ONLY_LEVEL) continue;

    const key = `exercises:${lesson.exerciseTag}:target${PER_TAG}`;
    if (manifest.done.includes(key)) {
      console.log(`  ⟳ ${key} (already done)`);
      continue;
    }

    const have = byTag.get(lesson.exerciseTag) ?? [];
    const need = Math.max(0, PER_TAG - have.length);
    if (need === 0) {
      console.log(`  ✓ ${lesson.exerciseTag}: already has ${have.length}`);
      continue;
    }

    console.log(`  → ${lesson.exerciseTag}: requesting ${need}`);
    if (DRY_RUN) continue;

    const prompt = `Write ${need} grammar exercises for a German learning app.

Lesson: ${lesson.title}
Level: ${lesson.level}
Topic: ${lesson.topic}
You MUST set "tag" to exactly: ${lesson.exerciseTag}
You MUST set "level" to exactly: ${lesson.level}
You MUST set "topic" to exactly: ${lesson.topic}

The rules being practised:
${lesson.keyRules.map((r) => `- ${r}`).join("\n")}

Already written — do NOT repeat these prompts:
${have.length ? have.map((p) => `- ${p}`).join("\n") : "(none yet)"}

Format rules:
- Mix roughly 60% MULTIPLE_CHOICE, 30% FILL_BLANK, 10% SENTENCE_BUILD.
- MULTIPLE_CHOICE: exactly 4 plausible options; "answer" must be character-for-character one of them.
- FILL_BLANK: the prompt MUST contain ___ where the gap is; "options" is null; "answer" is just the missing word.
- SENTENCE_BUILD: "options" holds the sentence's words in scrambled order; "answer" is the full correct sentence.
- Every distractor should reflect a mistake a learner actually makes, not a random word.
- "explanation" states the rule, not just the answer.`;

    const result = await generate(genExerciseBatch, SYSTEM, prompt, key);
    if (!result) continue;

    const accepted: unknown[] = [];
    for (const raw of result.exercises) {
      const candidate = {
        ...raw,
        tag: lesson.exerciseTag,
        level: lesson.level,
        topic: lesson.topic,
        options: raw.options ?? undefined,
      };
      const parsed = exerciseSchema.safeParse(candidate);
      if (!parsed.success) {
        console.warn(`     ✗ "${raw.prompt.slice(0, 40)}…": ${parsed.error.issues[0]?.message}`);
        continue;
      }
      accepted.push(parsed.data);
    }

    if (accepted.length > 0) {
      writeBatch("exercises", `gen-${lesson.exerciseTag}-p${nextPass("exercises", `gen-${lesson.exerciseTag}`)}`, accepted);
      console.log(`     ✓ wrote ${accepted.length}`);
    }
    markDone(key);
  }

  console.log("\nDone. Run `npm run db:seed` to load them.");
}

// ---------------------------------------------------------------------------
// Reading texts
// ---------------------------------------------------------------------------

async function generateReading() {
  const existing = loadExisting("reading") as { level: string; title: string }[];
  console.log(`\nExisting reading texts: ${existing.length}\n`);
  const manifest = readManifest();

  const levels = (ONLY_LEVEL ? [ONLY_LEVEL as LevelName] : LEVELS).filter(Boolean);

  for (const level of levels) {
    const key = `reading:${level}:target${PER_LEVEL}`;
    if (manifest.done.includes(key)) {
      console.log(`  ⟳ ${key} (already done)`);
      continue;
    }

    const have = existing.filter((t) => t.level === level).map((t) => t.title);
    const need = Math.max(0, PER_LEVEL - have.length);
    if (need === 0) {
      console.log(`  ✓ ${level}: already has ${have.length}`);
      continue;
    }

    console.log(`  → ${level}: requesting ${need} texts`);
    if (DRY_RUN) continue;

    const lengths: Record<string, string> = {
      A1: "60–90 words, present tense, everyday topics",
      A2: "120–160 words, may use the Perfekt and modal verbs",
      B1: "200–260 words, may use subordinate clauses and Konjunktiv II",
      B2: "280–350 words, argumentative or journalistic register",
    };

    const prompt = `Write ${need} German reading texts for level ${level}.

You MUST set "level" to exactly: ${level}
Length and register: ${lengths[level]}

Already written — choose different topics:
${have.length ? have.join(", ") : "(none yet)"}

Requirements:
- Separate paragraphs with a blank line.
- "glossary": 10–25 of the harder words from the text, each with a concise English meaning. Use the exact form as it appears in the text.
- "questions": 3–5 comprehension questions, each with exactly 4 options, where "answer" is character-for-character one of the options.
- Questions must be answerable from the text alone, and at least one should require inference rather than lookup.`;

    const result = await generate(genReadingBatch, SYSTEM, prompt, key);
    if (!result) continue;

    const accepted: unknown[] = [];
    for (const raw of result.texts) {
      const candidate = {
        ...raw,
        level,
        // The model returns an array of pairs; the seed format wants a map.
        glossary: Object.fromEntries(raw.glossary.map((g) => [g.de, g.en])),
      };
      const parsed = readingSchema.safeParse(candidate);
      if (!parsed.success) {
        console.warn(`     ✗ "${raw.title}": ${parsed.error.issues[0]?.message}`);
        continue;
      }
      accepted.push(parsed.data);
    }

    if (accepted.length > 0) {
      writeBatch("reading", `gen-${level}-p${nextPass("reading", `gen-${level}`)}`, accepted);
      console.log(`     ✓ wrote ${accepted.length}`);
    }
    markDone(key);
  }

  console.log("\nDone. Run `npm run db:seed` to load them.");
}

// ---------------------------------------------------------------------------
// Grammar backfill for imported wordlists
// ---------------------------------------------------------------------------

/**
 * Fills in the grammatical detail a wordlist doesn't carry (conjugations,
 * plurals, comparatives, subcategory) for words imported by
 * scripts/import-anki.ts.
 *
 * The deck stays authoritative: the lemma, level and translations are re-imposed
 * after generation, so the model can only add detail, never rewrite the entry.
 */
async function generateGrammar() {
  const staged = loadStaged();
  if (staged.length === 0) {
    console.log(
      "\nNothing staged in data/seed/imported/.\n" +
        "Import a deck first:\n" +
        "  npx tsx scripts/import-anki.ts --file <deck.apkg> --level A2\n",
    );
    return;
  }

  // Skip anything already completed — by a previous run, or because the
  // importer could finish it without help.
  const existing = loadExisting("words") as { lemma: string }[];
  const done = new Set(existing.map((w) => w.lemma.toLowerCase()));

  const pending = staged.filter((w) => !done.has(w.lemma.toLowerCase()));
  console.log(`\nStaged: ${staged.length} · already complete: ${staged.length - pending.length}`);
  console.log(`To backfill: ${pending.length}\n`);
  if (pending.length === 0) return;

  // Group by level and guessed part of speech so each prompt is narrow.
  const groups = new Map<string, ImportedWord[]>();
  for (const w of pending) {
    if (ONLY_LEVEL && w.level !== ONLY_LEVEL) continue;
    const key = `${w.level}:${w.posGuess ?? "unknown"}`;
    groups.set(key, [...(groups.get(key) ?? []), w]);
  }

  const manifest = readManifest();
  let produced = 0;

  for (const [groupKey, words] of groups) {
    const [level, posGuess] = groupKey.split(":");

    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const chunk = words.slice(i, i + BATCH_SIZE);
      const batchNo = Math.floor(i / BATCH_SIZE) + 1;
      const key = `grammar:${groupKey}:b${batchNo}`;

      if (manifest.done.includes(key)) {
        console.log(`  ⟳ ${key} (already done)`);
        continue;
      }

      console.log(`  → ${level} / ${posGuess}: batch ${batchNo} (${chunk.length} words)`);
      if (DRY_RUN) continue;

      const allowed = TAXONOMY.flatMap((c) =>
        c.subcategories.map((sub) => `${sub.id} — ${sub.label} (${c.label})`),
      ).join("\n");

      const list = chunk
        .map((w) => {
          const known: string[] = [];
          if (w.article) known.push(`article is "${w.article}"`);
          if (w.plural) known.push(`plural is "${w.plural}"`);
          if (w.posGuess) known.push(`probably ${w.posGuess}`);
          return `- ${w.lemma} = ${w.translationsEn.join(", ")}${known.length ? `  [${known.join("; ")}]` : ""}`;
        })
        .join("\n");

      const prompt = `Supply the grammatical detail for these ${chunk.length} German words.

These come from a published ${level} wordlist. The lemma and the English meaning
are already correct — do not change them, do not add words, do not drop words.
Return exactly one entry per word, echoing each lemma back unchanged.

Words:
${list}

Set "subcategory" to exactly one of:
${allowed}

Field rules:
- NOUN: fill "noun" with article and plural; "verb" and "adjective" null.
  Where an article or plural is already given above, use that value — it is correct.
- VERB: fill "verb" with the full present tense, Präteritum and Partizip II; others null.
  Separable verbs: isSeparable true, prefix set, praesens written split, e.g. "stehe auf".
  Use auxiliary "sein" only for motion, change of state, and sein/bleiben/passieren.
  A lemma written "sich ..." is reflexive — use the verb-reflexive subcategory.
- ADJ: fill "adjective" with comparative and superlative; others null.
- PREP: choose the subcategory matching the case it governs.
- Anything else: all three of noun/verb/adjective null.
- Always add a natural exampleDe at ${level} level and its exampleEn translation.`;

      const result = await generate(genGrammarBatch, SYSTEM, prompt, key);
      if (!result) continue;

      const byLemma = new Map(chunk.map((w) => [w.lemma.toLowerCase(), w]));
      const accepted: unknown[] = [];

      for (const raw of result.words) {
        const staged = byLemma.get(raw.lemma.trim().toLowerCase());
        if (!staged) {
          console.warn(`     ✗ "${raw.lemma}": not one of the words asked for — dropped`);
          continue;
        }

        // The deck wins on lemma, level and meaning; the model only adds grammar.
        const candidate = {
          lemma: staged.lemma,
          level: staged.level,
          translationsEn: staged.translationsEn,
          pos: raw.pos,
          subcategory: raw.subcategory,
          exampleDe: staged.exampleDe ?? raw.exampleDe,
          exampleEn: staged.exampleEn ?? raw.exampleEn,
          noun: raw.noun
            ? { article: staged.article ?? raw.noun.article, plural: staged.plural ?? raw.noun.plural }
            : undefined,
          verb: raw.verb
            ? {
                ...raw.verb,
                prefix: raw.verb.prefix ?? undefined,
                praeteritum: raw.verb.praeteritum ?? undefined,
                partizip2: raw.verb.partizip2 ?? undefined,
              }
            : undefined,
          adjective: raw.adjective ?? undefined,
        };

        const parsed = wordSchema.safeParse(candidate);
        if (!parsed.success) {
          console.warn(`     ✗ ${staged.lemma}: ${parsed.error.issues[0]?.message}`);
          continue;
        }

        byLemma.delete(raw.lemma.trim().toLowerCase());
        accepted.push(parsed.data);
      }

      for (const missed of byLemma.values()) {
        console.warn(`     ! ${missed.lemma}: no entry returned — will retry on the next run`);
      }

      if (accepted.length > 0) {
        writeBatch("words", `gen-grammar-${level}-${posGuess}-b${batchNo}`, accepted);
        produced += accepted.length;
        console.log(`     ✓ wrote ${accepted.length} (running total ${produced})`);
      }
      markDone(key);
    }
  }

  console.log(`\nBackfilled ${produced} words. Run \`npm run db:seed\` to load them.`);
}

// ---------------------------------------------------------------------------

async function main() {
  if (RESET && existsSync(MANIFEST)) {
    writeFileSync(MANIFEST, JSON.stringify({ done: [] }, null, 2));
    console.log("Manifest reset — every batch will be regenerated.\n");
  }

  console.log(`Seed generation — ${WHAT}${DRY_RUN ? " (dry run)" : ""}`);
  console.log(`Model: ${MODEL}`);

  if (WHAT === "words") await generateWords();
  else if (WHAT === "exercises") await generateExercises();
  else if (WHAT === "reading") await generateReading();
  else if (WHAT === "grammar") await generateGrammar();
  else {
    console.error(`Unknown --what "${WHAT}". Use: words | exercises | reading | grammar`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
