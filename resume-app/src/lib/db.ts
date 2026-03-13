import { createClient } from "@/lib/supabase/client";
import { Application, ApplicationStatus, Email, EmailClassification, Job, Resume } from "@/types";

const supabase = createClient();

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapResume(row: Record<string, unknown>): Resume {
  return {
    id: row.id as string,
    fileName: row.file_name as string,
    content: row.content as string,
    skills: (row.skills as string[]) || [],
    uploadedAt: row.uploaded_at as string,
  };
}

function mapJob(row: Record<string, unknown>): Job {
  return {
    id: row.id as string,
    title: row.title as string,
    company: row.company as string,
    description: row.description as string,
    location: row.location as string,
    url: (row.url as string) || undefined,
    atsResult: (row.ats_result as Job["atsResult"]) || undefined,
    addedAt: row.added_at as string,
  };
}

function mapApplication(row: Record<string, unknown>): Application {
  const job = row.job_snapshot as Job;
  return {
    id: row.id as string,
    jobId: job.id,
    job,
    status: row.status as ApplicationStatus,
    atsScore: row.ats_score as number | undefined,
    tailoredResumeId: (row.tailored_resume_id as string) || undefined,
    coverLetter: (row.cover_letter as string) || undefined,
    notes: (row.notes as string) || undefined,
    appliedAt: row.applied_at as string,
  };
}

function mapEmail(row: Record<string, unknown>): Email {
  return {
    id: row.id as string,
    subject: row.subject as string,
    sender: row.sender as string,
    body: row.body as string,
    classification: row.classification as EmailClassification,
    receivedAt: row.received_at as string,
  };
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ─── Hydrate ─────────────────────────────────────────────────────────────────

export async function fetchAll() {
  const userId = await getUserId();
  if (!userId) return null;

  const [resumeRes, jobsRes, appsRes, emailsRes] = await Promise.all([
    supabase
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .eq("type", "base")
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("jobs").select("*").eq("user_id", userId).order("added_at", { ascending: false }),
    supabase.from("applications").select("*").eq("user_id", userId).order("applied_at", { ascending: false }),
    supabase.from("emails").select("*").eq("user_id", userId).order("received_at", { ascending: false }),
  ]);

  return {
    resume: resumeRes.data ? mapResume(resumeRes.data) : null,
    jobs: (jobsRes.data ?? []).map(mapJob),
    applications: (appsRes.data ?? []).map(mapApplication),
    emails: (emailsRes.data ?? []).map(mapEmail),
  };
}

// ─── Resume ──────────────────────────────────────────────────────────────────

export async function saveResume(resume: Resume): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  await supabase.from("resumes").upsert({
    user_id: userId,
    type: "base",
    file_name: resume.fileName,
    content: resume.content,
    skills: resume.skills,
    uploaded_at: resume.uploadedAt,
  });
}

/** Save a tailored resume to the resumes table and return its ID. */
export async function saveTailoredResume(
  content: string,
  jobTitle: string,
  company: string
): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("resumes")
    .insert({
      user_id: userId,
      type: "tailored",
      file_name: `Tailored — ${jobTitle} at ${company}`,
      content,
      skills: [],
    })
    .select("id")
    .single();

  if (error || !data) return null;
  return data.id as string;
}

/** Fetch a single resume by ID. */
export async function fetchResumeById(id: string): Promise<Resume | null> {
  const { data, error } = await supabase
    .from("resumes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return mapResume(data);
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export async function createJob(jobData: Omit<Job, "id" | "addedAt">): Promise<Job | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      title: jobData.title,
      company: jobData.company,
      description: jobData.description,
      location: jobData.location,
      url: jobData.url ?? "",
      ats_result: jobData.atsResult ?? null,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapJob(data);
}

export async function updateJobInDb(id: string, updates: Partial<Job>): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.atsResult !== undefined) dbUpdates.ats_result = updates.atsResult;
  if (updates.title) dbUpdates.title = updates.title;
  if (updates.company) dbUpdates.company = updates.company;
  await supabase.from("jobs").update(dbUpdates).eq("id", id);
}

export async function deleteJobFromDb(id: string): Promise<void> {
  await supabase.from("jobs").delete().eq("id", id);
}

// ─── Applications ─────────────────────────────────────────────────────────────

export async function createApplication(
  appData: Omit<Application, "id" | "appliedAt">
): Promise<Application | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      job_snapshot: appData.job,
      status: appData.status,
      ats_score: appData.atsScore ?? null,
      tailored_resume_id: appData.tailoredResumeId ?? null,
      cover_letter: appData.coverLetter ?? "",
      notes: appData.notes ?? "",
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapApplication(data);
}

export async function updateApplicationInDb(
  id: string,
  updates: Partial<Application>
): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.status) dbUpdates.status = updates.status;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.tailoredResumeId !== undefined) dbUpdates.tailored_resume_id = updates.tailoredResumeId;
  if (updates.coverLetter !== undefined) dbUpdates.cover_letter = updates.coverLetter;
  if (updates.atsScore !== undefined) dbUpdates.ats_score = updates.atsScore;
  await supabase.from("applications").update(dbUpdates).eq("id", id);
}

export async function deleteApplicationFromDb(id: string): Promise<void> {
  await supabase.from("applications").delete().eq("id", id);
}

// ─── Emails ──────────────────────────────────────────────────────────────────

export async function createEmail(
  emailData: Omit<Email, "id" | "receivedAt">
): Promise<Email | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const { data, error } = await supabase
    .from("emails")
    .insert({
      user_id: userId,
      subject: emailData.subject,
      sender: emailData.sender,
      body: emailData.body,
      classification: emailData.classification,
    })
    .select()
    .single();

  if (error || !data) return null;
  return mapEmail(data);
}

export async function updateEmailInDb(id: string, updates: Partial<Email>): Promise<void> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.classification) dbUpdates.classification = updates.classification;
  await supabase.from("emails").update(dbUpdates).eq("id", id);
}

export async function deleteEmailFromDb(id: string): Promise<void> {
  await supabase.from("emails").delete().eq("id", id);
}
