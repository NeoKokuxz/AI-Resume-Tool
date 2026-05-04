"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { DIFFICULTY_SECTIONS } from "@/lib/study-utils";
import { StudyChapterCard } from "@/components/study/StudyChapterCard";
import { AddChapterCard } from "@/components/study/AddChapterCard";
import type { StudyChapter, StudyDifficulty } from "@/types";

interface ChapterSectionsProps {
  chapters: StudyChapter[];
  onOpenChapter: (originalIdx: number) => void;
  onAddTopic: () => void;
}

export function ChapterSections({
  chapters,
  onOpenChapter,
  onAddTopic,
}: ChapterSectionsProps) {
  // Group chapters by difficulty while preserving each chapter's original
  // index in the plan — that's what the modal uses to identify the chapter
  // and what the card displays as its number.
  const grouped: Record<
    StudyDifficulty,
    { chapter: StudyChapter; originalIdx: number }[]
  > = { beginner: [], intermediate: [], advanced: [] };

  chapters.forEach((chapter, originalIdx) => {
    const bucket = grouped[chapter.difficulty] ?? grouped.intermediate;
    bucket.push({ chapter, originalIdx });
  });

  const totalHours = chapters.reduce((acc, c) => acc + c.estimatedHours, 0);
  const renderableSections = DIFFICULTY_SECTIONS.filter((s) => grouped[s.id].length > 0);
  const lastSectionId = renderableSections[renderableSections.length - 1]?.id;

  // All sections expanded by default. Track collapsed ones in a Set.
  const [collapsed, setCollapsed] = useState<Set<StudyDifficulty>>(new Set());
  const toggleSection = (id: StudyDifficulty) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allCollapsed = renderableSections.every((s) => collapsed.has(s.id));
  const toggleAll = () =>
    setCollapsed(allCollapsed ? new Set() : new Set(renderableSections.map((s) => s.id)));

  return (
    <div className="space-y-8">
      {/* Global stats */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold text-gray-200">Your chapters</h2>
        <div className="flex items-center gap-3">
          <p className="text-xs text-gray-500">
            {chapters.length} chapter{chapters.length === 1 ? "" : "s"} · {totalHours}h total
          </p>
          {renderableSections.length > 1 && (
            <button
              type="button"
              onClick={toggleAll}
              className="text-[11px] font-medium text-gray-500 transition-colors hover:text-indigo-300"
            >
              {allCollapsed ? "Expand all" : "Collapse all"}
            </button>
          )}
        </div>
      </div>

      {renderableSections.map((section) => {
        const items = grouped[section.id];
        const sectionHours = items.reduce(
          (acc, item) => acc + item.chapter.estimatedHours,
          0
        );
        const isLast = section.id === lastSectionId;
        const isCollapsed = collapsed.has(section.id);

        return (
          <section key={section.id}>
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              aria-expanded={!isCollapsed}
              className="group mb-3 flex w-full items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-2.5">
                <ChevronDown
                  size={14}
                  className={`flex-shrink-0 text-gray-500 transition-transform group-hover:text-gray-300 ${
                    isCollapsed ? "-rotate-90" : "rotate-0"
                  }`}
                />
                <span className={`h-2 w-2 rounded-full ${section.dotClass}`} aria-hidden />
                <h3 className={`text-sm font-semibold ${section.accentClass}`}>
                  {section.label}
                </h3>
                <span className="hidden text-xs text-gray-600 sm:inline">
                  · {section.description}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                {items.length} chapter{items.length === 1 ? "" : "s"} · {sectionHours}h
              </p>
            </button>

            {!isCollapsed && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {items.map(({ chapter, originalIdx }) => (
                  <StudyChapterCard
                    key={chapter.id}
                    chapter={chapter}
                    index={originalIdx}
                    onClick={() => onOpenChapter(originalIdx)}
                  />
                ))}
                {isLast && <AddChapterCard onClick={onAddTopic} />}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
