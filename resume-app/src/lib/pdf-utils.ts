import { PDFDocument, PDFPage, StandardFonts, PDFFont, PDFString, rgb } from "pdf-lib";

// ─── Parse ────────────────────────────────────────────────────────────────────

export async function parsePDFText(bytes: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
  const pages: string[] = [];
  const annotationUrls: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group text items by y-coordinate (within 2pt tolerance) to reconstruct lines
    const lineMap = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str) continue;
      const transform = (item as Record<string, unknown>).transform as number[];
      const x = transform?.[4] ?? 0;
      const y = Math.round((transform?.[5] ?? 0) / 2) * 2; // bucket to 2pt grid
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x, str: item.str });
    }
    // Sort lines top-to-bottom (highest y first), items left-to-right within each line
    const sortedLines = [...lineMap.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, items]) =>
        items.sort((a, b) => a.x - b.x).map(it => it.str).join(" ").trim()
      )
      .filter(l => l.length > 0);
    pages.push(sortedLines.join("\n"));

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

// ─── Metrics ──────────────────────────────────────────────────────────────────

export interface PDFMetrics {
  fontSize: number;
  margin: number;
  firstSectionY?: number; // baseline y of the topmost body section header
}

export async function extractPDFMetrics(bytes: ArrayBuffer): Promise<PDFMetrics> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(bytes) }).promise;
  const page = await pdf.getPage(1);
  const content = await page.getTextContent();

  const heights: number[] = [];
  const xPositions: number[] = [];

  for (const item of content.items) {
    const i = item as Record<string, unknown>;
    if (typeof i.height === "number" && i.height > 0) heights.push(i.height);
    if (Array.isArray(i.transform) && typeof i.transform[4] === "number") {
      xPositions.push(i.transform[4] as number);
    }
  }

  const counts = new Map<number, number>();
  for (const h of heights) {
    const r = Math.round(h);
    if (r >= 8 && r <= 13) counts.set(r, (counts.get(r) || 0) + 1);
  }
  let fontSize = 10;
  let maxCount = 0;
  for (const [size, count] of counts) {
    if (count > maxCount) { maxCount = count; fontSize = size; }
  }

  const margin = xPositions.length > 0
    ? Math.max(36, Math.min(72, Math.round(Math.min(...xPositions))))
    : 56;

  // Find the topmost (first when reading top-to-bottom) body section header
  let firstSectionY: number | undefined;
  const SECTION_RE_METRIC = /^[A-Z][A-Z0-9\s\/\-\+\|&,]{2,}$/;
  const SKIP_RE_METRIC = /^(SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|PROFILE|PROFESSIONAL PROFILE|LINKS?)$/i;

  for (const item of content.items) {
    const i = item as Record<string, unknown>;
    if (typeof i.str !== "string" || !Array.isArray(i.transform)) continue;
    const text = (i.str as string).trim();
    const x = i.transform[4] as number;
    // Must be all-caps section header text, near left margin
    if (
      !SECTION_RE_METRIC.test(text) ||
      text.length < 3 ||
      text.length >= 40 ||
      SKIP_RE_METRIC.test(text) ||
      x > margin + 15
    ) continue;
    const y = i.transform[5] as number;
    if (firstSectionY === undefined || y > firstSectionY) firstSectionY = y;
  }

  return { fontSize, margin, firstSectionY };
}

// ─── Summary stripping ────────────────────────────────────────────────────────

const SUMMARY_HEADERS = /^(SUMMARY|PROFESSIONAL SUMMARY|SUMMARY OF QUALIFICATIONS|OBJECTIVE|PROFILE|PROFESSIONAL PROFILE)$/i;
const SECTION_HEADER = /^[A-Z][A-Z\s\/\-]{2,}$/;

export function stripSummarySection(text: string): string {
  const lines = text.split("\n");
  const result: string[] = [];
  let inSummary = false;

  for (const line of lines) {
    // Strip markdown bold markers before testing so **SUMMARY** is caught
    const trimmed = line.trim().replace(/^\*\*|\*\*$/g, "").trim();
    if (SUMMARY_HEADERS.test(trimmed)) {
      inSummary = true;
      continue;
    }
    if (inSummary) {
      // Next all-caps section header ends the summary block
      if (SECTION_HEADER.test(trimmed) && trimmed.length < 40) {
        inSummary = false;
        result.push(line);
      }
    } else {
      result.push(line);
    }
  }

  return result.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ─── Link detection ───────────────────────────────────────────────────────────

interface LinkSpan {
  index: number;
  length: number;
  url: string;
}

/** Extract URLs from the "Links:" block appended by parsePDFText, keyed by display word. */
function extractDisplayLinks(content: string): Map<string, string> {
  const map = new Map<string, string>();
  const match = content.match(/\n+Links:\n([\s\S]*)$/);
  if (!match) return map;

  const urls = match[1].trim().split("\n").map((u) => u.trim()).filter(Boolean);
  for (const url of urls) {
    const lower = url.toLowerCase();
    if (lower.includes("linkedin.com")) {
      map.set("LinkedIn", url);
      map.set("Linkedin", url);
    }
    if (lower.includes("github.com")) {
      map.set("Github", url);
      map.set("GitHub", url);
    }
  }
  return map;
}

function detectLinks(text: string, displayLinks?: Map<string, string>): LinkSpan[] {
  const results: LinkSpan[] = [];
  const seen = new Set<number>();

  const patterns: { regex: RegExp; toUrl: (m: string) => string }[] = [
    { regex: /https?:\/\/[^\s|,)>]+/g,               toUrl: (m) => m },
    { regex: /(?<![\w/])linkedin\.com\/in\/[\w-]+/g,  toUrl: (m) => `https://${m}` },
    { regex: /(?<![\w/])github\.com\/[\w-]+/g,        toUrl: (m) => `https://${m}` },
    { regex: /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi,          toUrl: (m) => `mailto:${m}` },
  ];

  for (const { regex, toUrl } of patterns) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      if (!seen.has(match.index)) {
        seen.add(match.index);
        results.push({ index: match.index, length: match[0].length, url: toUrl(match[0]) });
      }
    }
  }

  // Match display words like "LinkedIn", "Github" to their known URLs
  if (displayLinks) {
    for (const [word, url] of displayLinks) {
      let idx = text.indexOf(word);
      while (idx !== -1) {
        if (!seen.has(idx)) {
          seen.add(idx);
          results.push({ index: idx, length: word.length, url });
        }
        idx = text.indexOf(word, idx + 1);
      }
    }
  }

  return results;
}

function addLinkAnnotations(
  doc: PDFDocument,
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  fnt: PDFFont,
  fs: number,
  displayLinks?: Map<string, string>,
) {
  for (const { index, length, url } of detectLinks(text, displayLinks)) {
    try {
      const before = text.slice(0, index);
      const linkText = text.slice(index, index + length);
      const xStart = x + fnt.widthOfTextAtSize(before, fs);
      const xEnd = xStart + fnt.widthOfTextAtSize(linkText, fs);

      const ref = doc.context.register(
        doc.context.obj({
          Type: "Annot",
          Subtype: "Link",
          Rect: [xStart, y - 2, xEnd, y + fs],
          Border: [0, 0, 0],
          A: doc.context.obj({
            Type: "Action",
            S: "URI",
            URI: PDFString.of(url),
          }),
        })
      );
      page.node.addAnnot(ref);
    } catch {
      // skip if annotation fails
    }
  }
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

export async function generatePDFBytes(
  content: string,
  options?: { fontSize?: number; margin?: number; fitToOnePage?: boolean }
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 612;
  const pageHeight = 792;
  const margin = options?.margin ?? 56;
  const maxWidth = pageWidth - margin * 2;

  // Extract display word → URL mappings from the Links: block, then strip it from content
  const displayLinks = extractDisplayLinks(content);
  const renderContent = content.replace(/\n+Links:\n[\s\S]*$/, "").trim();

  function wrapLine(text: string, fnt: typeof font, fs: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      try {
        if (fnt.widthOfTextAtSize(test, fs) <= maxWidth) {
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

  function buildSegments(fs: number) {
    const segs: { text: string; bold: boolean }[] = [];
    for (const raw of renderContent.split("\n")) {
      const cleaned = sanitize(raw);
      const trimmed = cleaned.trim();
      const isMarkdownBold = /^\*\*(.+)\*\*$/.test(trimmed);
      const strippedLine = isMarkdownBold
        ? cleaned.replace(/^\s*\*\*/, "").replace(/\*\*\s*$/, "")
        : cleaned.replace(/\*\*/g, "");
      const isBold =
        isMarkdownBold ||
        /^[A-Z][A-Z\s\/\-]{2,}$/.test(trimmed.replace(/\*\*/g, "")) ||
        /^---/.test(trimmed);
      const wrapped = wrapLine(strippedLine || " ", isBold ? boldFont : font, fs);
      for (const line of wrapped) segs.push({ text: line, bold: isBold });
    }
    return segs;
  }

  let fontSize = options?.fontSize ?? 10;
  let lineHeight = fontSize + 4;

  if (options?.fitToOnePage) {
    const usable = pageHeight - 2 * margin;
    while (fontSize >= 7) {
      lineHeight = Math.round(fontSize * 1.35);
      const segs = buildSegments(fontSize);
      if (segs.length * lineHeight <= usable) break;
      fontSize -= 0.5;
    }
  }

  const segments = buildSegments(fontSize);
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  for (const seg of segments) {
    if (y < margin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
    const fnt = seg.bold ? boldFont : font;
    try {
      page.drawText(seg.text, {
        x: margin,
        y,
        size: fontSize,
        font: fnt,
        color: rgb(0.1, 0.1, 0.1),
      });
      addLinkAnnotations(pdfDoc, page, seg.text, margin, y, fnt, fontSize, displayLinks);
    } catch {
      // skip unencodable lines
    }
    y -= lineHeight;
  }

  return pdfDoc.save();
}

// ─── Tailor on top of original PDF ───────────────────────────────────────────

/**
 * Copy every page of the original PDF, then — for each section that was
 * AI-tailored — white-out only its content area and redraw with the new text.
 *
 * Sections NOT in tailoredSections (skills, education, contact header) are
 * never touched: they stay pixel-perfect from the original.
 * All existing link annotations (LinkedIn/GitHub etc.) are preserved because
 * we copy pages with copyPages(), which copies annotations too.
 */
export async function generateTailoredPDF(
  tailoredSections: { header: string; content: string }[],
  basePdfBytes: ArrayBuffer,
): Promise<Uint8Array> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(basePdfBytes.slice(0)) }).promise;

  const srcDoc = await PDFDocument.load(basePdfBytes);
  const pdfDoc = await PDFDocument.create();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const metrics = await extractPDFMetrics(basePdfBytes);
  const fontSize = metrics.fontSize;
  const margin = metrics.margin;
  const lineHeight = Math.round(fontSize * 1.35);

  // Header → tailored content lookup (case-insensitive)
  const tailoredMap = new Map(
    tailoredSections.map(s => [s.header.trim().toUpperCase(), s.content])
  );

  const SECTION_RE_PDF = /^[A-Z][A-Z0-9\s\/\-\+\|&,]{2,}$/;
  const SKIP_RE_PDF = /^(SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|PROFILE|PROFESSIONAL PROFILE|LINKS?)$/i;

  for (let pIdx = 0; pIdx < srcDoc.getPageCount(); pIdx++) {
    const [copiedPage] = await pdfDoc.copyPages(srcDoc, [pIdx]);
    pdfDoc.addPage(copiedPage);
    const page = pdfDoc.getPage(pIdx);
    const { width: pageWidth, height: pageHeight } = page.getSize();
    const maxWidth = pageWidth - margin * 2;

    // Find all section headers on this page with their exact y-positions
    const pdfJsPage = await pdfJsDoc.getPage(pIdx + 1);
    const textContent = await pdfJsPage.getTextContent();

    const pageHeaders: { header: string; y: number }[] = [];
    for (const item of textContent.items) {
      const i = item as Record<string, unknown>;
      if (typeof i.str !== "string" || !Array.isArray(i.transform)) continue;
      const text = (i.str as string).trim();
      const x = i.transform[4] as number;
      if (
        SECTION_RE_PDF.test(text) &&
        text.length >= 3 &&
        text.length < 40 &&
        !SKIP_RE_PDF.test(text) &&
        x <= margin + 15 // left-aligned = section header, not indented content
      ) {
        pageHeaders.push({ header: text, y: i.transform[5] as number });
      }
    }

    // Sort top-to-bottom (highest y = top of page first in PDF coords)
    pageHeaders.sort((a, b) => b.y - a.y);

    for (let i = 0; i < pageHeaders.length; i++) {
      const { header, y: headerY } = pageHeaders[i];
      const tailoredContent = tailoredMap.get(header.toUpperCase());
      if (tailoredContent === undefined) continue; // preserve this section as-is

      // Content area: just below section header → just above next section header (or bottom margin)
      const contentStartY = headerY - lineHeight;
      const contentEndY = i < pageHeaders.length - 1
        ? pageHeaders[i + 1].y + lineHeight // stop just above the next section
        : margin;

      if (contentStartY <= contentEndY) continue;

      // White out the section's content area only (header text preserved from original)
      page.drawRectangle({
        x: 0,
        y: contentEndY,
        width: pageWidth,
        height: contentStartY - contentEndY,
        color: rgb(1, 1, 1),
      });

      // Draw the tailored content
      function wrapLine(text: string, fnt: PDFFont, fs: number): string[] {
        const words = text.split(" ");
        const lines: string[] = [];
        let current = "";
        for (const word of words) {
          const test = current ? `${current} ${word}` : word;
          try {
            if (fnt.widthOfTextAtSize(test, fs) <= maxWidth) {
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

      let y = contentStartY;
      for (const raw of tailoredContent.split("\n")) {
        if (y <= contentEndY) break; // don't overflow into the next preserved section
        const cleaned = sanitize(raw);
        const trimmed = cleaned.trim();
        const isMarkdownBold = /^\*\*(.+)\*\*$/.test(trimmed);
        const strippedLine = isMarkdownBold
          ? cleaned.replace(/^\s*\*\*/, "").replace(/\*\*\s*$/, "")
          : cleaned.replace(/\*\*/g, "");
        const isBold =
          isMarkdownBold ||
          /^[A-Z][A-Z\s\/\-]{2,}$/.test(trimmed.replace(/\*\*/g, "")) ||
          /^---/.test(trimmed);
        const fnt = isBold ? boldFont : font;
        for (const line of wrapLine(strippedLine || " ", fnt, fontSize)) {
          if (y <= contentEndY) break;
          try {
            page.drawText(line, { x: margin, y, size: fontSize, font: fnt, color: rgb(0.1, 0.1, 0.1) });
          } catch { /* skip unencodable */ }
          y -= lineHeight;
        }
      }
    }

    void pageHeight; // suppress unused warning
  }

  return pdfDoc.save();
}
