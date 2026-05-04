import { geminiJson } from "@/lib/gemini";
import { calculateATSScore } from "@/lib/ats-scorer";
import type { HandlerContext } from "./types";

export async function handleAnalyzeJob({ payload, supabase }: HandlerContext) {
  const { jobDescription, resumeText, jobId } = payload as {
    jobDescription: string;
    resumeText?: string;
    jobId: string;
  };

  const atsResult = resumeText ? calculateATSScore(jobDescription, resumeText) : null;

  const prompt = `Analyze this job description and extract structured information.

Job Description:
${jobDescription}

Return a JSON object with these exact fields:
{
  "title": "extracted job title",
  "company": "company name if mentioned, otherwise Unknown",
  "location": "job location if mentioned, otherwise Remote",
  "requiredSkills": ["skill1", "skill2"],
  "niceToHaveSkills": ["skill1", "skill2"],
  "experienceRequired": "X years",
  "keyResponsibilities": ["resp1", "resp2"],
  "summary": "2-sentence summary of the role"
}

Return ONLY the JSON, no markdown, no other text.`;

  const result = await geminiJson().generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

  const updates: Record<string, unknown> = {};
  if (atsResult) updates.ats_result = atsResult;
  if (analysis?.title) updates.title = analysis.title;
  if (analysis?.company && analysis.company !== "Unknown") updates.company = analysis.company;
  if (analysis?.location && analysis.location !== "Remote") updates.location = analysis.location;

  await supabase.from("jobs").update(updates).eq("id", jobId);
}
