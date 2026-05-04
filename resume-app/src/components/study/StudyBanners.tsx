"use client";

import Link from "next/link";
import { AlertCircle, RefreshCw, FileText, X } from "lucide-react";

/** Red banner shown when plan generation fails. */
export function StudyErrorBanner({
  message,
  hasResume,
  onDismiss,
}: {
  message: string;
  hasResume: boolean;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-900/60 bg-red-950/30 p-4">
      <AlertCircle size={16} className="mt-0.5 flex-shrink-0 text-red-400" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-red-200">Couldn&apos;t generate plan</p>
        <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-red-300/90">
          {message}
        </pre>
      </div>
      {!hasResume && (
        <Link
          href="/resume"
          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-red-800 bg-red-950/40 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-950"
        >
          <FileText size={12} />
          Upload Resume
        </Link>
      )}
      <button
        onClick={onDismiss}
        className="flex-shrink-0 rounded-md p-1 text-red-400 hover:bg-red-950/60 hover:text-red-200"
        aria-label="Dismiss error"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/** Amber banner shown when the cached plan was built against an older resume. */
export function StudyStaleBanner() {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-900/60 bg-amber-950/30 p-4">
      <RefreshCw size={15} className="mt-0.5 flex-shrink-0 text-amber-400" />
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-200">
          Your resume changed since this plan was built.
        </p>
        <p className="mt-0.5 text-xs text-amber-300/80">
          Re-prompt above to regenerate against your latest resume.
        </p>
      </div>
    </div>
  );
}

/** Centered spinner shown while we hydrate the cached plan from the DB. */
export function StudyHydratingSpinner() {
  return (
    <div className="mt-12 flex flex-col items-center justify-center gap-2 text-gray-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-700 border-t-indigo-500" />
      <p className="text-xs">Loading your plan...</p>
    </div>
  );
}

/** Top-of-list overview block describing the current plan. */
export function StudyOverview({ overview }: { overview: string }) {
  if (!overview) return null;
  return (
    <div className="mb-5 rounded-xl border border-gray-800 bg-gray-900/40 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
        Plan overview
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-300">{overview}</p>
    </div>
  );
}
