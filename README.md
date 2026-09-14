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

The starter seed is deliberately small so the app works immediately. To expand toward
the full 3,000+ word corpus, supply your own API key and run the generator:

```bash
export ANTHROPIC_API_KEY=sk-ant-...

npm run generate:seed -- --what words --target 3000
npm run generate:seed -- --what exercises --per-tag 20
npm run generate:seed -- --what reading --per-level 6

npm run db:seed        # load whatever was generated
```

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
npm test                       # unit tests for SRS, levelling, search, answers, streaks
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
data/seed/      Committed content (JSON), loaded by prisma/seed.ts
scripts/        generate-seed (Claude API, offline), verify-e2e, smoke-routes
```

The logic in `lib/` is the single source of truth for its rules and is unit tested —
review intervals live only in `lib/srs.ts`, promotion thresholds only in
`lib/leveling.ts`, and the category tree only in `lib/taxonomy.ts` (which also
constrains what the generator may emit, so the filters and the data cannot drift).
