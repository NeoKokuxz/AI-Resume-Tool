"use client";

import { Email, EmailClassification, Job } from "@/types";
import { Badge } from "@/components/ui/Badge";
import {
  getClassificationColor,
  getClassificationLabel,
  formatRelativeTime,
  cn,
} from "@/lib/utils";
import { Mail, Link2, RefreshCw, Trash2, Loader2 } from "lucide-react";

const CLASSIFICATION_BADGE_VARIANT: Record<
  EmailClassification,
  "success" | "warning" | "danger" | "info" | "default" | "purple"
> = {
  interview: "success",
  assessment: "info",
  rejection: "danger",
  recruiter_outreach: "warning",
  unknown: "default",
};

interface EmailCardProps {
  email: Email;
  relatedJob?: Job;
  classifyingId: string | null;
  onReclassify: (id: string, subject: string, body: string) => void;
  onDelete: (id: string) => void;
}

export function EmailCard({ email, relatedJob, classifyingId, onReclassify, onDelete }: EmailCardProps) {
  return (
    <div className="card p-4 hover:border-gray-700 transition-all">
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
          getClassificationColor(email.classification)
        )}>
          <Mail size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-200 leading-snug">
              {email.subject}
            </p>
            <Badge variant={CLASSIFICATION_BADGE_VARIANT[email.classification]}>
              {getClassificationLabel(email.classification)}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            From: {email.sender} · {formatRelativeTime(email.receivedAt)}
          </p>
          {relatedJob && (
            <p className="text-xs text-indigo-400 mt-1 flex items-center gap-1">
              <Link2 size={10} />
              {relatedJob.title} at {relatedJob.company}
            </p>
          )}
          {email.body && (
            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
              {email.body}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onReclassify(email.id, email.subject, email.body)}
            disabled={classifyingId === email.id}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-indigo-400 hover:bg-indigo-950/30 transition-colors"
            title="Re-classify"
          >
            {classifyingId === email.id ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <RefreshCw size={13} />
            )}
          </button>
          <button
            onClick={() => onDelete(email.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
