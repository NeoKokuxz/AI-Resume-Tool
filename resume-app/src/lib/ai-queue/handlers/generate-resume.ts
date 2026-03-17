import { tailorResume } from "@/lib/resume-tailor";
import { generateTailoredPDF, generatePDFBytes } from "@/lib/pdf-utils";
import type { HandlerContext } from "./types";

const RESUME_BUCKET = "resume-pdfs";

export async function handleGenerateResume({ payload, userId, supabase }: HandlerContext) {
  const { baseResume, jobDescription, jobTitle, company, applicationId, basePdfStoragePath } = payload as {
    baseResume: string;
    jobDescription: string;
    jobTitle: string;
    company: string;
    applicationId: string;
    basePdfStoragePath?: string;
  };

  // Tailor resume + download base PDF in parallel
  const [{ tailoredResume, coverLetter, tailoredSections }, baseBlob] = await Promise.all([
    tailorResume({ baseResume, jobDescription, jobTitle, company }),
    basePdfStoragePath
      ? supabase.storage.from(RESUME_BUCKET).download(basePdfStoragePath).then(r => r.data)
      : Promise.resolve(null),
  ]);

  const { data: resumeData } = await supabase
    .from("resumes")
    .insert({
      user_id: userId,
      type: "tailored",
      file_name: `Tailored — ${jobTitle} at ${company}`,
      content: tailoredResume,
      skills: [],
    })
    .select("id")
    .single();

  if (resumeData?.id) {
    try {
      let pdfBytes: Uint8Array;
      if (baseBlob) {
        pdfBytes = await generateTailoredPDF(tailoredSections, await baseBlob.arrayBuffer());
      } else {
        pdfBytes = await generatePDFBytes(tailoredResume, { fitToOnePage: true });
      }

      const pdfPath = `${userId}/tailored-${resumeData.id}.pdf`;
      const { error } = await supabase.storage
        .from(RESUME_BUCKET)
        .upload(pdfPath, pdfBytes, { contentType: "application/pdf" });

      if (!error) {
        await supabase.from("resumes").update({ pdf_storage_path: pdfPath }).eq("id", resumeData.id);
      }
    } catch {
      // PDF generation failure is non-fatal
    }
  }

  await supabase.from("applications").update({
    tailored_resume_id: resumeData?.id ?? null,
    cover_letter: coverLetter,
  }).eq("id", applicationId);
}
