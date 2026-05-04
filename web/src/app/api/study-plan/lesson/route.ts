import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/ai-queue/client";
import type { StudyChapter, StudyLesson, StudyLessonContent } from "@/types";
import {
  normalizeLesson,
  isValidStudyModel,
  DEFAULT_STUDY_MODEL,
} from "@/lib/study-utils";
import { generateJsonWithFallback, parseJsonObject, isTransientAIError } from "@/lib/ai-generate";
import { getRouteUser } from "@/lib/supabase/route-auth";

export async function POST(request: NextRequest) {
  try {
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chapterId, lessonIdx, regenerate, model: requestedModel } = (await request.json()) as {
      chapterId?: string;
      lessonIdx?: number;
      regenerate?: boolean;
      model?: string;
    };
    if (!chapterId || typeof lessonIdx !== "number") {
      return NextResponse.json({ error: "chapterId and lessonIdx required" }, { status: 400 });
    }
    const preferredModel = isValidStudyModel(requestedModel) ? requestedModel : DEFAULT_STUDY_MODEL;

    const supabase = createServiceRoleClient();
    const { data: planRow, error: fetchErr } = await supabase
      .from("study_plans")
      .select("prompt, chapters")
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchErr) {
      return NextResponse.json({ error: `DB error: ${fetchErr.message}` }, { status: 500 });
    }
    if (!planRow) {
      return NextResponse.json({ error: "No study plan found" }, { status: 404 });
    }

    const chapters = (planRow.chapters as StudyChapter[]) || [];
    const chapterIdx = chapters.findIndex((c) => c.id === chapterId);
    if (chapterIdx === -1) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }
    const chapter = chapters[chapterIdx];
    const rawLesson = chapter.lessons[lessonIdx];
    if (rawLesson === undefined) {
      return NextResponse.json({ error: "Lesson index out of range" }, { status: 404 });
    }
    const lesson = normalizeLesson(rawLesson);

    // Return cached content unless regenerate is requested
    if (lesson.content && !regenerate) {
      return NextResponse.json({
        content: lesson.content,
        cached: true,
        model: lesson.model || null,
      });
    }

    // Get user's resume context for personalization
    const { data: resumeData } = await supabase
      .from("resume_data")
      .select("work_title, summary, skills, tools, years_experience")
      .eq("user_id", user.id)
      .maybeSingle();

    const candidateSkills: string[] = resumeData?.skills || [];
    const candidateTools: string[] = resumeData?.tools || [];

    const aiPrompt = `You are a senior instructor writing one self-contained lesson for a personalized study plan.

CANDIDATE CONTEXT:
Current title: ${resumeData?.work_title || "unknown"}
Years of experience: ${resumeData?.years_experience ?? 0}
Existing skills: ${candidateSkills.join(", ") || "none provided"}
Tools they know: ${candidateTools.join(", ") || "none"}
Overall study goal: ${planRow.prompt || "career growth"}

CHAPTER CONTEXT:
Chapter title: ${chapter.title}
Chapter summary: ${chapter.summary}
Skills covered: ${chapter.skills.join(", ")}
Difficulty: ${chapter.difficulty}

LESSON TO WRITE:
"${lesson.title}"

Write a thorough, walk-the-reader-through-it lesson tailored to this candidate. Don't restate things they already know — assume their listed skills and build on them. Be concrete: real examples, real code where applicable, no filler.

Return a JSON object with this exact shape:
{
  "overview": "2-4 sentence intro: what this lesson is, why it matters for the candidate's goal, what they will be able to do after.",
  "walkthrough": [
    {
      "heading": "Concise section heading",
      "body": "1-3 paragraphs of explanation. Use plain text, but you may use \\n\\n between paragraphs. Be specific and substantive."
    }
  ],
  "keyTakeaways": ["pithy bullet 1", "pithy bullet 2", "..."],
  "examples": [
    {
      "title": "What the example demonstrates",
      "body": "Short narrative explaining the example.",
      "code": "Optional code block. If code, write it as plain text with newlines. Omit this field if not applicable."
    }
  ],
  "exercises": ["concrete exercise 1", "concrete exercise 2", "..."],
  "furtherReading": [
    { "title": "Resource name", "type": "article|video|course|doc|book", "url": "https://... (optional, only if you are confident)" }
  ]
}

Rules:
- walkthrough: 4-7 sections. Order them so each builds on the previous.
- keyTakeaways: 4-6 short bullets.
- examples: 1-3 concrete examples. Include "code" only when code clarifies the idea.
- exercises: 3-5 actionable exercises the candidate can do today to lock the lesson in.
- furtherReading: 2-4 well-known resources. Only include url if you are confident the URL is real.
- Match the candidate's level — don't lecture a senior dev on basics, don't drown a beginner in jargon.
- Plain text fields (no markdown). Newlines (\\n\\n) are OK to separate paragraphs in body fields.
- Return ONLY the JSON, no markdown wrapping.`;

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

    const parsed = parseJsonObject<StudyLessonContent>(raw);
    if (!parsed) {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    const content: StudyLessonContent = {
      overview: parsed.overview || "",
      walkthrough: Array.isArray(parsed.walkthrough)
        ? parsed.walkthrough.map((s) => ({ heading: s?.heading || "", body: s?.body || "" }))
        : [],
      keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
      examples: Array.isArray(parsed.examples)
        ? parsed.examples.map((e) => ({
            title: e?.title || "",
            body: e?.body || "",
            ...(e?.code ? { code: e.code } : {}),
          }))
        : [],
      exercises: Array.isArray(parsed.exercises) ? parsed.exercises : [],
      furtherReading: Array.isArray(parsed.furtherReading) ? parsed.furtherReading : [],
    };

    // Persist back into the chapter
    const updatedLesson: StudyLesson = {
      title: lesson.title,
      content,
      generatedAt: new Date().toISOString(),
      model: usedModel,
    };
    const updatedChapters: StudyChapter[] = chapters.map((c, i) => {
      if (i !== chapterIdx) return c;
      const newLessons = c.lessons.map((l, li) =>
        li === lessonIdx ? updatedLesson : normalizeLesson(l)
      );
      return { ...c, lessons: newLessons };
    });

    const { error: saveError } = await supabase
      .from("study_plans")
      .update({ chapters: updatedChapters, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (saveError) {
      console.error("[study-plan/lesson] failed to persist lesson:", saveError);
    }

    return NextResponse.json({
      content,
      cached: false,
      model: usedModel,
      saved: !saveError,
      saveError: saveError ? saveError.message : null,
    });
  } catch (error) {
    console.error("[study-plan/lesson] POST error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to generate lesson: ${message}` },
      { status: 500 }
    );
  }
}
