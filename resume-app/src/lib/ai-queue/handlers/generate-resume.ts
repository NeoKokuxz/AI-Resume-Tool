import { geminiFlash } from "@/lib/gemini";
import type { HandlerContext } from "./types";

export async function handleGenerateResume({ payload, userId, supabase }: HandlerContext) {
  const { baseResume, jobDescription, jobTitle, company, applicationId } = payload as {
    baseResume: string;
    jobDescription: string;
    jobTitle: string;
    company: string;
    applicationId: string;
  };

  const resumePrompt = `You are an expert resume writer. Tailor the following resume to match the job description.
Keep the same structure and format. Emphasize relevant skills and experience. Do not fabricate experience.

Job Title: ${jobTitle || "Unknown"}
Company: ${company || "Unknown"}

Job Description:
${jobDescription.slice(0, 3000)}

Base Resume:
${baseResume.slice(0, 4000)}

Return ONLY the tailored resume text, no commentary, no markdown headers.`;

  const coverLetterPrompt = `Write a concise, professional cover letter for this job application.
3 paragraphs max. No placeholders — write naturally even without personal details.

Job Title: ${jobTitle || "the position"}
Company: ${company || "the company"}

Job Description:
${jobDescription.slice(0, 2000)}

Resume Summary:
${baseResume.slice(0, 1500)}

Return ONLY the cover letter text.`;

  const [resumeResult, coverResult] = await Promise.all([
    geminiFlash.generateContent(resumePrompt),
    geminiFlash.generateContent(coverLetterPrompt),
  ]);

  const tailoredResume = resumeResult.response.text().trim();
  const coverLetter = coverResult.response.text().trim();

  const { data: resumeData } = await supabase
    .from("resumes")
    .insert({
      user_id: userId,
      type: "tailored",
      file_name: `Tailored — ${jobTitle} at ${company}`,
      content: tailoredResume,
      skills: [],
    })
    .select("id")
    .single();

  await supabase.from("applications").update({
    tailored_resume_id: resumeData?.id ?? null,
    cover_letter: coverLetter,
  }).eq("id", applicationId);
}
