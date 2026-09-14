"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { TAXONOMY, type PosName } from "@/lib/taxonomy";

/**
 * Category pills that reveal a sub-category dropdown once a pill is active —
 * the two-step filter described in the product spec.
 */
export function CategoryFilter({ basePath }: { basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();

  const activePos = params.get("pos") as PosName | null;
  const activeSub = params.get("sub");
  const category = TAXONOMY.find((c) => c.pos === activePos);

  function update(next: { pos?: string | null; sub?: string | null }) {
    const q = new URLSearchParams(params.toString());

    if (next.pos !== undefined) {
      if (next.pos) q.set("pos", next.pos);
      else q.delete("pos");
      // Changing category invalidates any sub-category from the old one.
      q.delete("sub");
    }
    if (next.sub !== undefined) {
      if (next.sub) q.set("sub", next.sub);
      else q.delete("sub");
    }

    router.replace(`${basePath}?${q.toString()}`);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button className="pill" data-active={!activePos} onClick={() => update({ pos: null })}>
          All
        </button>
        {TAXONOMY.map((c) => (
          <button
            key={c.pos}
            className="pill"
            data-active={activePos === c.pos}
            onClick={() => update({ pos: activePos === c.pos ? null : c.pos })}
          >
            {c.label}
          </button>
        ))}
      </div>

      {category && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="muted text-xs" htmlFor="subcategory">
            Narrow down:
          </label>
          <select
            id="subcategory"
            className="input max-w-xs py-1.5 text-sm"
            value={activeSub ?? ""}
            onChange={(e) => update({ sub: e.target.value || null })}
          >
            <option value="">All {category.label.toLowerCase()}</option>
            {category.subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          {activeSub && (
            <span className="muted text-xs">
              {category.subcategories.find((s) => s.id === activeSub)?.hint ?? ""}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
