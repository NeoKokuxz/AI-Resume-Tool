import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/ai-queue/client";
import { getUserIdFromToken, extractBearerToken } from "@/lib/ai-queue/auth";
import { tailorPDF } from "@/lib/pdf-tailor";

const RESUME_BUCKET = "resume-pdfs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const token = extractBearerToken(request.headers.get("Authorization"));
    const userId = token ? await getUserIdFromToken(token) : null;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
    }

    const { jobDescription, jobTitle, company, applicationId } = await request.json();

    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = createServiceRoleClient();

    // Look up the user's base resume PDF directly
    const { data: baseResume } = await supabase
      .from("resumes")
      .select("pdf_storage_path")
      .eq("user_id", userId)
      .eq("type", "base")
      .order("uploaded_at", { ascending: false })
      .limit(1)
      .single();

    if (!baseResume?.pdf_storage_path) {
      return NextResponse.json(
        { error: "No base resume PDF found. Please upload your resume as a PDF first." },
        { status: 404, headers: corsHeaders }
      );
    }

    const { data: baseBlob } = await supabase.storage
      .from(RESUME_BUCKET)
      .download(baseResume.pdf_storage_path);

    if (!baseBlob) {
      return NextResponse.json(
        { error: "Could not download base PDF" },
        { status: 500, headers: corsHeaders }
      );
    }

    // Single call: extract text from PDF → AI tailor → generate new PDF
    const { pdfBytes, tailoredResume, coverLetter } = await tailorPDF(
      await baseBlob.arrayBuffer(),
      { jobDescription, jobTitle, company }
    );

    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");

    // Upload tailored PDF and persist records
    let pdfStoragePath: string | undefined;
    if (applicationId) {
      const path = `${userId}/tailored-ext-${Date.now()}.pdf`;
      const { error } = await supabase.storage
        .from(RESUME_BUCKET)
        .upload(path, pdfBytes, { contentType: "application/pdf" });
      if (!error) pdfStoragePath = path;

      const { data: resumeRow } = await supabase
        .from("resumes")
        .insert({
          user_id: userId,
          type: "tailored",
          file_name: `Tailored — ${jobTitle || "Resume"} at ${company || "Company"}`,
          content: tailoredResume,
          skills: [],
          pdf_storage_path: pdfStoragePath ?? null,
        })
        .select("id")
        .single();

      await supabase
        .from("applications")
        .update({
          tailored_resume_id: resumeRow?.id ?? null,
          cover_letter: coverLetter,
        })
        .eq("id", applicationId);
    }

    return NextResponse.json({ tailoredResume, coverLetter, pdfBase64 }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error generating resume:", error);
    return NextResponse.json(
      { error: "Failed to generate resume" },
      { status: 500, headers: corsHeaders }
    );
  }
}
