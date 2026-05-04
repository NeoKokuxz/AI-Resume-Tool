import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/ai-queue/client";
import { isValidStudyModel, DEFAULT_STUDY_MODEL } from "@/lib/study-utils";
import { generateJsonWithFallback, parseJsonObject, isTransientAIError } from "@/lib/ai-generate";
import { getRouteUser } from "@/lib/supabase/route-auth";
import type { StudyChapter } from "@/types";

async function fetchCurrentResumeId(supabase: ReturnType<typeof createServiceRoleClient>, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from("resumes")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "base")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// GET — return the cached plan (and whether it's stale relative to current resume)
export async function GET(request: NextRequest) {
  try {
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    const [{ data: cached }, currentResumeId] = await Promise.all([
      supabase
        .from("study_plans")
        .select("prompt, overview, chapters, resume_id, generated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      fetchCurrentResumeId(supabase, user.id),
    ]);

    if (!cached) {
      return NextResponse.json({ plan: null, currentResumeId });
    }

    const isStale = Boolean(currentResumeId) && cached.resume_id !== currentResumeId;

    return NextResponse.json({
      plan: {
        prompt: cached.prompt || "",
        overview: cached.overview || "",
        chapters: (cached.chapters as StudyChapter[]) || [],
        generatedAt: cached.generated_at,
      },
      isStale,
      currentResumeId,
      cachedResumeId: cached.resume_id,
    });
  } catch (error) {
    console.error("Error fetching study plan:", error);
    return NextResponse.json({ error: "Failed to fetch study plan" }, { status: 500 });
  }
}

// POST — generate a new plan and upsert to cache
export async function POST(request: NextRequest) {
  try {
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, model: requestedModel, tags } = await request.json() as {
      prompt?: string;
      model?: string;
      tags?: string[];
    };
    const cleanPrompt = (prompt || "").trim();
    const cleanTags = Array.isArray(tags)
      ? tags.map((t) => (typeof t === "string" ? t.trim() : "")).filter(Boolean).slice(0, 12)
      : [];
    // User must give us either a freeform prompt or at least one topic chip.
    if (!cleanPrompt && cleanTags.length === 0) {
      return NextResponse.json({ error: "prompt or tags required" }, { status: 400 });
    }
    const preferredModel = isValidStudyModel(requestedModel) ? requestedModel : DEFAULT_STUDY_MODEL;

    const supabase = createServiceRoleClient();

    const [{ data: profile }, { data: resumeData }, { data: resume }] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("full_name, work_title, skills, years_experience")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("resume_data")
        .select("summary, skills, tools, experience, education, certifications, work_title, years_experience")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("resumes")
        .select("id, content")
        .eq("user_id", user.id)
        .eq("type", "base")
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (!resume?.content && !resumeData) {
      return NextResponse.json(
        { error: "Upload a resume first so we can build a personalized study plan." },
        { status: 404 }
      );
    }

    const skills: string[] = resumeData?.skills || profile?.skills || [];
    const tools: string[] = resumeData?.tools || [];
    const certifications: string[] = resumeData?.certifications || [];
    const workTitle = resumeData?.work_title || profile?.work_title || "";
    const yearsExperience = resumeData?.years_experience ?? profile?.years_experience ?? 0;
    const summary = resumeData?.summary || "";
    const experience: { title?: string; company?: string }[] = resumeData?.experience || [];

    const experienceLine = experience
      .slice(0, 4)
      .map((e) => `${e.title || ""} at ${e.company || ""}`.trim())
      .filter(Boolean)
      .join("; ");

    const requiredChaptersBlock = cleanTags.length
      ? `REQUIRED CHAPTERS (each must be its own chapter, in this order):
${cleanTags.map((t, i) => `${i + 1}. ${t}`).join("\n")}

After the required chapters, add 1-2 additional chapters that complement them
based on the candidate's goal and resume gaps. Total chapters: ${cleanTags.length} required
+ 1-2 supplemental.`
      : "Build 4-6 chapters total, ordered from foundational to advanced.";

    const goalBlock = cleanPrompt
      ? `CANDIDATE'S GOAL / REQUEST:\n${cleanPrompt}`
      : `CANDIDATE'S GOAL / REQUEST:\n(No freeform goal — base the plan on the required chapters above and the candidate's resume gaps.)`;

    const aiPrompt = `You are a senior career coach building a personalized study plan.

CANDIDATE PROFILE:
Name: ${profile?.full_name || ""}
Current title: ${workTitle}
Years of experience: ${yearsExperience}
Summary: ${summary}
Existing skills: ${skills.join(", ") || "none provided"}
Tools: ${tools.join(", ") || "none provided"}
Certifications: ${certifications.join(", ") || "none"}
Recent experience: ${experienceLine || "none provided"}

${goalBlock}

${requiredChaptersBlock}

Return a JSON object with this exact shape:
{
  "overview": "2-3 sentence overview of the plan and why these chapters",
  "chapters": [
    {
      "id": "chapter-1",
      "title": "Concise chapter title (e.g. 'Master React Server Components')",
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
  ]
}

Rules:
- Skip skills the candidate already has UNLESS the goal explicitly requires deepening them.
- "lessons": 4-7 specific, actionable subtopics per chapter (not vague).
- "skills": 2-5 skills the chapter teaches.
- "estimatedHours": realistic integer.
- "resources": 2-4 well-known resources. Only include url if you are confident it exists.
- Difficulty should match where this chapter sits in the candidate's progression — don't mark everything "advanced".
- Tailor language to the candidate's level (don't suggest "Intro to JavaScript" to a senior dev).
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

    const parsed = parseJsonObject<{ overview: string; chapters: StudyChapter[] }>(raw);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    const chapters: StudyChapter[] = (parsed.chapters || []).map((c, i) => ({
      id: c.id || `chapter-${i + 1}`,
      title: c.title || `Chapter ${i + 1}`,
      summary: c.summary || "",
      skills: Array.isArray(c.skills) ? c.skills : [],
      difficulty: ["beginner", "intermediate", "advanced"].includes(c.difficulty)
        ? c.difficulty
        : "intermediate",
      estimatedHours: typeof c.estimatedHours === "number" ? c.estimatedHours : 0,
      lessons: Array.isArray(c.lessons) ? c.lessons : [],
      resources: Array.isArray(c.resources) ? c.resources : [],
      whyImportant: c.whyImportant || "",
    }));

    const generatedAt = new Date().toISOString();
    // Build a human-readable prompt for the cache row that includes both
    // freeform text and any tags used.
    const persistedPrompt = [
      cleanPrompt,
      cleanTags.length ? `Tags: ${cleanTags.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // Cache plan (one row per user, replaced on regen)
    const { error: cacheError } = await supabase.from("study_plans").upsert(
      {
        user_id: user.id,
        prompt: persistedPrompt,
        overview: parsed.overview || "",
        chapters,
        resume_id: resume?.id ?? null,
        generated_at: generatedAt,
        updated_at: generatedAt,
      },
      { onConflict: "user_id" }
    );
    if (cacheError) {
      console.error("[study-plan] failed to cache plan:", cacheError);
    }

    return NextResponse.json({
      overview: parsed.overview || "",
      chapters,
      generatedAt,
      prompt: persistedPrompt,
      model: usedModel,
      saved: !cacheError,
      saveError: cacheError ? cacheError.message : null,
    });
  } catch (error) {
    console.error("[study-plan] POST error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to generate study plan: ${message}` },
      { status: 500 }
    );
  }
}
