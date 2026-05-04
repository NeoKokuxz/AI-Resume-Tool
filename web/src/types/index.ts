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

export type StudyDifficulty = "beginner" | "intermediate" | "advanced";

export interface StudyResource {
  title: string;
  type: "article" | "video" | "course" | "doc" | "book";
  url?: string;
}

export interface StudyLessonContent {
  overview: string;
  walkthrough: { heading: string; body: string }[];
  keyTakeaways: string[];
  examples: { title: string; body: string; code?: string }[];
  exercises: string[];
  furtherReading: StudyResource[];
}

export interface StudyLesson {
  title: string;
  content?: StudyLessonContent;
  generatedAt?: string;
  // ID of the AI model that produced `content`. Empty until generated.
  model?: string;
}

export interface StudyChapter {
  id: string;
  title: string;
  summary: string;
  skills: string[];
  difficulty: StudyDifficulty;
  estimatedHours: number;
  // Lessons are stored as {title, content?}. Older cached plans may have them
  // as raw strings; consumers should normalize before render.
  lessons: (StudyLesson | string)[];
  resources: StudyResource[];
  whyImportant?: string;
}

export interface StudyPlan {
  prompt: string;
  generatedAt: string;
  overview: string;
  chapters: StudyChapter[];
}

export interface DashboardStats {
  totalApplications: number;
  interviews: number;
  offers: number;
  rejections: number;
  atsPassRate: number;
}

// The kanban + study consume `getStatusColor()` from lib/utils.ts for badge
// styling, not these constants — they only need `value` and `label`.
export const APPLICATION_STATUSES: {
  value: ApplicationStatus;
  label: string;
}[] = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "ats_passed", label: "ATS Passed" },
  { value: "recruiter_contact", label: "Recruiter" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
];
