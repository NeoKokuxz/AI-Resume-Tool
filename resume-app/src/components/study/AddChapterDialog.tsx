"use client";

import { useEffect, useRef, useState } from "react";
import { X, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/study/ModelSelector";
import { DEFAULT_STUDY_MODEL } from "@/lib/study-utils";
import type { StudyChapter } from "@/types";

interface AddChapterDialogProps {
  open: boolean;
  onClose: () => void;
  onAdded: (chapter: StudyChapter) => void;
}

const TOPIC_SUGGESTIONS = [
  "Distributed system tracing",
  "Database indexing deep-dive",
  "Authentication & authorization patterns",
  "Cost optimization on AWS",
];

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
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
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

  async function submit() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/study-plan/chapter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() || undefined, model }),
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

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-800 px-6 py-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="text-indigo-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
                Add Topic
              </span>
            </div>
            <h2 className="mt-1 text-base font-semibold text-gray-50">
              Generate a new chapter
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              We&apos;ll keep it consistent with the rest of your plan and skip topics you&apos;ve already covered.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 px-6 py-5">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
              Topic <span className="text-gray-600">(optional)</span>
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
              placeholder="e.g. 'Distributed tracing with OpenTelemetry'. Leave blank to let AI pick a meaningful gap."
              rows={1}
              disabled={loading}
              className="mt-1.5 w-full resize-none rounded-lg border border-gray-700 bg-gray-800/60 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 outline-none transition-colors focus:border-indigo-700/60 focus:bg-gray-900 disabled:opacity-50"
            />
          </div>

          {/* Suggestions */}
          {!topic && !loading && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-gray-600">Try:</span>
              {TOPIC_SUGGESTIONS.map((s) => (
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
          <ModelSelector value={model} onChange={setModel} disabled={loading} align="left" />
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
              disabled={loading}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                loading
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
