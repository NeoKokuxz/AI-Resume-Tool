"use client";

import { Application } from "@/types";
import { ATSScoreRing } from "@/components/ui/ATSScoreRing";
import { X, MapPin, ExternalLink, DollarSign, Briefcase, Building2 } from "lucide-react";

interface JobDetailModalProps {
  application: Application;
  onClose: () => void;
}

export function JobDetailModal({ application, onClose }: JobDetailModalProps) {
  const { job } = application;
  const ats = job.atsResult;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white leading-tight">{job.title}</h2>
            <p className="text-sm text-gray-400 mt-0.5">{job.company}</p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {application.atsScore !== undefined && (
              <ATSScoreRing score={application.atsScore} size="md" showLabel />
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Meta row */}
          <div className="flex flex-wrap gap-2">
            {job.location && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800 px-2.5 py-1.5 rounded-lg">
                <MapPin size={11} /> {job.location}
              </span>
            )}
            {job.salary && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-1.5 rounded-lg">
                <DollarSign size={11} /> {job.salary}
              </span>
            )}
            {job.jobType && (
              <span className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-950/60 border border-blue-800/50 px-2.5 py-1.5 rounded-lg">
                <Briefcase size={11} /> {job.jobType}
              </span>
            )}
            {job.workplace && (
              <span className="flex items-center gap-1.5 text-xs text-purple-400 bg-purple-950/60 border border-purple-800/50 px-2.5 py-1.5 rounded-lg">
                <Building2 size={11} /> {job.workplace}
              </span>
            )}
            {job.url && (
              <a
                href={job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-indigo-400 bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-1.5 rounded-lg hover:bg-indigo-950 transition-colors"
              >
                <ExternalLink size={11} /> View Listing
              </a>
            )}
          </div>

          {/* ATS analysis */}
          {ats && (
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ATS Analysis</span>
                <span className="text-xs text-gray-500">{ats.score}/100</span>
              </div>
              {ats.summary && (
                <p className="text-xs text-gray-400 leading-relaxed">{ats.summary}</p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {(ats.matchedKeywords ?? []).map(k => (
                  <span key={k} className="text-xs px-2 py-0.5 bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 rounded-md">✓ {k}</span>
                ))}
                {(ats.missingKeywords ?? []).map(k => (
                  <span key={k} className="text-xs px-2 py-0.5 bg-red-950/60 border border-red-800/50 text-red-400 rounded-md">✗ {k}</span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Job Description</h3>
              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                {job.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
