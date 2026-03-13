"use client";

import { Email, EmailClassification, Job } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { EmailCard } from "@/components/email/EmailCard";
import { getClassificationColor, getClassificationLabel } from "@/lib/utils";
import {
  CheckCircle,
  AlertCircle,
  User,
  Clock,
} from "lucide-react";

const CLASSIFICATION_ICONS: Record<EmailClassification, React.ElementType> = {
  interview: CheckCircle,
  assessment: AlertCircle,
  rejection: AlertCircle,
  recruiter_outreach: User,
  unknown: Clock,
};

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

interface EmailGroupProps {
  classification: EmailClassification;
  emails: Email[];
  jobs: Job[];
  classifyingId: string | null;
  onReclassify: (id: string, subject: string, body: string) => void;
  onDelete: (id: string) => void;
}

export function EmailGroup({
  classification,
  emails,
  jobs,
  classifyingId,
  onReclassify,
  onDelete,
}: EmailGroupProps) {
  const badgeVariant = CLASSIFICATION_BADGE_VARIANT[classification];
  const Icon = CLASSIFICATION_ICONS[classification];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon size={14} className={getClassificationColor(classification).split(" ")[0]} />
        <h2 className="text-sm font-semibold text-gray-300">
          {getClassificationLabel(classification)}
        </h2>
        <Badge variant={badgeVariant}>{emails.length}</Badge>
      </div>
      <div className="space-y-2">
        {emails.map((email) => {
          const relatedJob = jobs.find((j) => j.id === email.relatedJobId);
          return (
            <EmailCard
              key={email.id}
              email={email}
              relatedJob={relatedJob}
              classifyingId={classifyingId}
              onReclassify={onReclassify}
              onDelete={onDelete}
            />
          );
        })}
      </div>
    </div>
  );
}
