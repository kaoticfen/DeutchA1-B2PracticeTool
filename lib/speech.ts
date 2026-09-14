"use client";

/**
 * Web Speech API wrapper.
 *
 * German voices are an OS-level install, not something the app can ship. When
 * none is present we say so plainly instead of silently doing nothing.
 */

export type SpeechStatus = "ready" | "no-german-voice" | "unsupported";

export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function germanVoices(): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("de"));
}

export function speechStatus(): SpeechStatus {
  if (!isSpeechSupported()) return "unsupported";
  return germanVoices().length > 0 ? "ready" : "no-german-voice";
}

export function speak(text: string, opts: { rate?: number } = {}) {
  if (!isSpeechSupported()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = opts.rate ?? 0.9;

  const voice = germanVoices()[0];
  if (voice) utterance.voice = voice;

  window.speechSynthesis.speak(utterance);
}

export const SPEECH_HINT: Record<SpeechStatus, string | null> = {
  ready: null,
  "no-german-voice":
    "No German text-to-speech voice is installed on this system, so playback will use the default voice and may sound wrong. On Linux, install a German voice for speech-dispatcher (e.g. espeak-ng with the de voice).",
  unsupported: "This browser does not support the Web Speech API, so audio playback is unavailable.",
};
