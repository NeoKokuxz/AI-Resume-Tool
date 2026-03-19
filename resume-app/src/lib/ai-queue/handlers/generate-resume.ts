import { tailorPDF } from "@/lib/pdf-tailor";
import type { HandlerContext } from "./types";

const RESUME_BUCKET = "resume-pdfs";

export async function handleGenerateResume({ payload, userId, supabase }: HandlerContext) {
  const { jobDescription, jobTitle, company, applicationId } = payload as {
    jobDescription: string;
    jobTitle: string;
    company: string;
    applicationId: string;
  };

  // Fetch the user's base resume PDF
  const { data: baseResume } = await supabase
    .from("resumes")
    .select("pdf_storage_path")
    .eq("user_id", userId)
    .eq("type", "base")
    .order("uploaded_at", { ascending: false })
    .limit(1)
    .single();

  if (!baseResume?.pdf_storage_path) return;

  const { data: baseBlob } = await supabase.storage
    .from(RESUME_BUCKET)
    .download(baseResume.pdf_storage_path);

  if (!baseBlob) return;

  const { pdfBytes, tailoredResume, coverLetter } = await tailorPDF(
    await baseBlob.arrayBuffer(),
    { jobDescription, jobTitle, company }
  );

  const pdfPath = `${userId}/tailored-${Date.now()}.pdf`;
  const { error: uploadErr } = await supabase.storage
    .from(RESUME_BUCKET)
    .upload(pdfPath, pdfBytes, { contentType: "application/pdf" });

  const { data: resumeData } = await supabase
    .from("resumes")
    .insert({
      user_id: userId,
      type: "tailored",
      file_name: `Tailored — ${jobTitle} at ${company}`,
      content: tailoredResume,
      skills: [],
      pdf_storage_path: uploadErr ? null : pdfPath,
    })
    .select("id")
    .single();

  await supabase.from("applications").update({
    tailored_resume_id: resumeData?.id ?? null,
    cover_letter: coverLetter,
  }).eq("id", applicationId);
}
