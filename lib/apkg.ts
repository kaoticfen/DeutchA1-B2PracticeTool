/**
 * Reads an Anki .apkg export.
 *
 * An .apkg is a zip holding a SQLite collection. Anki has shipped three
 * variants over the years and shared decks are a mix of all of them:
 *   collection.anki2    — legacy schema, plain SQLite
 *   collection.anki21   — newer schema, plain SQLite
 *   collection.anki21b  — newer schema, zstd-compressed
 *
 * Everything here is pure JS (sql.js is WebAssembly), so importing needs no
 * native build and no sqlite3 binary on the host.
 */

import AdmZip from "adm-zip";
import { decompress as zstdDecompress } from "fzstd";
import initSqlJs, { type Database } from "sql.js";

export type AnkiNote = {
  id: number;
  noteTypeId: number;
  noteTypeName: string;
  tags: string[];
  /** Field values keyed by the note type's own field names. */
  fields: Record<string, string>;
  /** The same values in declared order, for when names are unhelpful. */
  ordered: string[];
};

export type AnkiNoteType = {
  id: number;
  name: string;
  fieldNames: string[];
  noteCount: number;
};

/** Anki joins a note's field values with the unit-separator character. */
const FIELD_SEP = "\x1f";

function openCollection(apkgPath: string): Promise<Database> {
  const zip = new AdmZip(apkgPath);
  const names = zip.getEntries().map((e) => e.entryName);

  // Prefer the newest schema present; .anki21b needs decompressing first.
  const pick =
    names.find((n) => n === "collection.anki21b") ??
    names.find((n) => n === "collection.anki21") ??
    names.find((n) => n === "collection.anki2");

  if (!pick) {
    throw new Error(
      `No collection database inside ${apkgPath}. Entries: ${names.slice(0, 10).join(", ")}`,
    );
  }

  let bytes = zip.readFile(pick);
  if (!bytes) throw new Error(`Could not read ${pick} from ${apkgPath}`);

  if (pick.endsWith(".anki21b")) {
    bytes = Buffer.from(zstdDecompress(new Uint8Array(bytes)));
  }

  return initSqlJs().then((SQL) => new SQL.Database(new Uint8Array(bytes!)));
}

function rows(db: Database, sql: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  const stmt = db.prepare(sql);
  while (stmt.step()) out.push(stmt.getAsObject() as Record<string, unknown>);
  stmt.free();
  return out;
}

function tableExists(db: Database, name: string): boolean {
  return rows(db, `SELECT name FROM sqlite_master WHERE type='table' AND name='${name}'`).length > 0;
}

/**
 * Field names live in two different places depending on schema version:
 * the legacy `col.models` JSON blob, or the newer `notetypes`/`fields` tables.
 */
function readNoteTypes(db: Database): Map<number, { name: string; fieldNames: string[] }> {
  const map = new Map<number, { name: string; fieldNames: string[] }>();

  if (tableExists(db, "notetypes") && tableExists(db, "fields")) {
    for (const nt of rows(db, "SELECT id, name FROM notetypes")) {
      const id = Number(nt.id);
      const fieldNames = rows(db, `SELECT name FROM fields WHERE ntid = ${id} ORDER BY ord`).map(
        (f) => String(f.name),
      );
      map.set(id, { name: String(nt.name), fieldNames });
    }
    if (map.size > 0) return map;
  }

  const col = rows(db, "SELECT models FROM col LIMIT 1")[0];
  if (col?.models) {
    const models = JSON.parse(String(col.models)) as Record<
      string,
      { name: string; flds: { name: string; ord: number }[] }
    >;
    for (const [id, model] of Object.entries(models)) {
      map.set(Number(id), {
        name: model.name,
        fieldNames: [...model.flds].sort((a, b) => a.ord - b.ord).map((f) => f.name),
      });
    }
  }

  return map;
}

export async function readApkg(apkgPath: string): Promise<{
  notes: AnkiNote[];
  noteTypes: AnkiNoteType[];
}> {
  const db = await openCollection(apkgPath);

  try {
    const types = readNoteTypes(db);
    const notes: AnkiNote[] = [];

    for (const r of rows(db, "SELECT id, mid, tags, flds FROM notes")) {
      const noteTypeId = Number(r.mid);
      const type = types.get(noteTypeId);
      const ordered = String(r.flds ?? "").split(FIELD_SEP);

      const fields: Record<string, string> = {};
      const names = type?.fieldNames ?? [];
      ordered.forEach((value, i) => {
        fields[names[i] ?? `field${i + 1}`] = value;
      });

      notes.push({
        id: Number(r.id),
        noteTypeId,
        noteTypeName: type?.name ?? `unknown-${noteTypeId}`,
        tags: String(r.tags ?? "").trim().split(/\s+/).filter(Boolean),
        fields,
        ordered,
      });
    }

    const counts = new Map<number, number>();
    for (const n of notes) counts.set(n.noteTypeId, (counts.get(n.noteTypeId) ?? 0) + 1);

    const noteTypes: AnkiNoteType[] = [...types.entries()].map(([id, t]) => ({
      id,
      name: t.name,
      fieldNames: t.fieldNames,
      noteCount: counts.get(id) ?? 0,
    }));

    return { notes, noteTypes };
  } finally {
    db.close();
  }
}

/** Anki fields carry HTML, media refs and non-breaking spaces. Strip to text. */
export function cleanField(raw: string): string {
  return raw
    .replace(/\[sound:[^\]]*\]/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<div[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
