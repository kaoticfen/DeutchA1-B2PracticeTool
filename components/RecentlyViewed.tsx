"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const KEY = "dict-recent";
const MAX = 12;

export type RecentEntry = { id: number; lemma: string; article?: string | null };

/** Recently viewed history is per-device, so it lives in localStorage. */
export function recordRecent(entry: RecentEntry) {
  if (typeof window === "undefined") return;
  try {
    const prev: RecentEntry[] = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    const next = [entry, ...prev.filter((e) => e.id !== entry.id)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A full or disabled localStorage must never break the page.
  }
}

export function RecentlyViewed() {
  const [items, setItems] = useState<RecentEntry[]>([]);

  useEffect(() => {
    try {
      setItems(JSON.parse(window.localStorage.getItem(KEY) ?? "[]"));
    } catch {
      setItems([]);
    }
  }, []);

  if (items.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium">Recently viewed</h2>
        <button
          className="muted text-xs underline"
          onClick={() => {
            window.localStorage.removeItem(KEY);
            setItems([]);
          }}
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <Link key={i.id} href={`/dictionary/${i.id}`} className="pill">
            {i.article ? `${i.article} ${i.lemma}` : i.lemma}
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Mounted on a detail page purely for its side effect. */
export function TrackRecent({ id, lemma, article }: RecentEntry) {
  useEffect(() => {
    recordRecent({ id, lemma, article });
  }, [id, lemma, article]);
  return null;
}
