import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/ai-queue/client";
import { getUserIdFromToken, extractBearerToken } from "@/lib/ai-queue/auth";
import { geminiJson } from "@/lib/gemini";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const token = extractBearerToken(request.headers.get("Authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const { jobDescription } = await request.json();
  if (!jobDescription) {
    return NextResponse.json({ error: "jobDescription required" }, { status: 400, headers: corsHeaders });
  }

  const supabase = createServiceRoleClient();
  const { data: resume } = await supabase
    .from("resumes")
    .select("content")
    .eq("user_id", userId)
    .eq("type", "base")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .single();

  if (!resume) {
    return NextResponse.json({ error: "No resume found" }, { status: 404, headers: corsHeaders });
  }

  const prompt = `You are an expert ATS (Applicant Tracking System) analyst. Evaluate how well this resume matches the job description.

Job Description:
${jobDescription.slice(0, 3000)}

Resume:
${resume.content.slice(0, 4000)}

Return a JSON object with exactly this shape:
{
  "score": <integer 0-100>,
  "summary": "<2 sentence plain-English explanation of the match>",
  "matchedKeywords": ["<keyword>", ...],
  "missingKeywords": ["<keyword>", ...]
}

Scoring guide:
- 85-100: Strong match — most required skills and experience level align
- 65-84: Good match — core skills present, some gaps
- 45-64: Partial match — relevant background but missing key requirements
- 0-44: Weak match — significant skill or experience gaps

matchedKeywords: up to 10 skills/technologies/qualifications the resume clearly demonstrates
missingKeywords: up to 8 skills/technologies/qualifications the job requires that are absent or weak in the resume

Return ONLY the JSON object, no markdown, no explanation.`;

  const model = geminiJson();
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  let parsed: { score: number; summary: string; matchedKeywords: string[]; missingKeywords: string[] };
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json(parsed, { headers: corsHeaders });
}
