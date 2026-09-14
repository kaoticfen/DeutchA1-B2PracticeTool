export type NavItem = { href: string; label: string; icon: string; group: string };

/** Single source of truth for the sidebar and the dashboard tile grid. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "◉", group: "Overview" },

  { href: "/flashcards", label: "Flashcards", icon: "▤", group: "Practice" },
  { href: "/dictionary", label: "Dictionary", icon: "⌕", group: "Practice" },
  { href: "/exercises", label: "Grammar Exercises", icon: "✎", group: "Practice" },
  { href: "/daily", label: "Daily Challenge", icon: "★", group: "Practice" },

  { href: "/lessons", label: "Lessons", icon: "▦", group: "Learn" },
  { href: "/reading", label: "Reading Mode", icon: "❐", group: "Learn" },
  { href: "/pronunciation", label: "Pronunciation", icon: "♪", group: "Learn" },
  { href: "/cheatsheet", label: "Cheat Sheet", icon: "⊞", group: "Learn" },

  { href: "/games", label: "Mini Games", icon: "◈", group: "Play" },
  { href: "/sentence-builder", label: "Sentence Builder", icon: "⧉", group: "Play" },

  { href: "/exam", label: "Exam Prep", icon: "✓", group: "Assess" },
  { href: "/progress", label: "Progress", icon: "▲", group: "Assess" },
  { href: "/insights", label: "Insights", icon: "◍", group: "Assess" },
];

export const NAV_GROUPS = ["Overview", "Practice", "Learn", "Play", "Assess"] as const;
