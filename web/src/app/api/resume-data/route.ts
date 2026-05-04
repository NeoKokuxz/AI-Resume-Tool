import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/ai-queue/client";
import { getUserIdFromToken, extractBearerToken } from "@/lib/ai-queue/auth";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  const token = extractBearerToken(request.headers.get("Authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("resume_data")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "No resume data found. Please upload a resume first." },
      { status: 404, headers: corsHeaders }
    );
  }

  return NextResponse.json(
    {
      id: data.id,
      userId: data.user_id,
      fullName: data.full_name || "",
      email: data.email || "",
      phone: data.phone || "",
      linkedin: data.linkedin || "",
      github: data.github || "",
      website: data.website || "",
      location: data.location || "",
      city: data.city || "",
      state: data.state || "",
      country: data.country || "",
      workTitle: data.work_title || "",
      yearsExperience: data.years_experience || 0,
      summary: data.summary || "",
      skills: data.skills || [],
      tools: data.tools || [],
      languages: data.languages || [],
      certifications: data.certifications || [],
      education: data.education || [],
      experience: data.experience || [],
      workAuthorization: data.work_authorization || "",
    },
    { headers: corsHeaders }
  );
}
