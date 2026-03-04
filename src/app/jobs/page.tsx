"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ATSScoreRing } from "@/components/ui/ATSScoreRing";
import { generateId, formatRelativeTime } from "@/lib/utils";
import { calculateATSScore } from "@/lib/ats-scorer";
import { Job } from "@/types";
import {
  Plus,
  Briefcase,
  MapPin,
  ExternalLink,
  Trash2,
  Zap,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";

function JobCard({
  job,
  onDelete,
  onCreateApplication,
  hasApplication,
}: {
  job: Job;
  onDelete: () => void;
  onCreateApplication: (job: Job) => void;
  hasApplication: boolean;
}) {
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

export default function JobsPage() {
  const { jobs, addJob, deleteJob, addApplication, applications, baseResume } =
    useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");

  const appliedJobIds = new Set(applications.map((a) => a.jobId));

  function resetForm() {
    setTitle("");
    setCompany("");
    setLocation("");
    setUrl("");
    setDescription("");
  }

  async function handleAddJob() {
    if (!description.trim()) return;
    setIsAnalyzing(true);

    try {
      // Calculate ATS score locally
      const atsResult = baseResume
        ? calculateATSScore(description, baseResume.content)
        : undefined;

      // Try to get AI analysis for title/company extraction
      let resolvedTitle = title;
      let resolvedCompany = company;
      let resolvedLocation = location;

      if (!title || !company) {
        try {
          const res = await fetch("/api/analyze-job", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jobDescription: description,
              resumeText: baseResume?.content,
            }),
          });
          const data = await res.json();
          if (data.analysis) {
            if (!resolvedTitle) resolvedTitle = data.analysis.title || "";
            if (!resolvedCompany) resolvedCompany = data.analysis.company || "";
            if (!resolvedLocation) resolvedLocation = data.analysis.location || "";
          }
        } catch {
          // Silently fail, use user-provided values
        }
      }

      addJob({
        title: resolvedTitle || "Software Engineer",
        company: resolvedCompany || "Unknown Company",
        description,
        location: resolvedLocation || location || "Remote",
        url: url || undefined,
        atsResult,
      });

      resetForm();
      setIsModalOpen(false);
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleCreateApplication(job: Job) {
    addApplication({
      jobId: job.id,
      job,
      status: "saved",
      atsScore: job.atsResult?.score,
    });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Job Listings</h1>
          <p className="text-sm text-gray-400 mt-1">
            {jobs.length} job{jobs.length !== 1 ? "s" : ""} tracked
            {!baseResume && (
              <span className="ml-2 text-yellow-400">
                · Upload a resume for ATS scoring
              </span>
            )}
          </p>
        </div>
        <Button
          icon={<Plus size={16} />}
          onClick={() => setIsModalOpen(true)}
        >
          Add Job
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={24} className="text-gray-600" />
          </div>
          <p className="text-base font-medium text-gray-400 mb-1">No jobs added yet</p>
          <p className="text-sm text-gray-600 mb-4">
            Add job descriptions to get ATS scores and track applications
          </p>
          <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
            Add Your First Job
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onDelete={() => deleteJob(job.id)}
              onCreateApplication={handleCreateApplication}
              hasApplication={appliedJobIds.has(job.id)}
            />
          ))}
        </div>
      )}

      {/* Add Job Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title="Add Job Listing"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Job Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Auto-detected from description"
                className="input"
              />
            </div>
            <div>
              <label className="label">Company</label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Auto-detected from description"
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA"
                className="input"
              />
            </div>
            <div>
              <label className="label">Job URL (optional)</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">
              Job Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Paste the full job description here..."
              className="textarea h-48"
            />
            {!baseResume && (
              <p className="text-xs text-yellow-500/80 mt-1 flex items-center gap-1">
                <AlertCircle size={11} />
                Upload a resume first for ATS scoring
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddJob}
              loading={isAnalyzing}
              disabled={!description.trim()}
              icon={<Zap size={14} />}
              className="flex-1"
            >
              {isAnalyzing ? "Analyzing..." : "Add & Score"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
