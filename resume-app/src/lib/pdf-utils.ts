import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// ─── Parse ────────────────────────────────────────────────────────────────────

export async function parsePDFText(bytes: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
  const pages: string[] = [];
  const annotationUrls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));

    const annotations = await page.getAnnotations();
    for (const ann of annotations) {
      if (ann.url) annotationUrls.push(ann.url);
      if (ann.unsafeUrl) annotationUrls.push(ann.unsafeUrl);
    }
  }

  const urlBlock = annotationUrls.length > 0
    ? "\n\nLinks:\n" + annotationUrls.join("\n")
    : "";

  return pages.join("\n") + urlBlock;
}

// ─── Generate ─────────────────────────────────────────────────────────────────

function sanitize(text: string): string {
  return text
    .replace(/\t/g, "    ")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013/g, "-")
    .replace(/\u2014/g, "--")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[^\x20-\xFF]/g, "");
}

export async function generatePDFBytes(content: string): Promise<Uint8Array> {
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

  const segments: { text: string; bold: boolean }[] = [];
  for (const raw of content.split("\n")) {
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
      // skip lines that can't be encoded
    }
    y -= lineHeight;
  }

  return pdfDoc.save();
}
