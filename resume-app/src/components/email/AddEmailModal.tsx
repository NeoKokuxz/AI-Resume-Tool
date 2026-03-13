"use client";

import { Job } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Mail } from "lucide-react";

interface AddEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  sender: string;
  body: string;
  relatedJobId: string;
  isClassifying: boolean;
  jobs: Job[];
  onSubjectChange: (v: string) => void;
  onSenderChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onRelatedJobIdChange: (v: string) => void;
  onSubmit: () => void;
}

export function AddEmailModal({
  isOpen,
  onClose,
  subject,
  sender,
  body,
  relatedJobId,
  isClassifying,
  jobs,
  onSubjectChange,
  onSenderChange,
  onBodyChange,
  onRelatedJobIdChange,
  onSubmit,
}: AddEmailModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Email" size="md">
      <div className="space-y-4">
        <p className="text-xs text-gray-500 bg-gray-800 rounded-lg px-3 py-2">
          AI will automatically classify the email as: interview invite, assessment,
          rejection, recruiter outreach, or unknown.
        </p>

        <div>
          <label className="label">Subject <span className="text-red-400">*</span></label>
          <input
            type="text"
            value={subject}
            onChange={(e) => onSubjectChange(e.target.value)}
            placeholder="e.g. Interview Invitation - Software Engineer"
            className="input"
            autoFocus
          />
        </div>

        <div>
          <label className="label">From</label>
          <input
            type="email"
            value={sender}
            onChange={(e) => onSenderChange(e.target.value)}
            placeholder="recruiter@company.com"
            className="input"
          />
        </div>

        <div>
          <label className="label">Email Body</label>
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder="Paste the email content here..."
            className="textarea h-28"
          />
        </div>

        <div>
          <label className="label">Related Job (optional)</label>
          <select
            value={relatedJobId}
            onChange={(e) => onRelatedJobIdChange(e.target.value)}
            className="input"
          >
            <option value="">-- Select a job --</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title} at {job.company}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            loading={isClassifying}
            disabled={!subject.trim() && !body.trim()}
            icon={<Mail size={14} />}
            className="flex-1"
          >
            {isClassifying ? "Classifying..." : "Add & Classify"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
