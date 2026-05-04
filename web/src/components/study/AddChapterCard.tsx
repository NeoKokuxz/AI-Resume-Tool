"use client";

import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddChapterCardProps {
  onClick: () => void;
}

/**
 * A "+" tile that matches the size and layout of StudyChapterCard so it sits
 * naturally at the end of the chapter grid.
 */
export function AddChapterCard({ onClick }: AddChapterCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex aspect-square w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-gray-800 bg-gray-900/30 p-5 text-gray-500 transition-all",
        "hover:border-indigo-700/60 hover:bg-gray-900/60 hover:text-indigo-300",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-800 bg-gray-900/60 transition-colors group-hover:border-indigo-700/60 group-hover:bg-indigo-950/40 group-hover:text-indigo-300">
        <Plus size={20} />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold leading-tight transition-colors group-hover:text-indigo-200">
          Add a topic
        </p>
        <p className="mt-1 text-[11px] leading-snug text-gray-600 group-hover:text-gray-400">
          Generate a new chapter on a topic of your choice
        </p>
      </div>
    </button>
  );
}
