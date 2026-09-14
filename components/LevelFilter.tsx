"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LEVELS } from "@/lib/levels";

export function LevelFilter({ basePath }: { basePath: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const active = params.get("level");

  function set(level: string | null) {
    const q = new URLSearchParams(params.toString());
    if (level) q.set("level", level);
    else q.delete("level");
    router.replace(`${basePath}?${q.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button className="pill" data-active={!active} onClick={() => set(null)}>
        All levels
      </button>
      {LEVELS.map((l) => (
        <button
          key={l}
          className="pill"
          data-active={active === l}
          onClick={() => set(active === l ? null : l)}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
