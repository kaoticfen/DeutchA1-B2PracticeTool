"use client";

import { useState, useTransition } from "react";
import { resetProgress } from "@/lib/actions/profile-actions";

export function ResetProgressButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button className="btn btn-ghost" onClick={() => setConfirming(true)}>
        Reset all progress
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm">
        This permanently deletes every review, score and streak. Your account stays.
      </span>
      <button
        className="btn"
        style={{ background: "var(--color-unknown-500)", color: "white" }}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await resetProgress();
            setConfirming(false);
          })
        }
      >
        {pending ? "Resetting…" : "Yes, delete it all"}
      </button>
      <button className="btn btn-ghost" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </div>
  );
}
