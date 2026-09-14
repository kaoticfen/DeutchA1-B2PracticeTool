/** Ad-hoc smoke check that dictionary lookup resolves inflections. */
import { PrismaClient } from "@prisma/client";
import { normalize } from "../lib/search";

const prisma = new PrismaClient();

async function look(q: string) {
  const n = normalize(q);
  const byForm = await prisma.wordForm.findMany({
    where: { searchForm: n },
    include: { word: true },
    take: 3,
  });
  const byTrans = await prisma.translation.findMany({ where: { searchText: n }, take: 3 });
  const transWords = byTrans.length
    ? await prisma.word.findMany({ where: { id: { in: byTrans.map((t) => t.wordId) } } })
    : [];

  console.log(
    `"${q}" -> [${n}]  forms: ${
      byForm.map((f) => `${f.word.lemma}(${f.formType})`).join(", ") || "—"
    }  |  english: ${transWords.map((w) => w.lemma).join(", ") || "—"}`,
  );
}

(async () => {
  for (const q of ["isst", "Häuser", "to eat", "eat", "gegessen", "fährt", "stehe auf", "älter", "der Hund", "STRASSE", "house", "spricht"]) {
    await look(q);
  }
  await prisma.$disconnect();
})();
