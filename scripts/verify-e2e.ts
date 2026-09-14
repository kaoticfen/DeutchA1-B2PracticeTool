/**
 * End-to-end check against the real database.
 *
 * Creates a throwaway user, exercises the review queue and SRS persistence,
 * verifies the scheduled intervals, then removes everything it created so the
 * app is left in a genuine first-run state.
 */

import bcrypt from "bcryptjs";
import { prisma } from "../lib/db";
import { buildReviewSession } from "../lib/review-queue";
import { applyGrade } from "../lib/review";
import { searchWords } from "../lib/dictionary";
import { DAY_MS } from "../lib/srs";
import { levelProgress, vocabBreakdown, dueCount } from "../lib/stats";

const EMAIL = "__verify__@local.test";
let failures = 0;

function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  await prisma.user.deleteMany({ where: { email: EMAIL } });
  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      name: "Verify Bot",
      passwordHash: await bcrypt.hash("verify-password", 10),
      currentLevel: "A1",
      levelMode: "AUTO",
    },
  });

  console.log("\nReview queue");
  const session = await buildReviewSession(user.id, { level: "A1" });
  check("builds a session for a brand-new user", session.cards.length > 0, `${session.cards.length} cards`);
  check("all cards are new for a new user", session.cards.every((c) => c.isNew));

  console.log("\nCategory filtering");
  const modal = await buildReviewSession(user.id, { pos: ["VERB"], subcategory: "verb-modal" });
  check("modal-verb filter returns only modal verbs",
    modal.cards.length > 0 && modal.cards.every((c) => c.subcategory === "verb-modal"),
    `${modal.cards.length} cards`);
  const derNouns = await buildReviewSession(user.id, { pos: ["NOUN"], subcategory: "noun-der" });
  check("der-noun filter returns only der nouns",
    derNouns.cards.length > 0 && derNouns.cards.every((c) => c.article === "der"),
    `${derNouns.cards.length} cards`);

  console.log("\nSRS intervals");
  const now = new Date("2026-09-13T12:00:00.000Z");
  const [a, b, c] = session.cards;
  const known = await applyGrade(user, a.wordId, "KNOWN", now);
  const shaky = await applyGrade(user, b.wordId, "SHAKY", now);
  const unknown = await applyGrade(user, c.wordId, "UNKNOWN", now);

  const days = (d: Date) => Math.round((d.getTime() - now.getTime()) / DAY_MS);
  check("KNOWN schedules +7 days", days(known.dueAt) === 7, `${days(known.dueAt)}d`);
  check("SHAKY schedules +2 days", days(shaky.dueAt) === 2, `${days(shaky.dueAt)}d`);
  check("UNKNOWN schedules +1 day", days(unknown.dueAt) === 1, `${days(unknown.dueAt)}d`);

  const persisted = await prisma.srsCard.findUnique({
    where: { userId_wordId: { userId: user.id, wordId: a.wordId } },
  });
  check("card state persisted", persisted?.state === "KNOWN", persisted?.state);
  check("review count incremented", persisted?.reviewCount === 1);

  console.log("\nLapse tracking");
  await applyGrade(user, a.wordId, "UNKNOWN", now);
  const lapsed = await prisma.srsCard.findUnique({
    where: { userId_wordId: { userId: user.id, wordId: a.wordId } },
  });
  check("KNOWN -> UNKNOWN records a lapse", lapsed?.lapses === 1, `lapses=${lapsed?.lapses}`);
  check("review count incremented again", lapsed?.reviewCount === 2);

  console.log("\nGraded cards leave the new-card pool");
  const second = await buildReviewSession(user.id, { level: "A1" });
  const graded = new Set([a.wordId, b.wordId, c.wordId]);
  check("already-graded words are not re-offered as new",
    !second.cards.some((card) => card.isNew && graded.has(card.wordId)));

  console.log("\nDictionary search");
  for (const [q, expect] of [["isst", "essen"], ["Häuser", "Haus"], ["to eat", "essen"], ["house", "Haus"], ["spricht", "sprechen"], ["älter", "alt"]] as const) {
    const hits = await searchWords(q);
    check(`"${q}" resolves to ${expect}`, hits.some((h) => h.lemma === expect),
      hits.slice(0, 3).map((h) => h.lemma).join(", ") || "no hits");
  }
  const empty = await searchWords("   ");
  check("blank query returns nothing", empty.length === 0);
  const missing = await searchWords("zzzzqqq");
  check("nonsense query returns nothing", missing.length === 0);

  console.log("\nStats");
  const breakdown = await vocabBreakdown(user.id);
  check("vocab breakdown counts graded cards", breakdown.seen === 3, `seen=${breakdown.seen}`);
  const progress = await levelProgress(user.id, "A1");
  check("level progress is computed", progress.overall >= 0 && progress.overall <= 1,
    `${Math.round(progress.overall * 100)}%`);
  check("new learner is not promotable", !progress.eligible);
  const due = await dueCount(user.id);
  check("nothing is due immediately after review", due === 0, `due=${due}`);

  await prisma.user.delete({ where: { id: user.id } });
  const gone = await prisma.user.count({ where: { email: EMAIL } });
  check("\nCleanup: temp user removed", gone === 0);

  console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) FAILED.\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
