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

// Called by the Chrome extension — returns the authenticated user's profile
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
    .from("user_profiles")
    .select("full_name, work_title, phone, linkedin, github, location, skills")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "No profile" }, { status: 404, headers: corsHeaders });
  }

  // Split full_name into first/last
  const nameParts = (data.full_name || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  // Parse location into city/state (e.g. "San Francisco, CA")
  const locationParts = (data.location || "").split(",").map((s: string) => s.trim());
  const city = locationParts[0] || "";
  const state = locationParts[1] || "";

  return NextResponse.json(
    {
      firstName,
      lastName,
      fullName: data.full_name || "",
      workTitle: data.work_title || "",
      phone: data.phone || "",
      linkedin: data.linkedin || "",
      website: data.github || "",
      city,
      state,
      location: data.location || "",
      skills: data.skills || [],
    },
    { headers: corsHeaders }
  );
}
