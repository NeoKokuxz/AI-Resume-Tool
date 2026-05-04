import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ApplicationStatus, EmailClassification } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
}

export function getStatusColor(status: ApplicationStatus): string {
  const colors: Record<ApplicationStatus, string> = {
    saved: "text-gray-400 bg-gray-800 border-gray-700",
    applied: "text-blue-400 bg-blue-950 border-blue-800",
    ats_passed: "text-purple-400 bg-purple-950 border-purple-800",
    recruiter_contact: "text-yellow-400 bg-yellow-950 border-yellow-800",
    interview: "text-orange-400 bg-orange-950 border-orange-800",
    offer: "text-green-400 bg-green-950 border-green-800",
    rejected: "text-red-400 bg-red-950 border-red-800",
  };
  return colors[status];
}

export function getStatusLabel(status: ApplicationStatus): string {
  const labels: Record<ApplicationStatus, string> = {
    saved: "Saved",
    applied: "Applied",
    ats_passed: "ATS Passed",
    recruiter_contact: "Recruiter Contact",
    interview: "Interview",
    offer: "Offer",
    rejected: "Rejected",
  };
  return labels[status];
}

export function getClassificationColor(classification: EmailClassification): string {
  const colors: Record<EmailClassification, string> = {
    interview: "text-green-400 bg-green-950 border-green-800",
    assessment: "text-blue-400 bg-blue-950 border-blue-800",
    rejection: "text-red-400 bg-red-950 border-red-800",
    recruiter_outreach: "text-yellow-400 bg-yellow-950 border-yellow-800",
    unknown: "text-gray-400 bg-gray-800 border-gray-700",
  };
  return colors[classification];
}

export function getClassificationLabel(classification: EmailClassification): string {
  const labels: Record<EmailClassification, string> = {
    interview: "Interview Invite",
    assessment: "Online Assessment",
    rejection: "Rejection",
    recruiter_outreach: "Recruiter Outreach",
    unknown: "Unknown",
  };
  return labels[classification];
}

export function getATSScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

export function getATSScoreBg(score: number): string {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  if (score >= 40) return "bg-orange-500";
  return "bg-red-500";
}
