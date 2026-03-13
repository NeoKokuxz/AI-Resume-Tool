"use client";

import { useState } from "react";
import { Job } from "@/types";
import { ATSScoreRing } from "@/components/ui/ATSScoreRing";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatRelativeTime, cn } from "@/lib/utils";
import {
  MapPin,
  ExternalLink,
  Trash2,
  Send,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface JobCardProps {
  job: Job;
  onDelete: () => void;
  onCreateApplication: (job: Job) => void;
  hasApplication: boolean;
}

export function JobCard({ job, onDelete, onCreateApplication, hasApplication }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  const ats = job.atsResult;

  return (
    <div className="card p-5 hover:border-gray-700 transition-all">
      <div className="flex items-start gap-4">
        {/* ATS Score */}
        {ats && (
          <div className="flex-shrink-0">
            <ATSScoreRing score={ats.score} size="sm" showLabel={false} />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-gray-100 leading-tight">
                {job.title}
              </h3>
              <p className="text-sm text-gray-400 mt-0.5">{job.company}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasApplication && (
                <Badge variant="success">
                  <CheckCircle size={10} />
                  Applied
                </Badge>
              )}
              <button
                onClick={onDelete}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <MapPin size={11} />
              {job.location || "Unknown"}
            </span>
            <span>·</span>
            <span>{formatRelativeTime(job.addedAt)}</span>
            {job.url && (
              <>
                <span>·</span>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                  onClick={(e) => e.stopPropagation()}
                >
                  View <ExternalLink size={10} />
                </a>
              </>
            )}
          </div>

          {/* Keywords */}
          {ats && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {ats.matchedKeywords.slice(0, 6).map((kw) => (
                <Badge key={kw} variant="success">
                  <CheckCircle size={9} />
                  {kw}
                </Badge>
              ))}
              {ats.missingKeywords.slice(0, 3).map((kw) => (
                <Badge key={kw} variant="danger">
                  <AlertCircle size={9} />
                  {kw}
                </Badge>
              ))}
              {(ats.matchedKeywords.length + ats.missingKeywords.length > 9) && (
                <Badge>+{ats.matchedKeywords.length + ats.missingKeywords.length - 9} more</Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ATS breakdown */}
      {ats && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[
              { label: "Keywords", score: ats.keywordScore },
              { label: "Experience", score: ats.experienceScore },
              { label: "Title Match", score: ats.titleScore },
            ].map(({ label, score }) => (
              <div key={label} className="text-center">
                <div className="text-sm font-semibold text-gray-200">{score}%</div>
                <div className="text-xs text-gray-600">{label}</div>
                <div className="mt-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      score >= 80 ? "bg-green-500" :
                      score >= 60 ? "bg-yellow-500" :
                      score >= 40 ? "bg-orange-500" : "bg-red-500"
                    )}
                    style={{ width: `${score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Description toggle */}
      <div className="mt-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? "Hide description" : "View description"}
        </button>
        {expanded && (
          <div className="mt-2 text-xs text-gray-400 leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto bg-gray-800/50 rounded-lg p-3">
            {job.description}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        {!hasApplication && (
          <Button
            size="sm"
            icon={<Send size={13} />}
            onClick={() => onCreateApplication(job)}
            className="flex-1"
          >
            Track Application
          </Button>
        )}
      </div>
    </div>
  );
}
