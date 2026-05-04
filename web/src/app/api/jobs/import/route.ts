import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/ai-queue/client";
import { getUserIdFromToken, extractBearerToken } from "@/lib/ai-queue/auth";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Called by the Chrome extension — saves job + creates application, returns IDs
export async function POST(req: NextRequest) {
  const token = extractBearerToken(req.headers.get("Authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const body = await req.json();
  const supabase = createServiceRoleClient();

  const atsResult = body.atsResult ?? null;

  // Save job
  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .insert({
      user_id: userId,
      title: body.title || "Software Engineer",
      company: body.company || "Unknown Company",
      description: body.description || "",
      location: body.location || "",
      url: body.url || "",
      ats_result: atsResult,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: "Failed to save job" }, { status: 500, headers: corsHeaders });
  }

  // Create application record linked to job snapshot
  const { data: application, error: appError } = await supabase
    .from("applications")
    .insert({
      user_id: userId,
      job_snapshot: {
        id: job.id,
        title: body.title || "Software Engineer",
        company: body.company || "Unknown Company",
        description: body.description || "",
        location: body.location || "",
        url: body.url || "",
        salary: body.salary || "",
        jobType: body.jobType || "",
        workplace: body.workplace || "",
        addedAt: new Date().toISOString(),
        atsResult,
      },
      status: "saved",
      ats_score: atsResult?.score ?? null,
      cover_letter: "",
      notes: "",
    })
    .select("id")
    .single();

  if (appError || !application) {
    return NextResponse.json({ error: "Failed to create application" }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json(
    { jobId: job.id, applicationId: application.id },
    { status: 201, headers: corsHeaders }
  );
}

// Kept for backward compat with web app polling (now a no-op)
export async function GET() {
  return NextResponse.json({ jobs: [] }, { headers: corsHeaders });
}
