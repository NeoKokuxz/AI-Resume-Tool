import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/ai-queue/client";
import { isValidStudyModel, DEFAULT_STUDY_MODEL } from "@/lib/study-utils";
import { generateJsonWithFallback, parseJsonObject, isTransientAIError } from "@/lib/ai-generate";
import { getRouteUser } from "@/lib/supabase/route-auth";
import type { StudyChapter } from "@/types";

function generateChapterId(existing: StudyChapter[]): string {
  // Find next available "chapter-N" id not already used
  const used = new Set(existing.map((c) => c.id));
  let n = existing.length + 1;
  while (used.has(`chapter-${n}`)) n++;
  return `chapter-${n}`;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { topic, model: requestedModel } = (await request.json()) as {
      topic?: string;
      model?: string;
    };
    const preferredModel = isValidStudyModel(requestedModel) ? requestedModel : DEFAULT_STUDY_MODEL;

    const supabase = createServiceRoleClient();

    const [{ data: planRow }, { data: resumeData }, { data: profile }] = await Promise.all([
      supabase
        .from("study_plans")
        .select("prompt, overview, chapters")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("resume_data")
        .select("summary, skills, tools, experience, certifications, work_title, years_experience")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select("full_name, work_title, skills, years_experience")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    if (!planRow) {
      return NextResponse.json(
        { error: "No study plan exists yet — generate one first." },
        { status: 404 }
      );
    }

    const existingChapters = (planRow.chapters as StudyChapter[]) || [];
    const existingTitles = existingChapters.map((c) => `- ${c.title} (${c.skills.join(", ")})`).join("\n");

    const skills: string[] = resumeData?.skills || profile?.skills || [];
    const tools: string[] = resumeData?.tools || [];
    const certifications: string[] = resumeData?.certifications || [];
    const workTitle = resumeData?.work_title || profile?.work_title || "";
    const yearsExperience = resumeData?.years_experience ?? profile?.years_experience ?? 0;
    const summary = resumeData?.summary || "";

    const aiPrompt = `You are a senior career coach adding ONE new chapter to an existing study plan.

CANDIDATE PROFILE:
Name: ${profile?.full_name || ""}
Current title: ${workTitle}
Years of experience: ${yearsExperience}
Summary: ${summary}
Existing skills: ${skills.join(", ") || "none provided"}
Tools: ${tools.join(", ") || "none provided"}
Certifications: ${certifications.join(", ") || "none"}

OVERALL STUDY GOAL:
${planRow.prompt || "career growth"}

EXISTING CHAPTERS (do NOT duplicate these):
${existingTitles || "(no chapters yet)"}

WHAT THE USER WANTS THIS NEW CHAPTER TO COVER:
${topic?.trim() || "(no specific topic — pick a meaningful gap that fits the candidate's overall goal and complements the existing chapters)"}

Build ONE new chapter. It must complement the existing chapters and not repeat their content.

Return a JSON object with this exact shape:
{
  "title": "Concise chapter title",
  "summary": "1-2 sentence summary of what this chapter covers",
  "skills": ["skill1", "skill2"],
  "difficulty": "beginner|intermediate|advanced",
  "estimatedHours": 8,
  "lessons": ["specific subtopic 1", "specific subtopic 2", "..."],
  "resources": [
    { "title": "Resource name", "type": "article|video|course|doc|book", "url": "https://... (optional)" }
  ],
  "whyImportant": "1 sentence on why this matters for their goal"
}

Rules:
- "lessons": 4-7 specific, actionable subtopics (not vague).
- "skills": 2-5 skills the chapter teaches.
- "estimatedHours": realistic integer.
- "resources": 2-4 well-known resources. Only include url if you are confident.
- difficulty should fit naturally with the candidate's level and the existing chapters' progression.
- Don't restate skills the candidate already has unless the topic explicitly requires deepening them.
- Return ONLY the JSON, no markdown.`;

    let raw: string;
    let usedModel: string;
    try {
      const out = await generateJsonWithFallback(aiPrompt, preferredModel);
      raw = out.text;
      usedModel = out.model;
    } catch (err) {
      if (isTransientAIError(err)) {
        return NextResponse.json(
          { error: "AI service is temporarily overloaded. Please try again in a moment." },
          { status: 503 }
        );
      }
      throw err;
    }

    const parsed = parseJsonObject<Partial<StudyChapter>>(raw);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    const newChapter: StudyChapter = {
      id: generateChapterId(existingChapters),
      title: parsed.title || "New chapter",
      summary: parsed.summary || "",
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      difficulty:
        parsed.difficulty && ["beginner", "intermediate", "advanced"].includes(parsed.difficulty)
          ? parsed.difficulty
          : "intermediate",
      estimatedHours: typeof parsed.estimatedHours === "number" ? parsed.estimatedHours : 0,
      lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
      resources: Array.isArray(parsed.resources) ? parsed.resources : [],
      whyImportant: parsed.whyImportant || "",
    };

    const updatedChapters: StudyChapter[] = [...existingChapters, newChapter];

    const { error: saveError } = await supabase
      .from("study_plans")
      .update({ chapters: updatedChapters, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (saveError) {
      console.error("[study-plan/chapter] failed to persist chapter:", saveError);
    }

    return NextResponse.json({
      chapter: newChapter,
      model: usedModel,
      saved: !saveError,
      saveError: saveError ? saveError.message : null,
    });
  } catch (error) {
    console.error("[study-plan/chapter] POST error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to generate chapter: ${message}` },
      { status: 500 }
    );
  }
}
