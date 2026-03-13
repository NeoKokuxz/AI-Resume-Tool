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

// Replace characters outside WinAnsi (Latin-1) range so pdf-lib doesn't throw
function sanitize(text: string): string {
  return text
    .replace(/\t/g, "    ")            // tabs → spaces
    .replace(/[\u2018\u2019]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D]/g, '"')   // smart double quotes
    .replace(/\u2013/g, "-")           // en dash
    .replace(/\u2014/g, "--")          // em dash
    .replace(/\u2026/g, "...")         // ellipsis
    .replace(/\u00A0/g, " ")           // non-breaking space
    .replace(/[^\x20-\xFF]/g, "");     // strip remaining control chars
}

export async function POST(request: NextRequest) {
  const { content, fileName } = await request.json();

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 56;
  const lineHeight = 14;
  const fontSize = 10;
  const maxWidth = pageWidth - margin * 2;

  function wrapLine(text: string, fnt: typeof font): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      try {
        if (fnt.widthOfTextAtSize(test, fontSize) <= maxWidth) {
          current = test;
        } else {
          if (current) lines.push(current);
          current = word;
        }
      } catch {
        if (current) lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [""];
  }

  const rawLines = (content as string).split("\n");
  const segments: { text: string; bold: boolean }[] = [];

  for (const raw of rawLines) {
    const cleaned = sanitize(raw);
    const isBold =
      /^[A-Z][A-Z\s\/\-]{2,}$/.test(cleaned.trim()) ||
      /^---/.test(cleaned.trim());
    const wrapped = wrapLine(cleaned || " ", isBold ? boldFont : font);
    for (const line of wrapped) {
      segments.push({ text: line, bold: isBold });
    }
  }

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const seg of segments) {
    if (y < margin + lineHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    try {
      page.drawText(seg.text, {
        x: margin,
        y,
        size: fontSize,
        font: seg.bold ? boldFont : font,
        color: rgb(0.1, 0.1, 0.1),
      });
    } catch {
      // skip lines that still can't be encoded
    }
    y -= lineHeight;
  }

  const pdfBytes = await pdfDoc.save();

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName || "tailored-resume"}.pdf"`,
    },
  });
}
