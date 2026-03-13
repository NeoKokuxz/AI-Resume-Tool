"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertCircle, Zap } from "lucide-react";

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  isAnalyzing: boolean;
  hasResume: boolean;
  onTitleChange: (v: string) => void;
  onCompanyChange: (v: string) => void;
  onLocationChange: (v: string) => void;
  onUrlChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onSubmit: () => void;
}

export function AddJobModal({
  isOpen,
  onClose,
  title,
  company,
  location,
  url,
  description,
  isAnalyzing,
  hasResume,
  onTitleChange,
  onCompanyChange,
  onLocationChange,
  onUrlChange,
  onDescriptionChange,
  onSubmit,
}: AddJobModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Job Listing" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Job Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Auto-detected from description"
              className="input"
            />
          </div>
          <div>
            <label className="label">Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => onCompanyChange(e.target.value)}
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
              onChange={(e) => onLocationChange(e.target.value)}
              placeholder="e.g. San Francisco, CA"
              className="input"
            />
          </div>
          <div>
            <label className="label">Job URL (optional)</label>
            <input
              type="url"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
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
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Paste the full job description here..."
            className="textarea h-48"
          />
          {!hasResume && (
            <p className="text-xs text-yellow-500/80 mt-1 flex items-center gap-1">
              <AlertCircle size={11} />
              Upload a resume first for ATS scoring
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
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
  );
}
