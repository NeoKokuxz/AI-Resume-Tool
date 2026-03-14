import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/ai-queue/client";
import { getUserIdFromToken, extractBearerToken } from "@/lib/ai-queue/auth";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function PATCH(req: NextRequest) {
  const token = extractBearerToken(req.headers.get("Authorization"));
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const userId = await getUserIdFromToken(token);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  const { applicationId, status } = await req.json();
  if (!applicationId || !status) {
    return NextResponse.json({ error: "applicationId and status required" }, { status: 400, headers: corsHeaders });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: "Failed to update application" }, { status: 500, headers: corsHeaders });
  }

  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}
