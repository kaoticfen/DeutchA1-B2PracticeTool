/**
 * Placement quiz. Three questions per level, ordered easiest-first.
 * Scored by `scorePlacement` in lib/leveling.ts: the highest level the learner
 * clears at >= 80% becomes their starting level.
 *
 * Deliberately small and hand-authored — it runs once, before any content is
 * seeded, so it must not depend on the database.
 */

import type { LevelName } from "./levels";

export type PlacementQuestion = {
  level: LevelName;
  prompt: string;
  options: string[];
  /** Index into `options`. */
  answer: number;
  explanation: string;
};

export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  {
    level: "A1",
    prompt: "Ich ___ aus Deutschland.",
    options: ["bin", "bist", "ist", "sind"],
    answer: 0,
    explanation: "ich → bin. The verb sein is irregular: ich bin, du bist, er ist.",
  },
  {
    level: "A1",
    prompt: "Which article goes with „Mädchen“?",
    options: ["der", "die", "das", "den"],
    answer: 2,
    explanation: "Nouns ending in -chen are always neuter, so it is das Mädchen.",
  },
  {
    level: "A1",
    prompt: "Wie alt ___ du?",
    options: ["bin", "bist", "ist", "seid"],
    answer: 1,
    explanation: "du → bist.",
  },
  {
    level: "A2",
    prompt: "Gestern ___ ich ins Kino gegangen.",
    options: ["habe", "bin", "war", "hatte"],
    answer: 1,
    explanation: "Verbs of motion like gehen form the Perfekt with sein: ich bin gegangen.",
  },
  {
    level: "A2",
    prompt: "Ich fahre ___ dem Bus zur Arbeit.",
    options: ["mit", "für", "ohne", "durch"],
    answer: 0,
    explanation: "mit takes the dative and is the standard preposition for transport.",
  },
  {
    level: "A2",
    prompt: "Er ist größer ___ seine Schwester.",
    options: ["wie", "als", "wenn", "dann"],
    answer: 1,
    explanation: "Comparatives use als. wie is only for equality (so groß wie).",
  },
  {
    level: "B1",
    prompt: "Ich weiß nicht, ob er heute ___.",
    options: ["kommt", "kommen", "kam", "käme"],
    answer: 0,
    explanation: "In an ob-clause the conjugated verb goes last: …ob er heute kommt.",
  },
  {
    level: "B1",
    prompt: "Das ist der Mann, ___ ich gestern getroffen habe.",
    options: ["der", "den", "dem", "dessen"],
    answer: 1,
    explanation: "treffen takes an accusative object, so the relative pronoun is den.",
  },
  {
    level: "B1",
    prompt: "Wenn ich Zeit ___, würde ich mehr reisen.",
    options: ["habe", "hätte", "hatte", "haben"],
    answer: 1,
    explanation: "Unreal conditions use Konjunktiv II: wenn ich Zeit hätte.",
  },
  {
    level: "B2",
    prompt: "Das Haus ___ letztes Jahr renoviert.",
    options: ["wurde", "würde", "worden", "war"],
    answer: 0,
    explanation: "Passive in the Präteritum: wurde + Partizip II.",
  },
  {
    level: "B2",
    prompt: "___ des schlechten Wetters blieben wir zu Hause.",
    options: ["Wegen", "Trotz", "Während", "Statt"],
    answer: 0,
    explanation: "wegen + genitive gives the reason. trotz would contradict the outcome.",
  },
  {
    level: "B2",
    prompt: "Er behauptet, er ___ nichts davon gewusst.",
    options: ["hat", "habe", "hätte", "haben"],
    answer: 1,
    explanation: "Reported speech uses Konjunktiv I: er habe nichts gewusst.",
  },
];
