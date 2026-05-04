"use client";

import { Clock, BookOpen, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DIFFICULTY_STYLES } from "@/lib/study-utils";
import type { StudyChapter } from "@/types";

interface StudyChapterCardProps {
  chapter: StudyChapter;
  index: number;
  onClick: () => void;
}

const accentGradients = [
  "from-indigo-500/30 to-purple-500/20",
  "from-blue-500/30 to-cyan-500/20",
  "from-emerald-500/30 to-teal-500/20",
  "from-orange-500/30 to-pink-500/20",
  "from-violet-500/30 to-fuchsia-500/20",
  "from-amber-500/30 to-rose-500/20",
];

export function StudyChapterCard({ chapter, index, onClick }: StudyChapterCardProps) {
  const diff = DIFFICULTY_STYLES[chapter.difficulty];
  const accent = accentGradients[index % accentGradients.length];
  const skillsToShow = chapter.skills.slice(0, 3);
  const moreSkills = Math.max(0, chapter.skills.length - skillsToShow.length);

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative aspect-square w-full overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 p-5 text-left transition-all",
        "hover:border-indigo-600/50 hover:shadow-lg hover:shadow-indigo-900/20 hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
      )}
    >
      {/* Decorative gradient accent */}
      <div
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br opacity-60 blur-2xl transition-opacity group-hover:opacity-100",
          accent
        )}
      />

      {/* Top row: chapter number + arrow */}
      <div className="relative flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-700 bg-gray-800/80 text-xs font-semibold text-gray-300">
          {String(index + 1).padStart(2, "0")}
        </div>
        <ArrowUpRight
          size={16}
          className="text-gray-600 transition-all group-hover:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>

      {/* Title + summary */}
      <div className="relative mt-4 flex flex-col gap-1.5">
        <h3 className="text-base font-semibold leading-snug text-gray-100 line-clamp-2">
          {chapter.title}
        </h3>
        <p className="text-xs leading-relaxed text-gray-400 line-clamp-3">
          {chapter.summary}
        </p>
      </div>

      {/* Skill tags */}
      {skillsToShow.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-1">
          {skillsToShow.map((s) => (
            <span
              key={s}
              className="rounded-md border border-gray-700/70 bg-gray-800/60 px-1.5 py-0.5 text-[10px] font-medium text-gray-300"
            >
              {s}
            </span>
          ))}
          {moreSkills > 0 && (
            <span className="rounded-md border border-gray-700/70 bg-gray-800/60 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
              +{moreSkills}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="absolute inset-x-5 bottom-5 flex items-center justify-between gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            diff.pillClass
          )}
        >
          {diff.label}
        </span>
        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Clock size={11} />
            {chapter.estimatedHours}h
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen size={11} />
            {chapter.lessons.length}
          </span>
        </div>
      </div>
    </button>
  );
}
