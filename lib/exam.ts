/** The five exam sections, shared by the index, section and item pages. */
export const EXAM_SECTIONS = [
  { key: "READING", slug: "reading", label: "Reading", icon: "❐", blurb: "Texts with comprehension questions." },
  { key: "LISTENING", slug: "listening", label: "Listening", icon: "♪", blurb: "Spoken passages you answer from memory." },
  { key: "WRITING", slug: "writing", label: "Writing", icon: "✎", blurb: "Guided tasks with a model answer to compare against." },
  { key: "SPEAKING", slug: "speaking", label: "Speaking", icon: "☏", blurb: "Prompted speaking tasks with a timer." },
  { key: "COMPREHENSION", slug: "comprehension", label: "Comprehension", icon: "◎", blurb: "Short texts testing precise understanding." },
] as const;

export type ExamSectionMeta = (typeof EXAM_SECTIONS)[number];
