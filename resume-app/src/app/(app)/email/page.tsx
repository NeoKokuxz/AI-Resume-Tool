"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { createEmail, updateEmailInDb, deleteEmailFromDb } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { EmailClassification } from "@/types";
import { Mail, Plus, Inbox } from "lucide-react";
import { classifyEmail } from "@/lib/email-utils";
import { EmailSummaryBar } from "@/components/email/EmailSummaryBar";
import { EmailGroup } from "@/components/email/EmailGroup";
import { AddEmailModal } from "@/components/email/AddEmailModal";

const classificationOrder: EmailClassification[] = [
  "interview", "assessment", "recruiter_outreach", "rejection", "unknown",
];

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

  function handleDelete(emailId: string) {
    deleteEmailFromDb(emailId);
    deleteEmail(emailId);
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

  const counts = classificationOrder.reduce((acc, cls) => {
    acc[cls] = grouped[cls].length;
    return acc;
  }, {} as Record<EmailClassification, number>);

  function handleCloseModal() {
    setIsModalOpen(false);
    resetForm();
  }

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

      <EmailSummaryBar counts={counts} order={classificationOrder} />

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
            .map((cls) => (
              <EmailGroup
                key={cls}
                classification={cls}
                emails={grouped[cls]}
                jobs={jobs}
                classifyingId={classifyingId}
                onReclassify={handleReclassify}
                onDelete={handleDelete}
              />
            ))}
        </div>
      )}

      <AddEmailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        subject={subject}
        sender={sender}
        body={body}
        relatedJobId={relatedJobId}
        isClassifying={isClassifying}
        jobs={jobs}
        onSubjectChange={setSubject}
        onSenderChange={setSender}
        onBodyChange={setBody}
        onRelatedJobIdChange={setRelatedJobId}
        onSubmit={handleAddEmail}
      />
    </div>
  );
}
