/**
 * Imports a wordlist from an Anki .apkg export.
 *
 *   # 1. Look at what's actually in the deck before importing anything
 *   npx tsx scripts/import-anki.ts --inspect decks/goethe-a2.apkg
 *
 *   # 2. Import, naming the fields (or let it auto-detect)
 *   npx tsx scripts/import-anki.ts --file decks/goethe-a2.apkg --level A2 \
 *       --source goethe-a2 --german Wort --english Übersetzung
 *
 * Nouns whose article and plural both parse out of the deck are already
 * complete and go straight to data/seed/words/ — they cost nothing to produce.
 * Everything else lands in data/seed/imported/ for
 * `generate-seed --what grammar` to finish.
 *
 * Provenance is recorded on every row, and nothing is written until the whole
 * file has parsed, so a bad mapping can't leave half an import behind.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { readApkg, cleanField, type AnkiNote } from "../lib/apkg";
import { parseGermanField, parseTranslations } from "../lib/anki-parse";
import { importedWordSchema, wordSchema, type ImportedWord } from "../lib/seed-schema";
import { isLevel, type LevelName } from "../lib/levels";

const SEED_DIR = join(process.cwd(), "data", "seed");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
const has = (name: string) => process.argv.includes(`--${name}`);

// ---------------------------------------------------------------------------
// Inspection — always run this first on an unfamiliar deck
// ---------------------------------------------------------------------------

async function inspect(path: string) {
  const { notes, noteTypes } = await readApkg(path);

  console.log(`\n${basename(path)}`);
  console.log(`${notes.length} notes · ${noteTypes.length} note type(s)\n`);

  for (const nt of noteTypes) {
    if (nt.noteCount === 0) continue;

    console.log(`── ${nt.name}  (${nt.noteCount} notes)`);
    console.log(`   fields: ${nt.fieldNames.join(" | ") || "(unnamed)"}`);

    const samples = notes.filter((n) => n.noteTypeId === nt.id).slice(0, 3);
    for (const s of samples) {
      console.log("   ┌─");
      for (const [name, value] of Object.entries(s.fields)) {
        const clean = cleanField(value);
        if (!clean) continue;
        console.log(`   │ ${name.padEnd(16)} ${clean.slice(0, 70)}${clean.length > 70 ? "…" : ""}`);
      }
    }
    console.log();
  }

  const guess = detectFields(notes);
  console.log("Auto-detected mapping:");
  console.log(`   --german  "${guess.german ?? "(none found)"}"`);
  console.log(`   --english "${guess.english ?? "(none found)"}"`);
  console.log(
    "\nRun again with --file/--level to import. Override the mapping with --german/--english if the guess is wrong.\n",
  );
}

/**
 * Picks the German and English fields by scoring content, so an unfamiliar
 * deck imports without the field names having to be known in advance.
 */
function detectFields(notes: AnkiNote[]): { german?: string; english?: string } {
  const sample = notes.slice(0, 200);
  const names = [...new Set(sample.flatMap((n) => Object.keys(n.fields)))];

  const score = (name: string) => {
    let german = 0;
    let english = 0;
    let filled = 0;

    for (const n of sample) {
      const v = cleanField(n.fields[name] ?? "");
      if (!v) continue;
      filled++;

      if (/[äöüßÄÖÜ]/.test(v)) german += 2;
      if (/^(der|die|das)\s/i.test(v)) german += 3;
      if (/\b(ein|eine|nicht|und|ich|sich)\b/i.test(v)) german += 1;
      if (/^to\s+\w/i.test(v)) english += 3;
      if (/\b(the|a|an|of|with|and)\b/i.test(v)) english += 1;
      if (/^[\x00-\x7F]*$/.test(v)) english += 0.5;
    }

    return { german, english, filled };
  };

  const scored = names.map((name) => ({ name, ...score(name) })).filter((s) => s.filled > 0);
  if (scored.length === 0) return {};

  const german = [...scored].sort((a, b) => b.german - a.german)[0];
  const english = [...scored]
    .filter((s) => s.name !== german.name)
    .sort((a, b) => b.english - a.english)[0];

  return { german: german?.name, english: english?.name };
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

async function importDeck() {
  const path = arg("file")!;
  const levelArg = arg("level");
  if (!isLevel(levelArg)) {
    console.error(`--level must be one of A1, A2, B1, B2 (got "${levelArg ?? ""}")`);
    process.exit(1);
  }
  const level = levelArg as LevelName;
  const source = arg("source") ?? basename(path).replace(/\.apkg$/i, "");
  const limit = Number(arg("limit") ?? "0");
  const dryRun = has("dry-run");

  const { notes } = await readApkg(path);
  const detected = detectFields(notes);
  const germanField = arg("german") ?? detected.german;
  const englishField = arg("english") ?? detected.english;
  const exampleField = arg("example");

  if (!germanField || !englishField) {
    console.error(
      "Could not work out which fields hold German and English.\n" +
        "Run with --inspect first, then pass --german and --english explicitly.",
    );
    process.exit(1);
  }

  console.log(`\nImporting ${basename(path)}`);
  console.log(`  level:   ${level}`);
  console.log(`  source:  ${source}`);
  console.log(`  german:  "${germanField}"${arg("german") ? "" : " (auto-detected)"}`);
  console.log(`  english: "${englishField}"${arg("english") ? "" : " (auto-detected)"}`);
  if (exampleField) console.log(`  example: "${exampleField}"`);
  console.log();

  const complete: unknown[] = [];
  const staged: ImportedWord[] = [];
  const seen = new Set<string>();
  const skipped: { reason: string; raw: string }[] = [];

  const source_notes = limit > 0 ? notes.slice(0, limit) : notes;

  for (const note of source_notes) {
    const rawGerman = note.fields[germanField] ?? "";
    const rawEnglish = note.fields[englishField] ?? "";

    const parsed = parseGermanField(rawGerman);
    const translations = parseTranslations(rawEnglish);

    if (!parsed.lemma) {
      skipped.push({ reason: "no German lemma", raw: cleanField(rawGerman) });
      continue;
    }
    if (translations.length === 0) {
      skipped.push({ reason: "no English gloss", raw: cleanField(rawGerman) });
      continue;
    }
    if (parsed.lemma.length > 120) {
      skipped.push({ reason: "lemma too long (likely a sentence)", raw: parsed.lemma });
      continue;
    }

    const key = parsed.lemma.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const example = exampleField ? cleanField(note.fields[exampleField] ?? "") : "";

    // A noun with both article and plural is fully specified — no AI needed.
    if (parsed.posGuess === "NOUN" && parsed.article && parsed.plural) {
      const candidate = {
        lemma: parsed.lemma,
        level,
        pos: "NOUN" as const,
        subcategory: `noun-${parsed.article}`,
        translationsEn: translations,
        ...(example ? { exampleDe: example } : {}),
        noun: { article: parsed.article, plural: parsed.plural },
      };

      const check = wordSchema.safeParse(candidate);
      if (check.success) {
        complete.push(check.data);
        continue;
      }
      // Fall through to staging if it somehow fails validation.
    }

    const stagedRow: ImportedWord = {
      lemma: parsed.lemma,
      level,
      translationsEn: translations,
      posGuess: parsed.posGuess,
      article: parsed.article,
      plural: parsed.plural,
      ...(example ? { exampleDe: example } : {}),
      source,
    };

    const check = importedWordSchema.safeParse(stagedRow);
    if (!check.success) {
      skipped.push({ reason: check.error.issues[0]?.message ?? "invalid", raw: parsed.lemma });
      continue;
    }
    staged.push(check.data);
  }

  // Report before writing, so a bad mapping is obvious.
  const byGuess = new Map<string, number>();
  for (const s of staged) byGuess.set(s.posGuess ?? "unclassified", (byGuess.get(s.posGuess ?? "unclassified") ?? 0) + 1);

  console.log(`  ${complete.length} complete nouns (article + plural parsed — no generation needed)`);
  console.log(`  ${staged.length} staged for grammar backfill:`);
  for (const [k, v] of [...byGuess].sort((a, b) => b[1] - a[1])) console.log(`      ${String(v).padStart(5)}  ${k}`);
  console.log(`  ${skipped.length} skipped`);

  if (skipped.length > 0) {
    const reasons = new Map<string, number>();
    for (const s of skipped) reasons.set(s.reason, (reasons.get(s.reason) ?? 0) + 1);
    for (const [r, n] of reasons) console.log(`      ${String(n).padStart(5)}  ${r}`);
    console.log(`   e.g. ${skipped.slice(0, 3).map((s) => `"${s.raw.slice(0, 40)}"`).join(", ")}`);
  }

  console.log("\n  Sample of what was parsed:");
  for (const c of complete.slice(0, 3)) {
    const w = c as { noun: { article: string; plural: string }; lemma: string; translationsEn: string[] };
    console.log(`      ${w.noun.article} ${w.lemma}, die ${w.noun.plural} — ${w.translationsEn.join(", ")}`);
  }
  for (const s of staged.slice(0, 3)) {
    console.log(`      ${s.lemma} [${s.posGuess ?? "?"}] — ${s.translationsEn.join(", ")}`);
  }

  if (dryRun) {
    console.log("\n  --dry-run: nothing written.\n");
    return;
  }

  if (complete.length > 0) {
    mkdirSync(join(SEED_DIR, "words"), { recursive: true });
    writeFileSync(
      join(SEED_DIR, "words", `imported-${source}.json`),
      JSON.stringify(complete, null, 2) + "\n",
    );
    console.log(`\n  → data/seed/words/imported-${source}.json`);
  }

  if (staged.length > 0) {
    mkdirSync(join(SEED_DIR, "imported"), { recursive: true });
    writeFileSync(
      join(SEED_DIR, "imported", `${source}.json`),
      JSON.stringify(staged, null, 2) + "\n",
    );
    console.log(`  → data/seed/imported/${source}.json`);
  }

  console.log(
    `\nNext:\n` +
      `  npm run db:seed                                   # load the complete nouns now\n` +
      `  npm run generate:seed -- --what grammar           # fill in the rest\n`,
  );
}

async function main() {
  const inspectPath = arg("inspect");
  if (inspectPath) return inspect(inspectPath);
  if (arg("file")) return importDeck();

  console.log(
    "Usage:\n" +
      "  --inspect <file.apkg>                    show note types, fields and samples\n" +
      "  --file <file.apkg> --level A2 [options]  import\n\n" +
      "Options:\n" +
      "  --source <name>     provenance label and output filename\n" +
      "  --german <field>    field holding the German word (auto-detected otherwise)\n" +
      "  --english <field>   field holding the translation\n" +
      "  --example <field>   optional field holding an example sentence\n" +
      "  --limit <n>         only read the first n notes\n" +
      "  --dry-run           report without writing\n",
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
