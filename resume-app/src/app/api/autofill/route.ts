import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/ai-queue/client";
import { getUserIdFromToken, extractBearerToken } from "@/lib/ai-queue/auth";
import { geminiJson } from "@/lib/gemini";
import { classifyAndResolve } from "@/lib/autofill-classifier";
import type { ExtractedField, FieldAnswer, ResumeData } from "@/types/autofill";

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

  const { fields, jobContext } = await request.json() as {
    fields: ExtractedField[];
    jobContext?: { title: string; company: string; description: string };
  };

  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return NextResponse.json({ error: "fields array required" }, { status: 400, headers: corsHeaders });
  }

  // ── Fetch resume_data for this user ──────────────────────────────────────
  const supabase = createServiceRoleClient();
  const { data: row } = await supabase
    .from("resume_data")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json(
      { error: "No resume data found. Please upload a resume first." },
      { status: 404, headers: corsHeaders }
    );
  }

  // Also fetch user email from auth (not in resume_data necessarily)
  const { data: profileRow } = await supabase
    .from("user_profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();

  const resumeData: ResumeData = {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name || "",
    email: row.email || profileRow?.email || "",
    phone: row.phone || "",
    linkedin: row.linkedin || "",
    github: row.github || "",
    website: row.website || "",
    location: row.location || "",
    city: row.city || "",
    state: row.state || "",
    country: row.country || "",
    workTitle: row.work_title || "",
    yearsExperience: row.years_experience || 0,
    summary: row.summary || "",
    skills: row.skills || [],
    tools: row.tools || [],
    languages: row.languages || [],
    certifications: row.certifications || [],
    education: row.education || [],
    experience: row.experience || [],
    workAuthorization: row.work_authorization || "",
  };

  // ── Phase 1: Rule-based classification ───────────────────────────────────
  const answers: FieldAnswer[] = [];
  const unmatched: ExtractedField[] = [];

  for (const field of fields) {
    // Skip fields that already have values
    if (field.currentValue) {
      answers.push({
        id: field.id,
        value: field.currentValue,
        confidence: 1.0,
        source: "rule",
        classification: "pre_filled",
      });
      continue;
    }

    const result = classifyAndResolve(field, resumeData);
    if (result) {
      answers.push(result);
    } else {
      unmatched.push(field);
    }
  }

  // ── Phase 2: AI for unmatched fields (batched) ──────────────────────────
  if (unmatched.length > 0) {
    try {
      const aiAnswers = await getAIAnswers(unmatched, resumeData, jobContext);
      answers.push(...aiAnswers);
    } catch (err) {
      console.error("AI autofill failed:", err);
      // Return what we have from rules — AI fields will be missing
      for (const field of unmatched) {
        answers.push({
          id: field.id,
          value: "",
          confidence: 0,
          source: "ai",
          classification: "unknown",
        });
      }
    }
  }

  return NextResponse.json({ answers }, { headers: corsHeaders });
}

async function getAIAnswers(
  fields: ExtractedField[],
  resumeData: ResumeData,
  jobContext?: { title: string; company: string; description: string }
): Promise<FieldAnswer[]> {
  const fieldsForPrompt = fields.map((f, i) => ({
    index: i,
    id: f.id,
    label: f.label,
    placeholder: f.placeholder,
    type: f.tagName,
    inputType: f.inputType,
    options: f.options.length > 0 ? f.options : undefined,
    required: f.required,
  }));

  const experienceSummary = resumeData.experience
    .slice(0, 3)
    .map((e) => `${e.title} at ${e.company} (${e.start}–${e.end})`)
    .join("; ");

  const educationSummary = resumeData.education
    .slice(0, 2)
    .map((e) => `${e.degree} in ${e.field} from ${e.school} (${e.year})`)
    .join("; ");

  const prompt = `You are filling out a job application form on behalf of this candidate.

CANDIDATE PROFILE:
Name: ${resumeData.fullName}
Email: ${resumeData.email}
Phone: ${resumeData.phone}
Title: ${resumeData.workTitle}
Location: ${resumeData.location}
Years of Experience: ${resumeData.yearsExperience}
Skills: ${resumeData.skills.join(", ")}
Tools: ${resumeData.tools.join(", ")}
Languages: ${resumeData.languages.join(", ")}
Certifications: ${resumeData.certifications.join(", ")}
Education: ${educationSummary}
Experience: ${experienceSummary}
Work Authorization: ${resumeData.workAuthorization}
Summary: ${resumeData.summary}
${
  jobContext
    ? `
JOB CONTEXT:
Title: ${jobContext.title}
Company: ${jobContext.company}
Description: ${jobContext.description.slice(0, 2000)}`
    : ""
}

FORM FIELDS TO FILL:
${JSON.stringify(fieldsForPrompt, null, 2)}

Return a JSON array of answers, one per field:
[
  {
    "index": 0,
    "value": "your answer",
    "confidence": 0.85,
    "classification": "field_type"
  }
]

Rules:
- For select/radio fields, pick ONLY from the provided options array. Return the exact option string.
- For yes/no questions about work authorization, sponsorship, disability, veteran status — infer from the candidate profile. If unsure, set confidence to 0.3.
- For free-text questions ("Why do you want to work here?", "Tell us about yourself"), write 2-4 sentences using the job context and candidate background.
- For questions you cannot answer, set value to "" and confidence to 0.
- confidence: 0.9 for certain answers, 0.7 for likely answers, 0.3 for guesses.
- Return ONLY the JSON array.`;

  const model = geminiJson();
  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  let parsed: { index: number; value: string; confidence: number; classification: string }[];
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    parsed = JSON.parse(jsonMatch?.[0] || raw);
  } catch {
    throw new Error("Failed to parse AI autofill response");
  }

  return parsed.map((item) => ({
    id: fields[item.index]?.id || "",
    value: item.value || "",
    confidence: item.confidence || 0.5,
    source: "ai" as const,
    classification: item.classification || "unknown",
  }));
}
