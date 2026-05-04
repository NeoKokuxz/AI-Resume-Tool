"use client";

import Link from "next/link";
import { BookOpen, FileText, Sparkles } from "lucide-react";

interface StudyEmptyStateProps {
  hasResume: boolean;
  chatVisible: boolean;
  onShowChat: () => void;
}

export function StudyEmptyState({
  hasResume,
  chatVisible,
  onShowChat,
}: StudyEmptyStateProps) {
  if (!hasResume) {
    return (
      <div className="mx-auto mt-12 max-w-md rounded-2xl border border-dashed border-gray-800 bg-gray-900/30 p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/15 text-indigo-400">
          <BookOpen size={20} />
        </div>
        <h3 className="mt-4 text-sm font-semibold text-gray-200">
          Upload your resume first
        </h3>
        <p className="mt-1.5 text-xs leading-relaxed text-gray-500">
          We use your resume to figure out which skills you already have so we can
          focus the plan on what&apos;s missing.
        </p>
        <Link
          href="/resume"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
        >
          <FileText size={12} />
          Go to Resume
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-400">
        <BookOpen size={22} />
      </div>
      <h3 className="mt-5 text-base font-semibold text-gray-100">
        Your study plan will appear here
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-gray-500">
        Enter a prompt {chatVisible ? "above" : "in the AI chat"} describing what
        you want to learn, and we&apos;ll build a chapter-by-chapter roadmap
        tailored to your resume.
      </p>
      {!chatVisible && (
        <button
          onClick={onShowChat}
          className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-md shadow-indigo-900/40 hover:bg-indigo-500"
        >
          <Sparkles size={12} />
          Open AI chat
        </button>
      )}
    </div>
  );
}
