"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Application } from "@/types";
import { ATSScoreRing } from "@/components/ui/ATSScoreRing";
import { formatRelativeTime, cn } from "@/lib/utils";
import {
  MapPin,
  Trash2,
  FileText,
  Loader2,
  Sparkles,
  StickyNote,
} from "lucide-react";

interface ApplicationCardProps {
  application: Application;
  onDelete: () => void;
  onGenerateResume: () => void;
  isGenerating: boolean;
  onViewResume: () => void;
  onUpdateNotes: (notes: string) => void;
}

export function ApplicationCard({
  application,
  onDelete,
  onGenerateResume,
  isGenerating,
  onViewResume,
  onUpdateNotes,
}: ApplicationCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: application.id,
  });
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState(application.notes || "");

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-gray-900 border border-gray-800 rounded-xl p-3.5 cursor-grab active:cursor-grabbing select-none transition-all",
        isDragging && "opacity-50 border-indigo-700"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 leading-tight truncate">
            {application.job.title}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{application.job.company}</p>
        </div>
        {application.atsScore !== undefined && (
          <ATSScoreRing score={application.atsScore} size="sm" showLabel={false} />
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-600 mb-3">
        <MapPin size={10} />
        <span className="truncate">{application.job.location || "Unknown"}</span>
        <span>·</span>
        <span>{formatRelativeTime(application.appliedAt)}</span>
      </div>

      {/* Notes */}
      {application.notes && !showNotes && (
        <div className="mb-2 text-xs text-gray-500 bg-gray-800/50 rounded-lg px-2.5 py-1.5 italic line-clamp-1">
          "{application.notes}"
        </div>
      )}

      {showNotes && (
        <div
          className="mb-2"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onBlur={() => {
              onUpdateNotes(noteText);
              setShowNotes(false);
            }}
            placeholder="Add notes..."
            className="textarea text-xs h-16"
            autoFocus
          />
        </div>
      )}

      {/* Actions */}
      <div
        className="flex items-center gap-1 pt-2 border-t border-gray-800"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        {!application.tailoredResumeId ? (
          <button
            onClick={onGenerateResume}
            disabled={isGenerating}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50 transition-colors"
          >
            {isGenerating ? (
              <Loader2 size={11} className="animate-spin" />
            ) : (
              <Sparkles size={11} />
            )}
            {isGenerating ? "Generating..." : "AI Resume"}
          </button>
        ) : (
          <button
            onClick={onViewResume}
            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
          >
            <FileText size={11} />
            View Resume
          </button>
        )}
        <span className="text-gray-700 mx-1">·</span>
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          <StickyNote size={11} />
          Notes
        </button>
        <span className="flex-1" />
        <button
          onClick={onDelete}
          className="text-gray-700 hover:text-red-400 transition-colors"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
