# Deutsch A1–B2 Practice Tool

A locally-hosted German learning app that takes you from A1 to B2: spaced-repetition
flashcards, a searchable dictionary, grammar lessons and drills, mini games, exam prep,
and progress tracking.

Runs entirely on your machine. **The app makes no AI calls at runtime** — all content is
generated offline, committed as JSON, and loaded into MySQL.

## Quick start

```bash
nvm use                      # Node 20 (see .nvmrc)
npm install
cp .env.example .env         # then set AUTH_SECRET: openssl rand -base64 32

docker compose up -d db      # MySQL 8
npx prisma migrate deploy    # create the schema
npm run db:seed              # load the starter content

npm run dev                  # http://localhost:3000
```

The first visit lands on `/setup`, which creates your account, offers an optional
placement quiz, and sets your starting level.

To run the whole thing in Docker instead: `docker compose up`.

## What's included

| Area | What it does |
|---|---|
| **Flashcards** | Spaced repetition with three states — Known → 7 days, Shaky → 2 days, Unknown → 1 day. Category pills (Verbs, Nouns, Prepositions, Other) open a sub-category dropdown for fine-grained drilling. |
| **Dictionary** | Every word across A1–B2, searchable by German lemma, **conjugated form** (`isst` → essen), inflected form (`Häuser` → Haus) or English (`to eat` → essen). Noun detail shows the plural; verb detail shows the full present tense with a separable-verb indicator; adjective detail shows the comparative. Recently viewed is kept in `localStorage`. |
| **Lessons** | Grammar explanations with key rules, examples, and a direct link into the matching exercises. |
| **Grammar Exercises** | Multiple choice, fill-in-the-blank and sentence-building drills, filterable by level, topic and type. |
| **Daily Challenge** | Five questions a day with streak tracking and a two-week history strip. |
| **Mini Games** | Word Match, Gender Battle, Listening Quiz (Web Speech API) and Fill in the Blank. |
| **Sentence Builder** | Tap word tiles into the correct German order. |
| **Reading Mode** | Short German texts; tap any word to hear it and see its meaning. |
| **Pronunciation Guide** | 28 phonetic entries with playback. |
| **Exam Prep** | Reading, Listening, Writing, Speaking and Comprehension sections. |
| **Progress** | Scores and vocabulary mastery by level and category. |
| **Insights** | Weak vocabulary, weakest grammar topics, mistake log, and a six-month activity calendar. |
| **Cheat Sheet** | Static grammar reference per level at `/cheatsheet` — **no login required**. |

## Levelling

Your level starts from the placement quiz and then advances automatically once you
clear three gates for your current level: 80% of its vocabulary marked *Known*, 80%
rolling exercise accuracy, and at least 20 exercise attempts. You can switch to manual
levelling at any time in **Profile → Settings**.

## Growing the content

The starter seed is deliberately small so the app works immediately. There are two
ways to expand it, and they combine well.

### Importing a wordlist (recommended for vocabulary)

If you have an Anki deck — a Goethe Wortliste, a frequency list, anything with a
German field and a translation — import it. A real wordlist beats a generated one:
the words and CEFR levels are curated rather than invented.

```bash
# Fetch the four source decks into decks/
npx tsx scripts/fetch-decks.ts

# Always look first — this prints the note types, field names and sample rows
npx tsx scripts/import-anki.ts --inspect decks/goethe-a2.apkg

# Then import, one deck per level. Fields are auto-detected, but check the
# inspect output: on the A2 deck the German guess lands on the example
# sentence, so the mapping is given explicitly below.
npx tsx scripts/import-anki.ts --file decks/goethe-a1.apkg --level A1 --source goethe-a1 \
    --example de_sentence
npx tsx scripts/import-anki.ts --file decks/goethe-a2.apkg --level A2 --source goethe-a2 \
    --german Wort_DE --english Wort_EN --article Artikel --plural Plural --example Satz1_DE
npx tsx scripts/import-anki.ts --file decks/goethe-b1.apkg --level B1 --source goethe-b1 \
    --german "German Word" --english "English Word" --example "German Sentence"
npx tsx scripts/import-anki.ts --file decks/klett-b2.apkg  --level B2 --source klett-b2

npm run db:seed
```

`--article` and `--plural` matter when a deck keeps those in their own fields
instead of writing `das Angebot, -e` in one. The A2 deck does exactly that, and
naming the fields moves 492 nouns off the generation bill and onto the free path.

**Overlapping decks are handled.** Published wordlists are cumulative — the Goethe B1
list restates much of A2, which restates much of A1. A word is always kept at the level
where it is *first introduced*, and its translations are unioned across every deck it
appears in. This is decided at seed time and is order-independent, so no import sequence
can relabel basic vocabulary as B1 and skew the level counts the progression engine
depends on. The seeder reports what it merged.

`.apkg`, `.anki2`, `.anki21` and zstd-compressed `.anki21b` are all handled, with no
native build and no `sqlite3` binary needed.

Nouns whose article **and** plural both parse out of the deck are already complete —
they go straight into `data/seed/words/` and cost nothing to generate. Everything else
lands in `data/seed/imported/` for the grammar backfill below.

Decks write their plurals in whatever shorthand their author preferred, so
`lib/anki-parse.ts` reads all of these:

| Notation | Example | Result |
|---|---|---|
| `-e`, `-en`, `-s`, `-nen` | `die Ansage, -n` | Ansagen |
| `-` or `–` | `das Brötchen, –` | Brötchen (unchanged) |
| `¨-er`, `"-e` | `die Nacht, ¨-e` | Nächte |
| `-ä, er` | `das Haus, -ä, er` | Häuser |
| spelled out | `der Apfel, die Äpfel` | Äpfel |
| `(Sg.)`, `(Pl.)` | `das Alter, (Sg.)` | left to the backfill |

Headwords get the same treatment. A hanging hyphen is notation rather than
spelling, so `dies-`, `Bio-` and `-einander` lose it; a pipe marking the
separable boundary goes too, so `ab|biegen` is filed under `abbiegen`. Where a
deck appends a *different* word — a regional variant after `->`, a feminine
counterpart after `;` — everything past the marker is cut, because otherwise
`der Absender, -; die Absenderin, nen` ends up with the plural
`Absender; die Absenderin, nen`. A bracketed part glued to the word is joined
instead of dropped (`(herunter-)fahren` → `herunterfahren`), since dropping it
would file the gloss "to shut down" under plain `fahren`.

The counterpart after a `;` is discarded rather than imported as its own entry.
Most of those feminine forms have their own note elsewhere in the deck; any that
do not are simply absent.

The umlaut lands on the last umlautable stem vowel, which is what gives compounds
the right answer (`Bahnhof` → `Bahnhöfe`), and `au` umlauts as a unit (`Haus` →
`Häuser`). Where a deck contradicts itself — `die Adresse, -en` would glue into
`Adresseen` — the word is handed to the backfill rather than given an invented
plural.

Add `--dry-run` to see the parse report without writing anything. Deck files themselves
are gitignored — import from them, commit the derived JSON.

#### Source decks

The decks this project was built around, all from AnkiWeb:

| Level | Deck | Source material |
|---|---|---|
| A1 | [734416507](https://ankiweb.net/shared/info/734416507) | Goethe-Institut wordlist |
| A2 | [1386119660](https://ankiweb.net/shared/info/1386119660) — *A2 Wortliste Goethe* | Goethe-Institut wordlist |
| B1 | [1535528691](https://ankiweb.net/shared/info/1535528691) — *B1 Goethe Wordlist Learning Deck* | Goethe-Institut / DTZ wordlist |
| B2 | [1185202095](https://ankiweb.net/shared/info/1185202095) — *German B2 Wordlist from Klett Kontext* | Klett *Kontext* B2 coursebook |

`scripts/fetch-decks.ts` downloads all four. AnkiWeb caps **anonymous downloads at
two**, then answers `429 Please log in to download more decks.` — so the last two
need a signed-in session cookie:

```bash
ANKIWEB_COOKIE='ankiweb=...' npx tsx scripts/fetch-decks.ts
```

Copy the cookie from a browser signed in to AnkiWeb (DevTools → Application →
Cookies → `https://ankiweb.net`). Failing that, open each page by hand, click
Download, and drop the `.apkg` into `decks/`.

The A1–B1 decks reproduce Goethe-Institut wordlists and the B2 deck a Klett coursebook;
all are third-party uploads reproducing published material. Studying from them is
ordinary use. Committing the **derived** JSON is a separate question, and worth a
thought here specifically because **this repository is public** — `.apkg` files are
gitignored, but `data/seed/words/imported-*.json` and `data/seed/imported/*.json` are
not. If you would rather keep the extracted wordlists out of the public repo, add:

```gitignore
data/seed/words/imported-*.json
data/seed/imported/
```

The app works either way; those files can be regenerated from the decks at any time.

### Generating

```bash
export ANTHROPIC_API_KEY=sk-ant-...

# Fill in grammar for imported words — conjugations, plurals, comparatives,
# subcategory. The deck stays authoritative for lemma, level and meaning.
npm run generate:seed -- --what grammar

# Or generate vocabulary from scratch, if you have no wordlist to import
npm run generate:seed -- --what words --target 3000

npm run generate:seed -- --what exercises --per-tag 20
npm run generate:seed -- --what reading --per-level 6

npm run db:seed        # load whatever was generated
```

Prefer `--what grammar` over `--what words` when you have a deck: it is cheaper (only
the grammar is generated, not the word list) and more accurate (no invented vocabulary,
no mislabelled levels).

### Knowing what a run will cost

Every mode reports its measured token usage and cost when it finishes, and the grammar
backfill prints the batch count and a rough estimate *before* doing any work:

```
Plan: 4682 words in 240 batch(es) of up to 20.
Rough estimate: $30.67 — an estimate only, since adaptive thinking
makes output length hard to predict.
```

`--dry-run` shows that plan without spending anything. The estimate is deliberately
crude; the reliable approach is to run one level (`--level A1`), read the reported
spend, and scale from a real number.

Two things keep the bill down on their own: duplicates across cumulative decks are
collapsed before generation, so a word restated in three wordlists is generated once;
and nouns whose article and plural came out of the deck never reach the model at all.

- Add `--dry-run` to see what would be requested without spending anything.
- Output is validated against `lib/seed-schema.ts` before it is written, so malformed
  content is rejected at the file boundary rather than surfacing as broken UI.
- Progress is tracked in `data/seed/.manifest.json`, so an interrupted run resumes
  instead of paying for the same batches twice. `--reset` clears it.
- Everything is written as reviewable JSON under `data/seed/` — check the diff before
  committing. Reaching 3,000 words takes a few passes.

Re-seeding is idempotent and keyed on natural keys, so it never duplicates content and
never discards your review history or scores.

## Tests

```bash
npm test                       # unit tests: SRS, levelling, search, answers, streaks,
                               #   Anki parsing, and the .apkg reader
npx tsx scripts/verify-e2e.ts  # end-to-end checks against the database
./scripts/smoke-routes.sh      # every route renders (needs a running dev server)
```

`verify-e2e.ts` creates a throwaway user and deletes it afterwards.

## Notes

- **Audio** uses the Web Speech API and depends on a German TTS voice being installed on
  your system. Without one, the app says so rather than failing silently. On Linux,
  install a German voice for speech-dispatcher (e.g. `espeak-ng` with the `de` voice).
- **Writing and Speaking exam sections are self-assessed.** There is no automated grader
  for free-form German in a fully local app; you compare against a model answer and mark
  yourself.

## Layout

```
app/            Next.js App Router — (app) is authenticated, /cheatsheet is public
components/     UI; games/ and exam/ hold the interactive runners
lib/            Core logic — srs, leveling, search, forms, taxonomy, answers, streak
                Import path — apkg (zip/SQLite reader), anki-parse (field parsing)
data/seed/      Committed content (JSON), loaded by prisma/seed.ts
scripts/        fetch-decks (AnkiWeb), import-anki, generate-seed (Claude API,
                offline), verify-e2e, smoke-routes
```

The logic in `lib/` is the single source of truth for its rules and is unit tested —
review intervals live only in `lib/srs.ts`, promotion thresholds only in
`lib/leveling.ts`, and the category tree only in `lib/taxonomy.ts` (which also
constrains what the generator may emit, so the filters and the data cannot drift).

## Known gaps

- **Exam items and lessons have no generator.** Both are hand-authored: 20 exam items
  (one per section per level) and 18 lessons. The exam bank is the thinnest part of the
  app and will be exhausted quickly. `--what` currently covers `words`, `exercises`,
  `reading` and `grammar` only.
- **Writing and Speaking are self-assessed**, as above — there is no automated grader
  for free-form German.
- **Audio depends on a system German TTS voice.** The app reports its absence rather
  than failing silently, but it cannot supply one.
