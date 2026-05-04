"use client";

import { useState } from "react";
import { GraduationCap, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudyHeaderProps {
  fullName: string;
  workTitle: string;
  skills: string[];
  chatVisible?: boolean;
  onToggleChat?: () => void;
}

const COLLAPSED_LIMIT = 12;

export function StudyHeader({
  fullName,
  workTitle,
  skills,
  chatVisible,
  onToggleChat,
}: StudyHeaderProps) {
  const [expanded, setExpanded] = useState(false);
  const initials = (fullName || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("") || "?";
  const overLimit = skills.length > COLLAPSED_LIMIT;
  const visibleSkills = expanded || !overLimit ? skills : skills.slice(0, COLLAPSED_LIMIT);
  const remaining = Math.max(0, skills.length - COLLAPSED_LIMIT);

  return (
    <header className="relative min-h-[20vh] overflow-hidden border-b border-gray-800 bg-gradient-to-br from-gray-900 via-gray-950 to-gray-950 py-6">
      {/* Decorative blur */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl" />

      <div className="relative flex min-h-[calc(20vh-3rem)] items-center px-8">
        <div className="flex w-full items-center gap-5">
          {/* Avatar */}
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-bold text-white shadow-lg shadow-indigo-900/40">
            {initials}
          </div>

          {/* Identity + skills */}
          <div className="min-w-0 flex-1 pr-4">
            <div className="flex items-center gap-2">
              <GraduationCap size={14} className="text-indigo-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
                Study Plan
              </span>
            </div>
            <h1 className="mt-0.5 truncate text-xl font-semibold text-white sm:text-2xl">
              {fullName || "Your study journey"}
            </h1>
            {workTitle && (
              <p className="mt-0.5 truncate text-sm text-gray-400">{workTitle}</p>
            )}
            {visibleSkills.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {visibleSkills.map((s) => (
                  <span
                    key={s}
                    className="rounded-md border border-gray-700/70 bg-gray-800/60 px-2 py-0.5 text-[11px] font-medium text-gray-300"
                  >
                    {s}
                  </span>
                ))}
                {overLimit && (
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-700/70 bg-gray-800/60 px-2 py-0.5 text-[11px] font-medium text-gray-400 transition-colors hover:border-indigo-700/60 hover:bg-gray-800 hover:text-indigo-300"
                  >
                    {expanded ? "Show less" : `+${remaining} more`}
                    <ChevronDown
                      size={11}
                      className={`transition-transform ${expanded ? "rotate-180" : "rotate-0"}`}
                    />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Toggle chat button */}
          {onToggleChat && (
            <button
              type="button"
              onClick={onToggleChat}
              aria-expanded={chatVisible}
              aria-label={chatVisible ? "Hide AI chat" : "Open AI chat to generate a new plan"}
              className={cn(
                "inline-flex flex-shrink-0 items-center gap-2 self-start rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                chatVisible
                  ? "border-gray-700 bg-gray-800/60 text-gray-300 hover:border-gray-600 hover:bg-gray-800"
                  : "border-indigo-700/60 bg-indigo-600/15 text-indigo-300 shadow-sm shadow-indigo-900/30 hover:border-indigo-600 hover:bg-indigo-600/25"
              )}
            >
              {chatVisible ? (
                <>
                  <ChevronUp size={13} />
                  Hide chat
                </>
              ) : (
                <>
                  <Sparkles size={13} />
                  New plan
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
