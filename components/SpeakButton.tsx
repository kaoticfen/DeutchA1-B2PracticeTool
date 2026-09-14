"use client";

import { useEffect, useState } from "react";
import { SPEECH_HINT, speak, speechStatus, type SpeechStatus } from "@/lib/speech";

export function SpeakButton({
  text,
  label = "Listen",
  rate,
  className = "btn btn-ghost",
}: {
  text: string;
  label?: string;
  rate?: number;
  className?: string;
}) {
  const [status, setStatus] = useState<SpeechStatus>("ready");

  useEffect(() => {
    const update = () => setStatus(speechStatus());
    update();
    // Voices load asynchronously in most browsers.
    window.speechSynthesis?.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis?.removeEventListener("voiceschanged", update);
  }, []);

  if (status === "unsupported") return null;

  return (
    <button
      className={className}
      onClick={() => speak(text, { rate })}
      title={SPEECH_HINT[status] ?? `Play “${text}”`}
    >
      <span aria-hidden>♪</span> {label}
      {status === "no-german-voice" && <span className="muted ml-1 text-xs">(no de voice)</span>}
    </button>
  );
}
