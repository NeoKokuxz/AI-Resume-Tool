"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/study/ModelSelector";
import { TopicChipRow } from "@/components/study/TopicChipRow";
import {
  DEFAULT_STUDY_MODEL,
  PLAN_PROMPT_SUGGESTIONS,
  type StudyTopicPreset,
} from "@/lib/study-utils";

interface StudyPlanGeneratorProps {
  onGenerate: (prompt: string, model: string, tags: string[]) => Promise<void>;
  loading: boolean;
  hasPlan: boolean;
  /** Topic chips to show — fixed core tags + AI suggestions from the user's resume */
  topics?: StudyTopicPreset[];
  /** True while the topic suggestions endpoint is loading */
  topicsLoading?: boolean;
}

export function StudyPlanGenerator({
  onGenerate,
  loading,
  hasPlan,
  topics = [],
  topicsLoading = false,
}: StudyPlanGeneratorProps) {
  const [value, setValue] = useState("");
  const [model, setModel] = useState(DEFAULT_STUDY_MODEL);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function toggleTag(id: string) {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Auto-resize the textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const trimmed = value.trim();
  // User can submit if they wrote a prompt OR picked at least one tag
  const disabled = (!trimmed && selectedTags.size === 0) || loading;

  async function submit() {
    if (disabled) return;
    const tagLabels = topics
      .filter((t) => selectedTags.has(t.id))
      .map((t) => t.label);
    await onGenerate(trimmed, model, tagLabels);
  }

  return (
    <section className="px-8 pt-6 pb-2">
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 p-4 shadow-sm transition-colors focus-within:border-indigo-700/60 focus-within:bg-gray-900">
        <div className="flex items-start gap-3">
          <div className="mt-1.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600/15 text-indigo-400">
            <Sparkles size={14} />
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={
              hasPlan
                ? "Describe a different goal to generate a new plan..."
                : "What do you want to learn or get better at? (e.g. 'Transition from backend to ML engineering')"
            }
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-gray-100 placeholder:text-gray-500 outline-none"
            disabled={loading}
          />
        </div>

        <TopicChipRow
          topics={topics}
          selected={selectedTags}
          onToggle={toggleTag}
          onClear={() => setSelectedTags(new Set())}
          loading={loading}
          topicsLoading={topicsLoading}
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-gray-800/80 pt-3">
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <ModelSelector
              value={model}
              onChange={setModel}
              disabled={loading}
              align="left"
            />
            <div className="flex items-center gap-1.5">
              <kbd className="rounded border border-gray-700 bg-gray-800/80 px-1.5 py-0.5 font-mono text-[10px] text-gray-400">
                ⌘ ↵
              </kbd>
              <span>to generate</span>
            </div>
          </div>
          <button
            onClick={submit}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
              disabled
                ? "cursor-not-allowed bg-gray-800 text-gray-500"
                : "bg-indigo-600 text-white shadow-md shadow-indigo-900/40 hover:bg-indigo-500"
            )}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {loading ? "Generating..." : "Generate Plan"}
          </button>
        </div>
      </div>

      {!hasPlan && !loading && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-[11px] uppercase tracking-wider text-gray-600">Try:</span>
          {PLAN_PROMPT_SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setValue(s)}
              className="rounded-full border border-gray-800 bg-gray-900/60 px-3 py-1 text-xs text-gray-400 transition-colors hover:border-indigo-700/60 hover:bg-gray-900 hover:text-indigo-300"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
