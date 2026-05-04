"use client";

import {
  ChevronRight,
  Sparkles,
  BookOpen,
  Target,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResourceList } from "@/components/study/ResourceList";
import type { StudyChapter, StudyLesson } from "@/types";

interface ChapterViewProps {
  chapter: StudyChapter;
  lessons: StudyLesson[];
  onLessonClick: (idx: number) => void;
}

/**
 * The "table of contents" view shown when the user opens a chapter modal —
 * lists lessons with completion status, why-this-matters, resources, and
 * a sidebar with time estimate + skills built.
 */
export function ChapterView({ chapter, lessons, onLessonClick }: ChapterViewProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        {chapter.whyImportant && (
          <div className="rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-400">
              <Sparkles size={13} />
              Why this matters
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              {chapter.whyImportant}
            </p>
          </div>
        )}

        <section>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <BookOpen size={13} />
            Lessons
          </h3>
          <ol className="mt-3 space-y-2">
            {lessons.map((lesson, i) => {
              const ready = !!lesson.content;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onLessonClick(i)}
                    className="group flex w-full items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-3 text-left transition-all hover:border-indigo-700/60 hover:bg-gray-900"
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-[11px] font-semibold transition-colors",
                        ready
                          ? "bg-green-900/40 text-green-300"
                          : "bg-gray-800 text-gray-400 group-hover:bg-indigo-900/60 group-hover:text-indigo-300"
                      )}
                    >
                      {ready ? <CheckCircle2 size={12} /> : i + 1}
                    </span>
                    <p className="flex-1 text-sm leading-relaxed text-gray-200">
                      {lesson.title}
                    </p>
                    <ChevronRight
                      size={14}
                      className="flex-shrink-0 text-gray-600 transition-colors group-hover:text-indigo-400"
                    />
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        {chapter.resources.length > 0 && (
          <section>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <Target size={13} />
              Recommended resources
            </h3>
            <ResourceList resources={chapter.resources} />
          </section>
        )}
      </div>

      <aside className="space-y-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
            Estimated time
          </p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-semibold text-gray-100">
              {chapter.estimatedHours}
            </span>
            <span className="text-sm text-gray-500">hours</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
            <Clock size={11} />
            About {Math.max(1, Math.round(chapter.estimatedHours / 5))} weeks at 5h/wk
          </div>
        </div>

        {chapter.skills.length > 0 && (
          <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Skills you&apos;ll build
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {chapter.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-md border border-indigo-900/60 bg-indigo-950/40 px-2 py-0.5 text-xs font-medium text-indigo-300"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
