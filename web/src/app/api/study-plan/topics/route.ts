import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/ai-queue/client";
import { generateJsonWithFallback, parseJsonObject, isTransientAIError } from "@/lib/ai-generate";
import { getRouteUser } from "@/lib/supabase/route-auth";
import { FIXED_STUDY_TAGS, type StudyTopicPreset } from "@/lib/study-utils";

/**
 * Returns a list of topic chips to show in the Study Plan generator.
 * The 3 fixed core tags (Data Structures / Algorithms / System Design)
 * are always included. We additionally ask Flash Lite to suggest 5-7
 * topics that are specifically relevant to the user's resume.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getRouteUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Pull both resume_data (rich) and user_profiles (always exists for
    // logged-in users) so we can build a useful prompt even when the
    // user hasn't run the resume_data extract step.
    const [{ data: resumeData }, { data: profile }, { data: resume }] = await Promise.all([
      supabase
        .from("resume_data")
        .select("summary, skills, tools, work_title, years_experience, experience")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_profiles")
        .select("work_title, years_experience, skills")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("resumes")
        .select("content")
        .eq("user_id", user.id)
        .eq("type", "base")
        .order("uploaded_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const skills: string[] = (resumeData?.skills as string[] | null) || profile?.skills || [];
    const tools: string[] = (resumeData?.tools as string[] | null) || [];
    const workTitle = resumeData?.work_title || profile?.work_title || "";
    const yearsExperience = resumeData?.years_experience ?? profile?.years_experience ?? 0;
    const summary = resumeData?.summary || "";
    const experience: { title?: string; company?: string }[] = resumeData?.experience || [];
    const expLine = experience
      .slice(0, 4)
      .map((e) => `${e.title || ""} at ${e.company || ""}`.trim())
      .filter(Boolean)
      .join("; ");

    // If we don't have ANY signal (no skills, no resume text, no title), we
    // can't do better than the fixed three.
    const hasSignal = skills.length > 0 || tools.length > 0 || workTitle || resume?.content;
    if (!hasSignal) {
      console.log("[study-plan/topics] no resume signal; returning fixed tags only");
      return NextResponse.json({ topics: FIXED_STUDY_TAGS, source: "fixed-only" });
    }

    // If no rich resume_data but we have base resume content, give the AI a
    // chunk of raw resume text — better than nothing.
    const resumeBlob = !resumeData && resume?.content
      ? `\nRaw resume text (excerpt):\n${resume.content.slice(0, 2500)}`
      : "";

    const aiPrompt = `You are surfacing study topics that would be most relevant for this candidate's career growth and interview prep.

CANDIDATE:
Title: ${workTitle || "unknown"}
Years of experience: ${yearsExperience}
Summary: ${summary}
Skills: ${skills.join(", ") || "none provided"}
Tools: ${tools.join(", ") || "none provided"}
Recent experience: ${expLine || "none provided"}${resumeBlob}

ALREADY INCLUDED (do NOT repeat):
- Data Structures
- Algorithms
- System Design

Suggest 5-7 ADDITIONAL topics that:
- are directly tied to skills, tools, or roles in this candidate's resume
- represent real career-deepening areas (not generic), e.g. "Distributed Caching", "PostgreSQL Query Tuning", "React Server Components", "AWS IAM", "Concurrency in Go"
- avoid the broad/already-covered three above

Return a JSON object with this exact shape:
{
  "topics": [
    { "id": "kebab-case-id", "label": "Short, scannable Title Case label (≤24 chars when possible)" }
  ]
}

Rules:
- 5-7 topics only.
- Labels must be specific, not generic (avoid "Programming", "Coding", "Software Engineering").
- Do not include any of the already-included three.
- Return ONLY the JSON, no markdown.`;

    let raw: string;
    try {
      // Cheap and fast — perfect for chip suggestions.
      const out = await generateJsonWithFallback(aiPrompt, "gemini-2.5-flash-lite");
      raw = out.text;
    } catch (err) {
      console.error("[study-plan/topics] AI call failed:", err);
      if (isTransientAIError(err)) {
        return NextResponse.json({ topics: FIXED_STUDY_TAGS, source: "fixed-fallback" });
      }
      throw err;
    }

    const parsed = parseJsonObject<{ topics: StudyTopicPreset[] }>(raw);
    if (!parsed) {
      console.error("[study-plan/topics] AI response did not parse:", raw.slice(0, 200));
    }
    const aiTopics = (parsed?.topics || []).filter(
      (t) => t && typeof t.id === "string" && typeof t.label === "string"
    );
    console.log(`[study-plan/topics] AI returned ${aiTopics.length} topics`);

    // Always start with the fixed tags, then de-duplicate by id.
    const seen = new Set(FIXED_STUDY_TAGS.map((t) => t.id));
    const merged: StudyTopicPreset[] = [...FIXED_STUDY_TAGS];
    for (const t of aiTopics) {
      const id = t.id.trim();
      const label = t.label.trim();
      if (!id || !label) continue;
      if (seen.has(id)) continue;
      merged.push({ id, label });
      seen.add(id);
      if (merged.length >= 10) break;
    }

    return NextResponse.json({ topics: merged, source: "ai", aiCount: aiTopics.length });
  } catch (error) {
    console.error("[study-plan/topics] error:", error);
    // Fail soft — page still works without dynamic suggestions.
    return NextResponse.json({ topics: FIXED_STUDY_TAGS, source: "error-fallback" });
  }
}
