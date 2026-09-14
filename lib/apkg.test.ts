import { afterAll, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import AdmZip from "adm-zip";
import initSqlJs from "sql.js";
import { readApkg } from "./apkg";

/**
 * Builds a real .apkg (zip + SQLite) so the reader is tested against the actual
 * file format rather than a mock — the format is the risky part.
 */
async function buildApkg(
  dir: string,
  name: string,
  opts: { entryName?: string; schema?: "legacy" | "modern"; extraEntry?: string } = {},
) {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const schema = opts.schema ?? "legacy";

  db.run(`CREATE TABLE notes (
    id INTEGER PRIMARY KEY, guid TEXT, mid INTEGER, mod INTEGER, usn INTEGER,
    tags TEXT, flds TEXT, sfld TEXT, csum INTEGER, flags INTEGER, data TEXT)`);

  if (schema === "legacy") {
    const models = {
      "1500000000000": {
        name: "Goethe Wortliste",
        flds: [
          { name: "Wort", ord: 0 },
          { name: "Übersetzung", ord: 1 },
          { name: "Beispiel", ord: 2 },
        ],
      },
    };
    db.run(`CREATE TABLE col (id INTEGER PRIMARY KEY, models TEXT, decks TEXT)`);
    db.run(`INSERT INTO col (id, models, decks) VALUES (1, ?, '{}')`, [JSON.stringify(models)]);
  } else {
    db.run(`CREATE TABLE notetypes (id INTEGER PRIMARY KEY, name TEXT)`);
    db.run(`CREATE TABLE fields (ntid INTEGER, ord INTEGER, name TEXT)`);
    db.run(`INSERT INTO notetypes (id, name) VALUES (1500000000000, 'Goethe Wortliste')`);
    for (const [ord, fname] of ["Wort", "Übersetzung", "Beispiel"].entries()) {
      db.run(`INSERT INTO fields (ntid, ord, name) VALUES (1500000000000, ?, ?)`, [ord, fname]);
    }
    db.run(`CREATE TABLE col (id INTEGER PRIMARY KEY, models TEXT, decks TEXT)`);
    db.run(`INSERT INTO col (id, models, decks) VALUES (1, '{}', '{}')`);
  }

  const S = "\x1f";
  const rows: [number, string, string][] = [
    [1, `das Haus, ¨-er${S}house${S}Das Haus ist groß.`, "Haus"],
    [2, `der Apfel, die Äpfel${S}apple${S}`, "Apfel"],
    [3, `<b>gehen</b> [sound:g.mp3]${S}to go; to walk${S}Ich gehe nach Hause.`, "gehen"],
    [4, `schnell${S}fast, quick${S}`, "schnell"],
    [5, `die Frau${S}woman; wife${S}`, "Frau"],
  ];

  for (const [id, flds, sfld] of rows) {
    db.run(
      `INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
       VALUES (?, ?, 1500000000000, 0, 0, 'goethe a2', ?, ?, 0, 0, '')`,
      [id, `g${id}`, flds, sfld],
    );
  }

  const bytes = Buffer.from(db.export());
  db.close();

  const zip = new AdmZip();
  zip.addFile(opts.entryName ?? "collection.anki2", bytes);
  if (opts.extraEntry) zip.addFile(opts.extraEntry, bytes);
  zip.addFile("media", Buffer.from("{}"));

  const path = join(dir, name);
  zip.writeZip(path);
  return path;
}

const dir = mkdtempSync(join(tmpdir(), "apkg-test-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("readApkg", () => {
  it("reads notes from a legacy collection.anki2", async () => {
    const { notes } = await readApkg(await buildApkg(dir, "legacy.apkg"));
    expect(notes).toHaveLength(5);
  });

  it("maps field values to the note type's field names", async () => {
    const { notes } = await readApkg(await buildApkg(dir, "names.apkg"));
    const haus = notes.find((n) => n.fields["Wort"]?.includes("Haus"));
    expect(haus?.fields["Übersetzung"]).toBe("house");
    expect(haus?.fields["Beispiel"]).toBe("Das Haus ist groß.");
  });

  it("reads field names from the modern notetypes/fields tables", async () => {
    const { notes, noteTypes } = await readApkg(
      await buildApkg(dir, "modern.apkg", { schema: "modern" }),
    );
    expect(noteTypes[0].fieldNames).toEqual(["Wort", "Übersetzung", "Beispiel"]);
    expect(notes[0].fields["Wort"]).toContain("Haus");
  });

  it("reports note types with their counts", async () => {
    const { noteTypes } = await readApkg(await buildApkg(dir, "types.apkg"));
    expect(noteTypes[0].name).toBe("Goethe Wortliste");
    expect(noteTypes[0].noteCount).toBe(5);
  });

  it("splits tags", async () => {
    const { notes } = await readApkg(await buildApkg(dir, "tags.apkg"));
    expect(notes[0].tags).toEqual(["goethe", "a2"]);
  });

  it("preserves field order independently of names", async () => {
    const { notes } = await readApkg(await buildApkg(dir, "ordered.apkg"));
    expect(notes[0].ordered[0]).toContain("Haus");
    expect(notes[0].ordered[1]).toBe("house");
  });

  it("prefers collection.anki21 over the legacy collection.anki2", async () => {
    const path = await buildApkg(dir, "both.apkg", {
      entryName: "collection.anki2",
      extraEntry: "collection.anki21",
    });
    // Both parse identically here; the point is that it picks one and succeeds.
    const { notes } = await readApkg(path);
    expect(notes).toHaveLength(5);
  });

  it("throws a useful error when there is no collection inside", async () => {
    const zip = new AdmZip();
    zip.addFile("media", Buffer.from("{}"));
    const path = join(dir, "empty.apkg");
    zip.writeZip(path);

    await expect(readApkg(path)).rejects.toThrow(/No collection database/);
  });
});
