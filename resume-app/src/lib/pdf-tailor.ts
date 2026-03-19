import { PDFDocument, StandardFonts, PDFFont, rgb } from "pdf-lib";
import { geminiFlash } from "@/lib/gemini";
import { extractResume } from "@/lib/resume-extractor";
import { extractJDKeywords } from "@/lib/jd-analyzer";
import { rewriteAllBullets, type BulletRewriteResult } from "@/lib/bullet-rewriter";
import { sanitizePDFText } from "@/lib/pdf-utils";

export interface TailorPDFResult {
  pdfBytes: Uint8Array;
  tailoredResume: string;
  coverLetter: string;
}

export async function tailorPDF(
  basePdfBytes: ArrayBuffer,
  params: { jobDescription: string; jobTitle: string; company: string },
): Promise<TailorPDFResult> {
  const { jobDescription, jobTitle, company } = params;

  // ── 1. Extract structured resume from PDF ───────────────────────────────────
  const resume = await extractResume(basePdfBytes.slice(0));

  // ── 2. Analyse JD + generate cover letter in parallel ──────────────────────
  const jdContext = `Job Title: ${jobTitle}\nCompany: ${company}\n\nJob Description:\n${jobDescription.slice(0, 2000)}`;

  const [jdKeywords, coverResult] = await Promise.all([
    extractJDKeywords(jobDescription),
    geminiFlash.generateContent(
      `Write a concise, professional cover letter for this job application.
3 paragraphs max. No placeholders — write naturally even without personal details.

${jdContext}

Candidate skills: ${resume.skillTags.slice(0, 20).join(", ")}

Return ONLY the cover letter text.`
    ),
  ]);

  // ── 3. Collect all bullets from non-preserved sections ──────────────────────
  const allBullets: string[] = [];
  for (const section of resume.sections) {
    if (!section.preserve) {
      for (const bullet of section.bullets) {
        if (!allBullets.includes(bullet.text)) allBullets.push(bullet.text);
      }
    }
  }

  // ── 4. Rewrite all bullets in parallel (with validation + fallback) ─────────
  const rewrites: Map<string, BulletRewriteResult> = allBullets.length > 0
    ? await rewriteAllBullets(allBullets, {
        skillTags: resume.skillTags,
        jdKeywords,
        jdContext,
      })
    : new Map();

  // ── 5. Assemble tailored resume text (for DB storage) ───────────────────────
  const contactText = resume.contactLines.map(l => l.text).join("\n");
  const sectionsText = resume.sections.map(section => {
    const lines: string[] = [section.header];
    // Interleave meta lines and bullets in original top-to-bottom order
    const allLines = [
      ...section.metaLines.map(l => ({ y: l.y, pageIdx: l.pageIdx, text: l.text, isBullet: false })),
      ...section.bullets.map(b => ({ y: b.topY, pageIdx: b.pageIdx, text: b.text, isBullet: true })),
    ].sort((a, b) => a.pageIdx - b.pageIdx || b.y - a.y);

    for (const line of allLines) {
      if (line.isBullet) {
        const result = rewrites.get(line.text);
        lines.push(`● ${result?.rewritten ?? line.text}`);
      } else {
        lines.push(line.text);
      }
    }
    return lines.join("\n");
  }).join("\n\n");

  const tailoredResume = `${contactText}\n\n${sectionsText}`.trim();

  // ── 6. Render tailored PDF ──────────────────────────────────────────────────
  const pdfBytes = await renderTailoredPDF(resume, rewrites, basePdfBytes);

  return {
    pdfBytes,
    tailoredResume,
    coverLetter: coverResult.response.text().trim(),
  };
}

// ─── PDF renderer ─────────────────────────────────────────────────────────────

async function renderTailoredPDF(
  resume: Awaited<ReturnType<typeof extractResume>>,
  rewrites: Map<string, BulletRewriteResult>,
  basePdfBytes: ArrayBuffer,
): Promise<Uint8Array> {
  const srcDoc = await PDFDocument.load(basePdfBytes);
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const margin = resume.sections[0]
    ? Math.max(36, Math.min(72, resume.sections[0].headerY > 0 ? 72 : 56))
    : 56;
  const fontSize = 10;
  const lineHeight = Math.round(fontSize * 1.35);

  // Copy all pages first
  for (let pIdx = 0; pIdx < srcDoc.getPageCount(); pIdx++) {
    const [copiedPage] = await pdfDoc.copyPages(srcDoc, [pIdx]);
    pdfDoc.addPage(copiedPage);
  }

  // Pre-compute page width (all pages same size for a resume)
  const pageWidth = pdfDoc.getPage(0).getSize().width;
  const maxWidth = pageWidth - margin * 2;

  function wrapLine(text: string, fnt: PDFFont, fs: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      try {
        if (fnt.widthOfTextAtSize(test, fs) <= maxWidth) { current = test; }
        else { if (current) lines.push(current); current = word; }
      } catch { if (current) lines.push(current); current = word; }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  }

  // For each non-preserved section, white-out and redraw each bullet that was rewritten
  for (const section of resume.sections) {
    if (section.preserve) continue;

    for (let bIdx = 0; bIdx < section.bullets.length; bIdx++) {
      const bullet = section.bullets[bIdx];
      const result = rewrites.get(bullet.text);

      // Skip bullets that fell back to original — no need to touch the PDF
      if (!result || result.fallback) continue;

      // Each bullet tracks its own page — use it, not the section header's page
      const page = pdfDoc.getPage(bullet.pageIdx);

      // Next bullet on the SAME page (cross-page boundary: treat as last bullet on this page)
      const nextBullet = section.bullets[bIdx + 1]?.pageIdx === bullet.pageIdx
        ? section.bullets[bIdx + 1]
        : undefined;

      // White-out covers from just above topY down to just above the next bullet
      // (or just below bottomY when there's no next bullet on this page)
      const whiteoutTop = bullet.topY + lineHeight;
      const whiteoutBottom = nextBullet
        ? nextBullet.topY + lineHeight * 0.5
        : bullet.bottomY - lineHeight * 0.5;

      if (whiteoutTop <= whiteoutBottom) continue;

      page.drawRectangle({
        x: margin - 4,
        y: whiteoutBottom,
        width: pageWidth - margin + 4,
        height: whiteoutTop - whiteoutBottom,
        color: rgb(1, 1, 1),
      });

      // Redraw rewritten bullet
      const rewrittenText = sanitizePDFText(result.rewritten);
      let y = bullet.topY;
      for (const line of wrapLine(rewrittenText, font, fontSize)) {
        if (y < whiteoutBottom) break;
        try {
          page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0.1, 0.1, 0.1) });
        } catch { /* skip unencodable chars */ }
        y -= lineHeight;
      }
    }
  }

  return pdfDoc.save();
}
