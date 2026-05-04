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

// Single source of truth for badge tints. Saturated low-alpha bg + a slightly
// stronger border alpha means badges pop on the dark surface and the border
// never falls back to currentColor (which would render near-white on this
// theme). The class strings must be literal so Tailwind's JIT can detect
// them — that's why this is an explicit map and not a string-built helper.
export type BadgeTint =
  | "gray"
  | "blue"
  | "purple"
  | "yellow"
  | "orange"
  | "green"
  | "emerald"
  | "red";

export const BADGE_TINTS: Record<BadgeTint, string> = {
  gray: "text-gray-300 bg-gray-500/15 border-gray-500/40",
  blue: "text-blue-300 bg-blue-500/15 border-blue-500/40",
  purple: "text-purple-300 bg-purple-500/15 border-purple-500/40",
  yellow: "text-yellow-300 bg-yellow-500/15 border-yellow-500/40",
  orange: "text-orange-300 bg-orange-500/15 border-orange-500/40",
  green: "text-green-300 bg-green-500/15 border-green-500/40",
  emerald: "text-emerald-300 bg-emerald-500/15 border-emerald-500/40",
  red: "text-red-300 bg-red-500/15 border-red-500/40",
};

const STATUS_TINTS: Record<ApplicationStatus, BadgeTint> = {
  saved: "gray",
  applied: "blue",
  ats_passed: "purple",
  recruiter_contact: "yellow",
  interview: "orange",
  offer: "emerald",
  rejected: "red",
};

export function getStatusColor(status: ApplicationStatus): string {
  return BADGE_TINTS[STATUS_TINTS[status]];
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

const CLASSIFICATION_TINTS: Record<EmailClassification, BadgeTint> = {
  interview: "emerald",
  assessment: "blue",
  rejection: "red",
  recruiter_outreach: "yellow",
  unknown: "gray",
};

export function getClassificationColor(classification: EmailClassification): string {
  return BADGE_TINTS[CLASSIFICATION_TINTS[classification]];
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
