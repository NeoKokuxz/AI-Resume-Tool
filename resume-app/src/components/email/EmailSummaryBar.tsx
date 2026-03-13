"use client";

import { EmailClassification } from "@/types";
import { getClassificationColor, getClassificationLabel, cn } from "@/lib/utils";
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

interface EmailSummaryBarProps {
  counts: Record<EmailClassification, number>;
  order: EmailClassification[];
}

export function EmailSummaryBar({ counts, order }: EmailSummaryBarProps) {
  return (
    <div className="grid grid-cols-5 gap-3 mb-6">
      {order.map((cls) => {
        const count = counts[cls];
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
  );
}
