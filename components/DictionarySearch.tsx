"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function DictionarySearch({ initial }: { initial: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const [, startTransition] = useTransition();

  // Debounced so typing doesn't fire a query per keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value.trim()) next.set("q", value.trim());
      else next.delete("q");

      startTransition(() => router.replace(`/dictionary?${next.toString()}`));
    }, 250);

    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <input
      className="input"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Search German, a conjugated form (isst), or English (to eat)…"
      autoComplete="off"
      autoFocus
    />
  );
}
