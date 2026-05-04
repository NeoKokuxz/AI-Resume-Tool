"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  normalizeLesson,
  DEFAULT_STUDY_MODEL,
  DIFFICULTY_STYLES,
} from "@/lib/study-utils";
import { ChapterView } from "@/components/study/ChapterView";
import { LessonView } from "@/components/study/LessonView";
import type { StudyChapter, StudyLesson, StudyLessonContent } from "@/types";

interface StudyChapterModalProps {
  chapter: StudyChapter | null;
  index: number;
  onClose: () => void;
  /**
   * Notifies the parent when a lesson's content has been generated/updated
   * so the page's plan state stays in sync with what's cached on the server.
   */
  onChapterUpdate?: (chapter: StudyChapter) => void;
}

export function StudyChapterModal({
  chapter,
  index,
  onClose,
  onChapterUpdate,
}: StudyChapterModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [activeLessonIdx, setActiveLessonIdx] = useState<number | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [lessonError, setLessonError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_STUDY_MODEL);

  // Reset lesson view when chapter changes (i.e., a new chapter is opened)
  useEffect(() => {
    setActiveLessonIdx(null);
    setLessonError(null);
    setLessonLoading(false);
  }, [chapter?.id]);

  // Lock scroll + ESC handling. ESC backs out of the lesson view first,
  // then closes the modal entirely.
  useEffect(() => {
    if (!chapter) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (activeLessonIdx !== null) setActiveLessonIdx(null);
        else onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [chapter, onClose, activeLessonIdx]);

  if (!chapter) return null;
  const diff = DIFFICULTY_STYLES[chapter.difficulty];
  const lessons = chapter.lessons.map(normalizeLesson);
  const activeLesson = activeLessonIdx !== null ? lessons[activeLessonIdx] : null;
  const inLessonView = activeLessonIdx !== null;

  async function loadLesson(idx: number, opts: { regenerate?: boolean } = {}) {
    if (!chapter) return;
    setActiveLessonIdx(idx);

    const lesson = lessons[idx];
    if (lesson?.content && !opts.regenerate) {
      setLessonError(null);
      return;
    }

    setLessonLoading(true);
    setLessonError(null);
    try {
      const res = await fetch("/api/study-plan/lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterId: chapter.id,
          lessonIdx: idx,
          regenerate: !!opts.regenerate,
          model: selectedModel,
        }),
      });

      let data: { content?: StudyLessonContent; error?: string; model?: string } | null = null;
      let bodyText = "";
      try { data = await res.json(); } catch { bodyText = await res.text().catch(() => ""); }

      if (!res.ok) {
        const reason = data?.error || bodyText || res.statusText || "Unknown error";
        throw new Error(`${res.status} ${res.statusText} — ${reason}`);
      }
      if (!data?.content) throw new Error("No lesson content returned");

      const updatedLesson: StudyLesson = {
        title: lesson.title,
        content: data.content,
        generatedAt: new Date().toISOString(),
        model: data.model || selectedModel,
      };
      const updatedChapter: StudyChapter = {
        ...chapter,
        lessons: chapter.lessons.map((l, li) => (li === idx ? updatedLesson : l)),
      };
      onChapterUpdate?.(updatedChapter);
    } catch (err) {
      setLessonError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLessonLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative flex w-full max-w-5xl max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-800 px-7 py-5">
          <div className="min-w-0 flex-1">
            {inLessonView ? (
              <>
                <button
                  onClick={() => setActiveLessonIdx(null)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300"
                >
                  <ArrowLeft size={12} />
                  Back to {chapter.title}
                </button>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                    Lesson {String((activeLessonIdx ?? 0) + 1).padStart(2, "0")} of{" "}
                    {String(lessons.length).padStart(2, "0")}
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-semibold leading-tight text-gray-50">
                  {activeLesson?.title || "Lesson"}
                </h2>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
                    Chapter {String(index + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      diff.pillClass
                    )}
                  >
                    {diff.label}
                  </span>
                </div>
                <h2 className="mt-1.5 text-xl font-semibold leading-tight text-gray-50">
                  {chapter.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{chapter.summary}</p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-7 py-6">
          {inLessonView ? (
            <LessonView
              lesson={activeLesson}
              loading={lessonLoading}
              error={lessonError}
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
              onRegenerate={() => loadLesson(activeLessonIdx!, { regenerate: true })}
              onPrev={
                activeLessonIdx! > 0 ? () => loadLesson(activeLessonIdx! - 1) : undefined
              }
              onNext={
                activeLessonIdx! < lessons.length - 1
                  ? () => loadLesson(activeLessonIdx! + 1)
                  : undefined
              }
            />
          ) : (
            <ChapterView
              chapter={chapter}
              lessons={lessons}
              onLessonClick={(idx) => loadLesson(idx)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
