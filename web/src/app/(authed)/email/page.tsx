"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { createEmail, updateEmailInDb, deleteEmailFromDb, fetchAll } from "@/lib/db";
import { Button } from "@/components/ui/Button";
import { EmailClassification } from "@/types";
import { Mail, Plus, Inbox } from "lucide-react";
import { EmailSummaryBar } from "@/components/email/EmailSummaryBar";
import { EmailGroup } from "@/components/email/EmailGroup";
import { AddEmailModal } from "@/components/email/AddEmailModal";
import { useAIOperation } from "@/lib/ai-queue/realtime";

const classificationOrder: EmailClassification[] = [
  "interview", "assessment", "recruiter_outreach", "rejection", "unknown",
];

async function enqueueClassify(subject: string, body: string, emailId: string): Promise<string | null> {
  const res = await fetch("/api/ai-queue/enqueue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      operationType: "classify_email",
      payload: { subject, body, emailId },
    }),
  });
  const data = await res.json();
  return data.operationId ?? null;
}

export default function EmailPage() {
  const { emails, addEmail, updateEmail, deleteEmail, jobs, hydrate } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClassifying, setIsClassifying] = useState(false);
  const [classifyingId, setClassifyingId] = useState<string | null>(null);
  const [operationId, setOperationId] = useState<string | null>(null);

  useAIOperation({
    operationId,
    onSuccess: async () => {
      const data = await fetchAll();
      if (data) hydrate(data);
      setOperationId(null);
      setIsClassifying(false);
      setClassifyingId(null);
    },
    onError: () => {
      setOperationId(null);
      setIsClassifying(false);
      setClassifyingId(null);
    },
  });

  const [subject, setSubject] = useState("");
  const [sender, setSender] = useState("");
  const [body, setBody] = useState("");
  const [relatedJobId, setRelatedJobId] = useState("");

  function resetForm() {
    setSubject(""); setSender(""); setBody(""); setRelatedJobId("");
  }

  async function handleAddEmail() {
    if (!subject.trim() && !body.trim()) return;
    setIsClassifying(true);

    try {
      // Create email immediately with 'unknown' — queue will update classification
      const email = await createEmail({
        subject: subject || "(No subject)",
        sender: sender || "unknown@email.com",
        body,
        classification: "unknown",
      });

      if (email) {
        addEmail(email);
        const opId = await enqueueClassify(subject, body, email.id);
        if (opId) setOperationId(opId);
        else setIsClassifying(false);
      } else {
        setIsClassifying(false);
      }

      resetForm();
      setIsModalOpen(false);
    } catch {
      setIsClassifying(false);
    }
  }

  async function handleReclassify(emailId: string, emailSubject: string, emailBody: string) {
    setClassifyingId(emailId);
    const opId = await enqueueClassify(emailSubject, emailBody, emailId);
    if (opId) setOperationId(opId);
    else setClassifyingId(null);
  }

  function handleDelete(emailId: string) {
    deleteEmailFromDb(emailId);
    deleteEmail(emailId);
  }

  const grouped: Record<EmailClassification, typeof emails> = {
    interview: [], assessment: [], recruiter_outreach: [], rejection: [], unknown: [],
  };
  emails.forEach((e) => grouped[e.classification].push(e));

  const counts = classificationOrder.reduce((acc, cls) => {
    acc[cls] = grouped[cls].length;
    return acc;
  }, {} as Record<EmailClassification, number>);

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
        onClose={() => { setIsModalOpen(false); resetForm(); }}
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
