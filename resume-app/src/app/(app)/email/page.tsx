"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { createEmail, updateEmailInDb, deleteEmailFromDb } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getClassificationColor,
  getClassificationLabel,
  formatRelativeTime,
  cn,
} from "@/lib/utils";
import { EmailClassification } from "@/types";
import {
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  Inbox,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Link2,
  Loader2,
} from "lucide-react";

const CLASSIFICATION_ICONS: Record<EmailClassification, React.ElementType> = {
  interview: CheckCircle,
  assessment: AlertCircle,
  rejection: AlertCircle,
  recruiter_outreach: User,
  unknown: Clock,
};

const CLASSIFICATION_BADGE_VARIANT: Record<EmailClassification, "success" | "warning" | "danger" | "info" | "default" | "purple"> = {
  interview: "success",
  assessment: "info",
  rejection: "danger",
  recruiter_outreach: "warning",
  unknown: "default",
};

export default function EmailPage() {
  const { emails, addEmail, deleteEmail, updateEmail, jobs } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyingId, setClassifyingId] = useState<string | null>(null);

  // Form state
  const [subject, setSubject] = useState("");
  const [sender, setSender] = useState("");
  const [body, setBody] = useState("");
  const [relatedJobId, setRelatedJobId] = useState("");

  function resetForm() {
    setSubject("");
    setSender("");
    setBody("");
    setRelatedJobId("");
  }

  async function classifyEmail(emailSubject: string, emailBody: string): Promise<EmailClassification> {
    try {
      const res = await fetch("/api/classify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: emailSubject, body: emailBody }),
      });
      const data = await res.json();
      return data.classification || "unknown";
    } catch {
      return "unknown";
    }
  }

  async function handleAddEmail() {
    if (!subject.trim() && !body.trim()) return;
    setIsClassifying(true);

    try {
      const classification = await classifyEmail(subject, body);
      const email = await createEmail({
        subject: subject || "(No subject)",
        sender: sender || "unknown@email.com",
        body,
        classification,
      });
      if (email) addEmail(email);
      resetForm();
      setIsModalOpen(false);
    } finally {
      setIsClassifying(false);
    }
  }

  async function handleReclassify(emailId: string, emailSubject: string, emailBody: string) {
    setClassifyingId(emailId);
    try {
      const classification = await classifyEmail(emailSubject, emailBody);
      updateEmail(emailId, { classification });
      updateEmailInDb(emailId, { classification });
    } finally {
      setClassifyingId(null);
    }
  }

  // Group emails by classification
  const grouped: Record<EmailClassification, typeof emails> = {
    interview: [],
    assessment: [],
    recruiter_outreach: [],
    rejection: [],
    unknown: [],
  };
  emails.forEach((e) => grouped[e.classification].push(e));

  const classificationOrder: EmailClassification[] = [
    "interview", "assessment", "recruiter_outreach", "rejection", "unknown",
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Email Monitor</h1>
          <p className="text-sm text-gray-400 mt-1">
            AI-powered email classification for job application updates
          </p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
          Add Email
        </Button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {classificationOrder.map((cls) => {
          const count = grouped[cls].length;
          const Icon = CLASSIFICATION_ICONS[cls];
          return (
            <div key={cls} className="card p-3 text-center">
              <Icon size={16} className={cn("mx-auto mb-1.5", getClassificationColor(cls).split(" ")[0])} />
              <p className="text-lg font-bold text-white">{count}</p>
              <p className="text-xs text-gray-500 leading-tight">{getClassificationLabel(cls)}</p>
            </div>
          );
        })}
      </div>

      {emails.length === 0 ? (
        <div className="card p-12 text-center">
          <Inbox size={32} className="text-gray-700 mx-auto mb-4" />
          <p className="text-base font-medium text-gray-400 mb-1">No emails yet</p>
          <p className="text-sm text-gray-600 mb-4">
            Add emails to automatically classify them using AI
          </p>
          <Button icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>
            Add Your First Email
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {classificationOrder
            .filter((cls) => grouped[cls].length > 0)
            .map((cls) => {
              const badgeVariant = CLASSIFICATION_BADGE_VARIANT[cls];
              const Icon = CLASSIFICATION_ICONS[cls];
              return (
                <div key={cls}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon size={14} className={getClassificationColor(cls).split(" ")[0]} />
                    <h2 className="text-sm font-semibold text-gray-300">
                      {getClassificationLabel(cls)}
                    </h2>
                    <Badge variant={badgeVariant}>{grouped[cls].length}</Badge>
                  </div>
                  <div className="space-y-2">
                    {grouped[cls].map((email) => {
                      const relatedJob = jobs.find((j) => j.id === email.relatedJobId);
                      return (
                        <div
                          key={email.id}
                          className="card p-4 hover:border-gray-700 transition-all"
                        >
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
                                onClick={() => handleReclassify(email.id, email.subject, email.body)}
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
                                onClick={() => { deleteEmailFromDb(email.id); deleteEmail(email.id); }}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Add Email Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title="Add Email"
        size="md"
      >
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
              onChange={(e) => setSubject(e.target.value)}
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
              onChange={(e) => setSender(e.target.value)}
              placeholder="recruiter@company.com"
              className="input"
            />
          </div>

          <div>
            <label className="label">Email Body</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Paste the email content here..."
              className="textarea h-28"
            />
          </div>

          <div>
            <label className="label">Related Job (optional)</label>
            <select
              value={relatedJobId}
              onChange={(e) => setRelatedJobId(e.target.value)}
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
            <Button
              variant="secondary"
              onClick={() => { setIsModalOpen(false); resetForm(); }}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddEmail}
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
    </div>
  );
}
