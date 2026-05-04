"use client";

import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getModelLabel } from "@/lib/study-utils";
import { ResourceList } from "@/components/study/ResourceList";
import { ModelSelector } from "@/components/study/ModelSelector";
import type { StudyLesson } from "@/types";

interface LessonViewProps {
  lesson: StudyLesson | null;
  loading: boolean;
  error: string | null;
  selectedModel: string;
  onModelChange: (id: string) => void;
  onRegenerate: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

/**
 * The detailed lesson view shown after the user clicks a lesson in the
 * chapter modal. Renders all lesson sections + a model picker / regenerate
 * controls / prev-next pagination.
 */
export function LessonView({
  lesson,
  loading,
  error,
  selectedModel,
  onModelChange,
  onRegenerate,
  onPrev,
  onNext,
}: LessonViewProps) {
  if (!lesson) return null;

  if (loading && !lesson.content) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500" />
        <p className="text-sm">Generating your lesson — this may take 10–20 seconds...</p>
      </div>
    );
  }

  if (error && !lesson.content) {
    return (
      <div className="rounded-xl border border-red-900/60 bg-red-950/30 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-200">Couldn&apos;t generate lesson</p>
            <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-red-300/90">
              {error}
            </pre>
          </div>
          <button
            onClick={onRegenerate}
            className="flex-shrink-0 rounded-lg border border-red-800 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-950"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const c = lesson.content;
  if (!c) return null;

  return (
    <div className="space-y-7">
      {/* Overview */}
      {c.overview && (
        <section className="rounded-xl border border-indigo-900/50 bg-indigo-950/20 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-400">
            <Sparkles size={13} />
            Overview
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">
            {c.overview}
          </p>
        </section>
      )}

      {/* Walkthrough */}
      {c.walkthrough.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <BookOpen size={13} />
            Walkthrough
          </h3>
          <div className="mt-3 space-y-5">
            {c.walkthrough.map((s, i) => (
              <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
                <h4 className="text-sm font-semibold text-gray-100">
                  <span className="mr-2 text-gray-500">{String(i + 1).padStart(2, "0")}.</span>
                  {s.heading}
                </h4>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Examples */}
      {c.examples.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <Lightbulb size={13} />
            Examples
          </h3>
          <div className="mt-3 space-y-3">
            {c.examples.map((ex, i) => (
              <div key={i} className="rounded-xl border border-gray-800 bg-gray-900/40 p-4">
                {ex.title && (
                  <h4 className="text-sm font-semibold text-gray-100">{ex.title}</h4>
                )}
                {ex.body && (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                    {ex.body}
                  </p>
                )}
                {ex.code && (
                  <pre className="mt-3 overflow-x-auto rounded-lg border border-gray-800 bg-gray-950 p-3 font-mono text-xs leading-relaxed text-gray-200">
                    {ex.code}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key takeaways */}
      {c.keyTakeaways.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <CheckCircle2 size={13} />
            Key takeaways
          </h3>
          <ul className="mt-3 space-y-2">
            {c.keyTakeaways.map((k, i) => (
              <li
                key={i}
                className="flex items-start gap-2.5 rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2"
              >
                <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                <span className="text-sm leading-relaxed text-gray-200">{k}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Exercises */}
      {c.exercises.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <Dumbbell size={13} />
            Exercises
          </h3>
          <ol className="mt-3 space-y-2">
            {c.exercises.map((ex, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900/40 px-3 py-2.5"
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md bg-gray-800 text-[11px] font-semibold text-gray-400">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed text-gray-200">{ex}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Further reading */}
      {c.furtherReading.length > 0 && (
        <section>
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            <Target size={13} />
            Further reading
          </h3>
          <ResourceList resources={c.furtherReading} />
        </section>
      )}

      {/* Footer actions */}
      <div className="space-y-3 border-t border-gray-800 pt-5">
        {lesson.model && (
          <p className="text-[11px] text-gray-500">
            Generated by{" "}
            <span className="font-mono text-gray-400">{getModelLabel(lesson.model)}</span>
            <span className="text-gray-600"> · {lesson.model}</span>
          </p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <ModelSelector
              value={selectedModel}
              onChange={onModelChange}
              disabled={loading}
              align="left"
            />
            <button
              onClick={onRegenerate}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-indigo-700/60 hover:text-indigo-300 disabled:opacity-50"
            >
              <RefreshCw size={12} className={cn(loading && "animate-spin")} />
              Regenerate
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={!onPrev || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-indigo-700/60 hover:text-indigo-300 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft size={12} />
              Previous
            </button>
            <button
              onClick={onNext}
              disabled={!onNext || loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-700/60 bg-indigo-950/40 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-950 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next lesson
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
