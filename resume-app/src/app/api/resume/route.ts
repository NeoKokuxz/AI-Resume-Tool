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

// Called by the Chrome extension — returns the authenticated user's base resume
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
    .from("resumes")
    .select("content, file_name, pdf_storage_path")
    .eq("user_id", userId)
    .eq("type", "base")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "No resume" }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json(
    { content: data.content, fileName: data.file_name, pdfStoragePath: data.pdf_storage_path ?? null },
    { headers: corsHeaders }
  );
}
