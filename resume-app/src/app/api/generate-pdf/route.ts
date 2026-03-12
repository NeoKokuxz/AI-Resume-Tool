import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const { content, fileName } = await request.json();

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;   // US Letter
  const pageHeight = 792;
  const margin = 56;
  const lineHeight = 14;
  const fontSize = 10;
  const maxWidth = pageWidth - margin * 2;

  // Word-wrap a single line to fit maxWidth
  function wrapLine(text: string, fnt: typeof font, size: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (fnt.widthOfTextAtSize(test, size) <= maxWidth) {
        current = test;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  }

  // Split content into drawable segments
  const rawLines = content.split("\n");
  const segments: { text: string; bold: boolean }[] = [];
  for (const raw of rawLines) {
    const isSectionHeader =
      /^[A-Z][A-Z\s\/\-]{2,}$/.test(raw.trim()) ||
      /^---/.test(raw.trim());
    const wrapped = wrapLine(raw || " ", isSectionHeader ? boldFont : font, fontSize);
    for (const line of wrapped) {
      segments.push({ text: line, bold: isSectionHeader });
    }
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const seg of segments) {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    page.drawText(seg.text, {
      x: margin,
      y,
      size: fontSize,
      font: seg.bold ? boldFont : font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(pdfBytes, {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName || "tailored-resume"}.pdf"`,
    },
  });
}
