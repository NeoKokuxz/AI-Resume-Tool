import { NextRequest, NextResponse } from "next/server";
import { geminiJson } from "@/lib/gemini";
import { calculateATSScore } from "@/lib/ats-scorer";

export async function POST(request: NextRequest) {
  try {
    const { jobDescription, resumeText } = await request.json();

    if (!jobDescription) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

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

    let analysisData = null;
    try {
      const result = await geminiJson().generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) analysisData = JSON.parse(jsonMatch[0]);
    } catch (aiError) {
      console.error("AI analysis failed, using fallback:", aiError);
    }

    return NextResponse.json({ atsResult, analysis: analysisData });
  } catch (error) {
    console.error("Error analyzing job:", error);
    return NextResponse.json({ error: "Failed to analyze job description" }, { status: 500 });
  }
}
