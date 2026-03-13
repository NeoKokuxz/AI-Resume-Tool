import { NextRequest, NextResponse } from "next/server";
import { geminiFlash } from "@/lib/gemini";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { baseResume, jobDescription, jobTitle, company } = await request.json();

    if (!baseResume || !jobDescription) {
      return NextResponse.json(
        { error: "Base resume and job description are required" },
        { status: 400, headers: corsHeaders }
      );
    }

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

    return NextResponse.json({ tailoredResume, coverLetter }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error generating resume:", error);
    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500, headers: corsHeaders }
    );
  }
}
