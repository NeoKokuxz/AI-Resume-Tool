import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";
import { createServiceRoleClient } from "@/lib/ai-queue/client";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { baseResume, jobDescription, jobTitle, company, applicationId } = await request.json();

    if (!baseResume || !jobDescription) {
      return NextResponse.json(
        { error: "Base resume and job description are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const resumePrompt = `You are a professional resume writer and ATS optimization expert. Your task is to rewrite the candidate's resume to maximally match the target job — improving ATS pass rate and recruiter relevance.

## Target Role
Job Title: ${jobTitle || "Unknown"}
Company: ${company || "Unknown"}

## Job Description
${jobDescription}

## Candidate's Base Resume
${baseResume}

## Instructions
1. **Mirror keywords exactly** — identify the most important skills, tools, technologies, and phrases from the job description and weave them naturally into the resume. Use the exact terminology the job posting uses (e.g. if it says "cross-functional collaboration", use that phrase).
2. **Reorder and prioritize** — move the most relevant experience, projects, and skills to the top of each section. Lead with what matters most for this role.
3. **Rewrite bullet points** — transform generic bullets into achievement-driven, role-specific statements using the job's language. Use strong action verbs. Quantify impact wherever the base resume provides numbers.
4. **Skills section** — reorder skills to list the ones explicitly required by the job first. Remove skills irrelevant to this role if space is tight.
5. **Summary/objective** — rewrite it as a 2–3 sentence elevator pitch that directly addresses what this employer is looking for.
6. **Do NOT fabricate** — do not invent jobs, degrees, companies, dates, or metrics not present in the base resume. Only restructure and rephrase what exists.
7. **Preserve structure** — keep the same sections (Experience, Education, Skills, etc.) in roughly the same format.
8. **Output format** — return ONLY the tailored resume text. No commentary, no preamble, no markdown code fences.`;

    const coverLetterPrompt = `You are a professional cover letter writer. Write a compelling, concise cover letter tailored to this specific role and company.

Job Title: ${jobTitle || "the position"}
Company: ${company || "the company"}

Job Description:
${jobDescription}

Candidate Resume:
${baseResume}

Instructions:
- 3 paragraphs: (1) why this role at this company specifically, (2) 2–3 concrete achievements from the resume most relevant to the job, (3) forward-looking close.
- Mirror 3–5 keywords from the job description naturally.
- Be specific — reference the company name and role. Do not use filler phrases like "I am excited to apply".
- No placeholders (e.g. [Your Name]). Write as if from the candidate directly.
- Return ONLY the cover letter text.`;

    const [resumeResult, coverResult] = await Promise.all([
      geminiFlash.generateContent(resumePrompt),
      geminiFlash.generateContent(coverLetterPrompt),
    ]);

    const tailoredResume = resumeResult.response.text().trim();
    const coverLetter = coverResult.response.text().trim();

    // If applicationId provided, persist tailored resume and update application
    if (applicationId) {
      const supabase = createServiceRoleClient();

      const { data: app } = await supabase
        .from("applications")
        .select("user_id")
        .eq("id", applicationId)
        .single();

      if (app) {
        const { data: resumeRow } = await supabase
          .from("resumes")
          .insert({
            user_id: app.user_id,
            type: "tailored",
            file_name: `Tailored — ${jobTitle || "Resume"} at ${company || "Company"}`,
            content: tailoredResume,
            skills: [],
          })
          .select("id")
          .single();

        // Keep status as "saved" — user hasn't applied yet, just tailored
        await supabase
          .from("applications")
          .update({
            tailored_resume_id: resumeRow?.id ?? null,
            cover_letter: coverLetter,
          })
          .eq("id", applicationId);
      }
    }

    return NextResponse.json({ tailoredResume, coverLetter }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error generating resume:", error);
    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500, headers: corsHeaders }
    );
  }
}
