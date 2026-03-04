import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const { baseResume, jobDescription, jobTitle, company } = await request.json();

    if (!baseResume || !jobDescription) {
      return NextResponse.json(
        { error: "Base resume and job description are required" },
        { status: 400 }
      );
    }

    const resumePrompt = `You are an expert resume writer and ATS optimization specialist.

Your task is to tailor the following resume for the specific job description provided.

BASE RESUME:
${baseResume}

JOB DESCRIPTION:
${jobDescription}

Instructions:
1. Reorder and emphasize experiences most relevant to this role
2. Incorporate keywords from the job description naturally
3. Quantify achievements where possible
4. Ensure ATS compatibility (clean formatting, standard sections)
5. Preserve ALL factual information - do not invent or exaggerate
6. Keep the same general structure but optimize the content
7. Focus on impact and results that align with the job requirements

Return ONLY the tailored resume text, ready to copy-paste. No explanations or commentary.`;

    const coverLetterPrompt = `Write a professional, concise cover letter for this job application.

JOB: ${jobTitle || "the position"} at ${company || "the company"}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE RESUME:
${baseResume}

Instructions:
1. Write 3-4 short paragraphs
2. Opening: Express genuine interest and mention a key achievement
3. Middle: Connect 2-3 specific experiences to job requirements
4. Closing: Clear call to action
5. Keep it under 300 words
6. Professional but personable tone
7. Do NOT use generic phrases like "I am writing to express my interest"

Return ONLY the cover letter text. No subject line needed.`;

    const [resumeResponse, coverLetterResponse] = await Promise.all([
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        messages: [{ role: "user", content: resumePrompt }],
      }),
      client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: coverLetterPrompt }],
      }),
    ]);

    const tailoredResume =
      resumeResponse.content[0].type === "text"
        ? resumeResponse.content[0].text
        : "";

    const coverLetter =
      coverLetterResponse.content[0].type === "text"
        ? coverLetterResponse.content[0].text
        : "";

    return NextResponse.json({ tailoredResume, coverLetter });
  } catch (error) {
    console.error("Error generating resume:", error);
    return NextResponse.json(
      { error: "Failed to generate tailored resume" },
      { status: 500 }
    );
  }
}
