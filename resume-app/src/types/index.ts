export type ApplicationStatus =
  | "saved"
  | "applied"
  | "ats_passed"
  | "recruiter_contact"
  | "interview"
  | "offer"
  | "rejected";

export type EmailClassification =
  | "interview"
  | "assessment"
  | "rejection"
  | "recruiter_outreach"
  | "unknown";

export type AIOperationType =
  | "extract_resume"
  | "analyze_job"
  | "generate_resume"
  | "classify_email";

export type AIOperationStatus = "processing" | "done" | "failed";

export interface Resume {
  id: string;
  fileName: string;
  content: string;
  skills: string[];
  uploadedAt: string;
  pdfStoragePath?: string; // path in Supabase Storage, only set for PDF uploads
}

export interface ATSResult {
  score: number;
  keywordScore?: number;
  experienceScore?: number;
  titleScore?: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  summary?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  location: string;
  url?: string;
  salary?: string;
  jobType?: string;
  workplace?: string;
  atsResult?: ATSResult;
  addedAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  job: Job;
  tailoredResumeId?: string;
  coverLetter?: string;
  status: ApplicationStatus;
  atsScore?: number;
  appliedAt: string;
  notes?: string;
}

export interface Email {
  id: string;
  subject: string;
  sender: string;
  body: string;
  classification: EmailClassification;
  relatedJobId?: string;
  receivedAt: string;
}

export interface UserProfile {
  fullName?: string;
  workTitle?: string;
  yearsExperience?: number;
  linkedin?: string;
  github?: string;
  phone?: string;
  location?: string;
  skills?: string[];
  onboarded: boolean;
}

export interface DashboardStats {
  totalApplications: number;
  interviews: number;
  offers: number;
  rejections: number;
  atsPassRate: number;
}

export const APPLICATION_STATUSES: {
  value: ApplicationStatus;
  label: string;
  color: string;
  bg: string;
}[] = [
  { value: "saved", label: "Saved", color: "text-gray-400", bg: "bg-gray-800" },
  { value: "applied", label: "Applied", color: "text-blue-400", bg: "bg-blue-950" },
  { value: "ats_passed", label: "ATS Passed", color: "text-purple-400", bg: "bg-purple-950" },
  { value: "recruiter_contact", label: "Recruiter", color: "text-yellow-400", bg: "bg-yellow-950" },
  { value: "interview", label: "Interview", color: "text-orange-400", bg: "bg-orange-950" },
  { value: "offer", label: "Offer", color: "text-green-400", bg: "bg-green-950" },
  { value: "rejected", label: "Rejected", color: "text-red-400", bg: "bg-red-950" },
];
