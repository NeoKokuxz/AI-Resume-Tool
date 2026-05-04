"use client";

import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/study/ModelSelector";
import { CHAPTER_TOPIC_SUGGESTIONS, DEFAULT_STUDY_MODEL } from "@/lib/study-utils";
import type { StudyChapter } from "@/types";

interface AddChapterDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: (chapter: StudyChapter) => void;
}

export function AddChapterDialog({ open, onClose, onAdded }: AddChapterDialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [topic, setTopic] = useState("");
  const [model, setModel] = useState(DEFAULT_STUDY_MODEL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
  }, [topic]);

  // Lock scroll, ESC to close, autofocus when opened
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loading) onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, loading, onClose]);

  // Reset state on close
  useEffect(() => {
    if (!open) {
      setTopic("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const trimmedTopic = topic.trim();
  const canSubmit = trimmedTopic.length > 0 && !loading;

  async function submit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/study-plan/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: trimmedTopic, model }),
      });

      let data: { chapter?: StudyChapter; error?: string } | null = null;
      let bodyText = "";
      try { data = await res.json(); } catch { bodyText = await res.text().catch(() => ""); }

      if (!res.ok) {
        const reason = data?.error || bodyText || res.statusText || "Unknown error";
        throw new Error(`${res.status} ${res.statusText} — ${reason}`);
      }
      if (!data?.chapter) throw new Error("No chapter returned");

      onAdded(data.chapter);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === overlayRef.current && !loading) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-800 px-7 py-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
                Add Topic
              </span>
            </div>
            <h2 className="mt-1.5 text-lg font-semibold text-gray-50">
              Generate a new chapter
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Describe what you want to learn. We&apos;ll keep it consistent with the rest of
              your plan and skip topics you&apos;ve already covered.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-7 py-6">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Topic <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={inputRef}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="e.g. 'Distributed tracing with OpenTelemetry — focus on instrumenting a Node.js API and reading traces in Jaeger.'"
              rows={5}
              required
              disabled={loading}
              className="mt-2 w-full resize-none rounded-xl border border-gray-700 bg-gray-800/60 px-4 py-3 text-base leading-relaxed text-gray-100 placeholder:text-gray-500 outline-none transition-colors focus:border-indigo-600/70 focus:bg-gray-900 focus:ring-2 focus:ring-indigo-600/20 disabled:opacity-50"
            />
            <p className="mt-1.5 text-[11px] text-gray-600">
              Be specific — mention tools, depth, and what success looks like. The more
              detail, the more focused the chapter will be.
            </p>
          </div>

          {/* Suggestions */}
          {!topic && !loading && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-600">Try:</span>
              {CHAPTER_TOPIC_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTopic(s)}
                  className="rounded-full border border-gray-800 bg-gray-900/60 px-2.5 py-0.5 text-[11px] text-gray-400 transition-colors hover:border-indigo-700/60 hover:bg-gray-900 hover:text-indigo-300"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-lg border border-red-900/60 bg-red-950/30 p-3">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-red-400" />
              <pre className="flex-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-red-300/90">
                {error}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-gray-800 px-6 py-3">
          <ModelSelector
            value={model}
            onChange={setModel}
            disabled={loading}
            align="left"
            direction="up"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                !canSubmit
                  ? "cursor-not-allowed bg-gray-800 text-gray-500"
                  : "bg-indigo-600 text-white hover:bg-indigo-500"
              )}
            >
              {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {loading ? "Generating..." : "Generate chapter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
