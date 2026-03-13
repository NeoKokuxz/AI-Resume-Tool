"use client";

import { useDroppable } from "@dnd-kit/core";
import { ApplicationStatus } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface KanbanColumnProps {
  status: ApplicationStatus;
  label: string;
  count: number;
  children: React.ReactNode;
}

const headerColors: Record<ApplicationStatus, string> = {
  saved: "border-gray-600",
  applied: "border-blue-600",
  ats_passed: "border-purple-600",
  recruiter_contact: "border-yellow-600",
  interview: "border-orange-600",
  offer: "border-green-600",
  rejected: "border-red-600",
};

export function KanbanColumn({ status, label, count, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      className={cn(
        "flex-shrink-0 w-64 flex flex-col h-full rounded-xl transition-all duration-150",
        isOver ? "bg-indigo-950/20 ring-2 ring-indigo-600/50 ring-inset" : ""
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between mx-2 mt-2 mb-2 pb-2 border-b-2 flex-shrink-0",
          headerColors[status]
        )}
      >
        <span className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
          {label}
        </span>
        <Badge
          variant={
            status === "offer" ? "success" :
            status === "rejected" ? "danger" :
            status === "interview" ? "warning" : "default"
          }
        >
          {count}
        </Badge>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto rounded-lg mx-2 mb-2 p-2 space-y-2 transition-colors",
          isOver ? "bg-indigo-950/30" : "bg-gray-900/30"
        )}
      >
        {children}
      </div>
    </div>
  );
}
