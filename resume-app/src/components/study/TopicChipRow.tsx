"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudyTopicPreset } from "@/lib/study-utils";

interface TopicChipRowProps {
  topics: StudyTopicPreset[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onClear: () => void;
  loading?: boolean;
  /** Loading state for the topics endpoint itself (shows a placeholder chip) */
  topicsLoading?: boolean;
}

/**
 * The "Add as chapters" chip row in the Study Plan generator. Each chip
 * toggles selection — selected chips are sent as required chapters when
 * the user generates a plan. Renders nothing until there's at least one
 * topic available or the topics endpoint is in flight.
 */
export function TopicChipRow({
  topics,
  selected,
  onToggle,
  onClear,
  loading = false,
  topicsLoading = false,
}: TopicChipRowProps) {
  if (topics.length === 0 && !topicsLoading) return null;

  return (
    <div className="mt-3 border-t border-gray-800/80 pt-3">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
          Add as chapters
        </p>
        {selected.size > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] font-medium text-gray-500 hover:text-indigo-300"
          >
            Clear ({selected.size})
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {topics.map((t) => {
          const active = selected.has(t.id);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onToggle(t.id)}
              disabled={loading}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                active
                  ? "border-indigo-500 bg-indigo-600/20 text-indigo-200 hover:bg-indigo-600/30"
                  : "border-gray-700 bg-gray-800/40 text-gray-300 hover:border-indigo-700/60 hover:text-indigo-300"
              )}
            >
              {active && <Check size={11} strokeWidth={3} />}
              {t.label}
            </button>
          );
        })}
        {topicsLoading && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-gray-800 px-3 py-1 text-xs text-gray-600">
            <Loader2 size={11} className="animate-spin" />
            Suggesting topics from your resume...
          </span>
        )}
      </div>
    </div>
  );
}
