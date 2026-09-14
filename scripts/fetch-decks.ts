/**
 * Downloads the source decks from AnkiWeb into decks/.
 *
 *   npx tsx scripts/fetch-decks.ts                 # the four decks in the README
 *   npx tsx scripts/fetch-decks.ts --id 734416507 --out goethe-a1
 *
 * AnkiWeb's deck pages are a JavaScript app, so there is no download link in
 * the HTML to follow. The page itself calls two endpoints, and so does this:
 * `item-info` returns a protobuf carrying a short-lived download key, and
 * `download-deck` exchanges that key for the .apkg.
 *
 * Anonymous downloads are capped at two, after which the server returns 429
 * "Please log in to download more decks." Pass a logged-in session cookie to
 * get past that:
 *
 *   ANKIWEB_COOKIE='...' npx tsx scripts/fetch-decks.ts
 *
 * ANKIWEB_COOKIE is also read from .env, which is where it belongs: it is a
 * live credential for your AnkiWeb account, and .env is gitignored. Copy the
 * whole Cookie request header from a browser signed in to AnkiWeb — DevTools →
 * Network → any ankiweb.net request → Request Headers → Cookie. Taking the
 * whole header avoids having to know which cookie carries the session.
 *
 * Deck files are gitignored on purpose: import from them, commit the derived
 * JSON under data/seed/.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// .env is gitignored and already holds this project's other credentials, so
// ANKIWEB_COOKIE belongs there rather than in a shell history.
if (existsSync(join(process.cwd(), ".env"))) process.loadEnvFile();

const DECKS_DIR = join(process.cwd(), "decks");

/** The decks this project was built around. See the README for provenance. */
const DECKS = [
  { id: 734416507, name: "goethe-a1", level: "A1" },
  { id: 1386119660, name: "goethe-a2", level: "A2" },
  { id: 1535528691, name: "goethe-b1", level: "B1" },
  { id: 1185202095, name: "klett-b2", level: "B2" },
];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

// ---------------------------------------------------------------------------
// Just enough protobuf to read one string field out of the response
// ---------------------------------------------------------------------------

type Field = { no: number; wire: number; bytes?: Buffer };

/** Walks the wire format. Returns null on anything that isn't valid protobuf. */
function readFields(buf: Buffer): Field[] | null {
  const out: Field[] = [];
  let p = 0;

  const varint = () => {
    let value = 0n;
    let shift = 0n;
    while (p < buf.length) {
      const b = buf[p++];
      value |= BigInt(b & 0x7f) << shift;
      if (!(b & 0x80)) return value;
      shift += 7n;
    }
    return value;
  };

  while (p < buf.length) {
    const key = Number(varint());
    const no = key >> 3;
    const wire = key & 7;
    if (no === 0) return null;

    if (wire === 0) {
      varint();
      out.push({ no, wire });
    } else if (wire === 2) {
      const len = Number(varint());
      if (p + len > buf.length) return null;
      out.push({ no, wire, bytes: buf.subarray(p, p + len) });
      p += len;
    } else if (wire === 5) {
      if (p + 4 > buf.length) return null;
      p += 4;
      out.push({ no, wire });
    } else if (wire === 1) {
      if (p + 8 > buf.length) return null;
      p += 8;
      out.push({ no, wire });
    } else {
      return null;
    }
  }
  return out;
}

/**
 * Finds the deck-info message's download key. It is field 5, shaped as a
 * base64 payload, a dot, then a signature — distinctive enough to match on,
 * which avoids depending on which optional sibling fields a deck happens to
 * set (decks with no audio omit that counter entirely).
 */
function findDownloadKey(buf: Buffer, depth = 0): string | null {
  const fields = readFields(buf);
  if (!fields || depth > 6) return null;

  for (const f of fields) {
    if (f.no !== 5 || !f.bytes) continue;
    const s = f.bytes.toString("utf8");
    if (/^[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}$/.test(s)) return s;
  }
  for (const f of fields) {
    if (!f.bytes) continue;
    const hit = findDownloadKey(f.bytes, depth + 1);
    if (hit) return hit;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchDeck(id: number, name: string, cookie?: string) {
  const target = join(DECKS_DIR, `${name}.apkg`);
  if (existsSync(target)) {
    console.log(`  ${name}.apkg  already present, skipping`);
    return true;
  }

  const headers = cookie ? { cookie } : undefined;

  const info = await fetch(`https://ankiweb.net/svc/shared/item-info?sharedId=${id}`, { headers });
  if (!info.ok) {
    console.log(`  ${name}: item-info failed (${info.status})`);
    return false;
  }

  const key = findDownloadKey(Buffer.from(await info.arrayBuffer()));
  if (!key) {
    console.log(`  ${name}: no download key in the response — the API may have changed`);
    return false;
  }

  const res = await fetch(
    `https://ankiweb.net/svc/shared/download-deck/${id}?t=${encodeURIComponent(key)}`,
    { headers },
  );
  if (!res.ok) {
    const detail = (await res.text()).trim().slice(0, 120);
    console.log(`  ${name}: download failed (${res.status}) ${detail}`);
    if (res.status === 429 && !cookie) {
      console.log("      Anonymous downloads are capped. Set ANKIWEB_COOKIE and re-run.");
    }
    return false;
  }

  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(DECKS_DIR, { recursive: true });
  writeFileSync(target, buf);
  console.log(`  ${name}.apkg  ${(buf.length / 1e6).toFixed(1)} MB`);
  return true;
}

async function main() {
  const cookie = process.env.ANKIWEB_COOKIE ?? arg("cookie");
  const one = arg("id");

  const wanted = one
    ? [{ id: Number(one), name: arg("out") ?? one, level: "" }]
    : DECKS;

  console.log(`\nFetching into decks/${cookie ? "  (using ANKIWEB_COOKIE)" : ""}\n`);

  let ok = 0;
  for (const d of wanted) {
    if (await fetchDeck(d.id, d.name, cookie)) ok++;
  }

  console.log(`\n${ok}/${wanted.length} available.`);
  if (ok < wanted.length) {
    console.log(
      "Decks that did not come down can be fetched by hand: open\n" +
        "https://ankiweb.net/shared/info/<id>, click Download, and save into decks/.",
    );
  }
  console.log("\nNext: npx tsx scripts/import-anki.ts --inspect decks/<file>.apkg\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
