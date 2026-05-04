import type { StudyDifficulty, StudyLesson, StudyResource } from "@/types";

// Older cached plans store lessons as plain strings.
// Normalize so the UI can rely on {title, content?} shape.
export function normalizeLesson(lesson: StudyLesson | string): StudyLesson {
  if (typeof lesson === "string") return { title: lesson };
  return {
    title: lesson.title || "",
    content: lesson.content,
    generatedAt: lesson.generatedAt,
    model: lesson.model,
  };
}

// ─── Difficulty styling ────────────────────────────────────────────────────

export interface DifficultyStyle {
  label: string;
  /** Tailwind classes for the small inline pill (used on cards + modal header) */
  pillClass: string;
}

export const DIFFICULTY_STYLES: Record<StudyDifficulty, DifficultyStyle> = {
  beginner: {
    label: "Beginner",
    pillClass: "bg-green-950/60 text-green-400 border-green-800/60",
  },
  intermediate: {
    label: "Intermediate",
    pillClass: "bg-blue-950/60 text-blue-400 border-blue-800/60",
  },
  advanced: {
    label: "Advanced",
    pillClass: "bg-purple-950/60 text-purple-400 border-purple-800/60",
  },
};

// ─── Section grouping (used by the Study page card layout) ─────────────────

export interface DifficultySection {
  id: StudyDifficulty;
  label: string;
  description: string;
  /** Bullet dot (h-2 w-2) used in section header */
  dotClass: string;
  /** Heading text color */
  accentClass: string;
}

export const DIFFICULTY_SECTIONS: DifficultySection[] = [
  {
    id: "beginner",
    label: "Beginner",
    description: "Foundations to get rolling",
    dotClass: "bg-green-500/80 shadow-[0_0_0_3px] shadow-green-500/15",
    accentClass: "text-green-400",
  },
  {
    id: "intermediate",
    label: "Intermediate",
    description: "Build depth on what you already know",
    dotClass: "bg-blue-500/80 shadow-[0_0_0_3px] shadow-blue-500/15",
    accentClass: "text-blue-400",
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Sharp edges and senior-level depth",
    dotClass: "bg-purple-500/80 shadow-[0_0_0_3px] shadow-purple-500/15",
    accentClass: "text-purple-400",
  },
];

// ─── Resource icons ────────────────────────────────────────────────────────

export const RESOURCE_ICONS: Record<StudyResource["type"], string> = {
  article: "📄",
  video: "🎥",
  course: "🎓",
  doc: "📘",
  book: "📚",
};

// ─── Models ────────────────────────────────────────────────────────────────

export interface StudyModelOption {
  id: string;
  name: string;
  description: string;
}

export const STUDY_MODELS: StudyModelOption[] = [
  {
    id: "gemini-2.5-flash-lite",
    name: "Flash Lite",
    description: "Fastest, lower cost — good for quick iteration",
  },
  {
    id: "gemini-2.5-flash",
    name: "Flash",
    description: "Balanced quality and speed",
  },
  {
    id: "gemini-2.5-pro",
    name: "Pro",
    description: "Highest quality, slower and pricier",
  },
];

export const DEFAULT_STUDY_MODEL = STUDY_MODELS[0].id;

export function getModelLabel(id: string | undefined | null): string {
  if (!id) return "—";
  const found = STUDY_MODELS.find((m) => m.id === id);
  return found ? found.name : id;
}

export function isValidStudyModel(id: string | undefined | null): boolean {
  return !!id && STUDY_MODELS.some((m) => m.id === id);
}
