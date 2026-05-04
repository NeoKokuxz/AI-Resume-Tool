import { BADGE_TINTS, type BadgeTint } from "@/lib/utils";
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

// Hue assignments for each difficulty level. Pill class strings come from
// the shared BADGE_TINTS map so every badge in the app (kanban, email,
// difficulty) uses the exact same tint formula.
const DIFFICULTY_TINTS: Record<StudyDifficulty, BadgeTint> = {
  beginner: "green",
  intermediate: "blue",
  advanced: "purple",
};

export const DIFFICULTY_STYLES: Record<StudyDifficulty, DifficultyStyle> = {
  beginner: { label: "Beginner", pillClass: BADGE_TINTS[DIFFICULTY_TINTS.beginner] },
  intermediate: { label: "Intermediate", pillClass: BADGE_TINTS[DIFFICULTY_TINTS.intermediate] },
  advanced: { label: "Advanced", pillClass: BADGE_TINTS[DIFFICULTY_TINTS.advanced] },
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

// ─── Study topic presets ───────────────────────────────────────────────────

export interface StudyTopicPreset {
  id: string;
  label: string;
}

/**
 * Three core topics we always surface — they're foundational interview /
 * career topics regardless of the user's stack.
 */
export const FIXED_STUDY_TAGS: StudyTopicPreset[] = [
  { id: "data-structures", label: "Data Structures" },
  { id: "algorithms", label: "Algorithms" },
  { id: "system-design", label: "System Design" },
];

/**
 * Skill-text → topic preset rules. Used to surface relevant tags based on
 * the user's resume so the chip list isn't generic.
 */
const SKILL_TAG_RULES: { match: RegExp; tag: StudyTopicPreset }[] = [
  { match: /\b(typescript|javascript|js)\b/i, tag: { id: "typescript", label: "TypeScript Deep-Dive" } },
  { match: /\b(react|next\.?js|vue|angular|svelte)\b/i, tag: { id: "frontend", label: "Modern Frontend" } },
  { match: /\b(node\.?js|express|django|fastapi|flask|spring|rails|nest)\b/i, tag: { id: "backend", label: "Backend Engineering" } },
  { match: /\b(postgres(ql)?|mysql|mongodb|dynamodb|\bsql\b)\b/i, tag: { id: "databases", label: "Databases & SQL" } },
  { match: /\b(redis|memcached|caching)\b/i, tag: { id: "caching", label: "Caching Strategies" } },
  { match: /\b(docker|kubernetes|k8s|containerd)\b/i, tag: { id: "containers", label: "Containers & K8s" } },
  { match: /\b(aws|gcp|azure|terraform)\b/i, tag: { id: "cloud", label: "Cloud Platforms" } },
  { match: /\b(machine learning|ml\b|llm|pytorch|tensorflow|deep learning)\b/i, tag: { id: "ml", label: "Machine Learning" } },
  { match: /\bgraphql\b/i, tag: { id: "graphql", label: "GraphQL" } },
  { match: /\b(kafka|rabbitmq|kinesis|pubsub)\b/i, tag: { id: "messaging", label: "Distributed Messaging" } },
  { match: /\b(security|owasp|jwt|oauth)\b/i, tag: { id: "security", label: "Security Fundamentals" } },
  { match: /\b(testing|jest|pytest|cypress|playwright)\b/i, tag: { id: "testing", label: "Testing Strategies" } },
  { match: /\b(python|golang|go|rust|java|kotlin|swift|c\+\+|c#)\b/i, tag: { id: "languages", label: "Language Internals" } },
];

// ─── Inspiration text shown under empty textareas ──────────────────────────

/** Whole-plan goal suggestions for the Study Plan generator textarea. */
export const PLAN_PROMPT_SUGGESTIONS: string[] = [
  "Help me transition into AI/ML engineering",
  "Get me ready for senior backend interviews",
  "Build skills for a staff engineer role",
  "Strengthen my system design fundamentals",
];

/** Single-chapter topic suggestions for the Add Topic dialog textarea. */
export const CHAPTER_TOPIC_SUGGESTIONS: string[] = [
  "Distributed system tracing",
  "Database indexing deep-dive",
  "Authentication & authorization patterns",
  "Cost optimization on AWS",
];

/**
 * Build the topic chip list shown on the Study page. Always returns the
 * three fixed tags first, then any tags whose pattern matches the user's
 * resume skills/tools — capped to keep the row scannable.
 */
export function getStudyTopicPresets(skills: string[] = [], extra: string[] = []): StudyTopicPreset[] {
  const text = [...skills, ...extra].join(" ");
  const dynamic: StudyTopicPreset[] = [];
  const seen = new Set<string>(FIXED_STUDY_TAGS.map((t) => t.id));
  for (const rule of SKILL_TAG_RULES) {
    if (rule.match.test(text) && !seen.has(rule.tag.id)) {
      dynamic.push(rule.tag);
      seen.add(rule.tag.id);
    }
    if (dynamic.length >= 8) break;
  }
  return [...FIXED_STUDY_TAGS, ...dynamic];
}

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
    description: "Fastest and cheapest — fine for quick experiments, weaker reasoning",
  },
  {
    id: "gemini-2.5-flash",
    name: "Flash",
    description: "Recommended — strong reasoning, reliable speed",
  },
  {
    id: "gemini-2.5-pro",
    name: "Pro",
    description: "Highest quality — best for deep, structured plans (slower)",
  },
];

// Flash is the default for study generation — Lite produces noticeably weaker
// chapter and lesson content. Users can opt down to Lite or up to Pro per call.
export const DEFAULT_STUDY_MODEL = "gemini-2.5-flash";

export function getModelLabel(id: string | undefined | null): string {
  if (!id) return "—";
  const found = STUDY_MODELS.find((m) => m.id === id);
  return found ? found.name : id;
}

export function isValidStudyModel(id: string | undefined | null): boolean {
  return !!id && STUDY_MODELS.some((m) => m.id === id);
}
