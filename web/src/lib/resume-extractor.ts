import { PRESERVE_RE } from "@/lib/resume-tailor";

const SECTION_RE = /^[A-Z][A-Z0-9\s\/\-\+\|&,]{2,}$/;
const SKIP_RE = /^(SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|PROFILE|PROFESSIONAL PROFILE|LINKS?)$/i;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BulletGroup {
  /** Full bullet text (may span multiple wrapped lines in original PDF) */
  text: string;
  /** y of the first (topmost) line of this bullet */
  topY: number;
  /** y of the last (bottommost) line of this bullet */
  bottomY: number;
  pageIdx: number;
}

export interface ResumeSection {
  header: string;
  pageIdx: number;
  headerY: number;
  /** Non-bullet lines: entry titles, company names, dates — never rewritten */
  metaLines: { text: string; y: number; pageIdx: number }[];
  /** Bullet groups — sent to AI for rewriting */
  bullets: BulletGroup[];
  /** True for SKILLS, EDUCATION etc. — nothing is rewritten */
  preserve: boolean;
}

export interface StructuredResume {
  /** Lines before the first section header (name, contact info) */
  contactLines: { text: string; y: number; pageIdx: number }[];
  sections: ResumeSection[];
  /** Tech tags extracted from the SKILLS section — used for safe keyword filtering */
  skillTags: string[];
}

// ─── Extractor ───────────────────────────────────────────────────────────────

export async function extractResume(basePdfBytes: ArrayBuffer): Promise<StructuredResume> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfJsDoc = await pdfjsLib.getDocument({ data: new Uint8Array(basePdfBytes) }).promise;

  // Collect all text items across all pages
  interface RawItem { str: string; x: number; y: number; pageIdx: number; height: number }
  const allItems: RawItem[] = [];

  for (let pIdx = 0; pIdx < pdfJsDoc.numPages; pIdx++) {
    const page = await pdfJsDoc.getPage(pIdx + 1);
    const content = await page.getTextContent();
    for (const raw of content.items) {
      const item = raw as Record<string, unknown>;
      if (typeof item.str !== "string" || !(item.str as string).trim()) continue;
      const t = item.transform as number[];
      allItems.push({
        str: item.str as string,
        x: t[4], y: t[5], pageIdx: pIdx,
        height: typeof item.height === "number" ? (item.height as number) : 0,
      });
    }
  }

  // Derive margin and fontSize from item positions
  const xPositions = allItems.map(i => i.x).filter(x => x > 0);
  const margin = xPositions.length > 0
    ? Math.max(36, Math.min(72, Math.round(Math.min(...xPositions))))
    : 56;

  const heightCounts = new Map<number, number>();
  for (const item of allItems) {
    const h = Math.round(item.height);
    if (h >= 8 && h <= 13) heightCounts.set(h, (heightCounts.get(h) || 0) + 1);
  }
  let fontSize = 10, maxCount = 0;
  for (const [size, count] of heightCounts) {
    if (count > maxCount) { maxCount = count; fontSize = size; }
  }
  const lineHeight = Math.round(fontSize * 1.35);

  // Group items into lines by (pageIdx, rounded y)
  type LineKey = string;
  const lineMap = new Map<LineKey, RawItem[]>();
  for (const item of allItems) {
    const key: LineKey = `${item.pageIdx}_${Math.round(item.y / 2) * 2}`;
    if (!lineMap.has(key)) lineMap.set(key, []);
    lineMap.get(key)!.push(item);
  }

  interface Line {
    key: LineKey;
    text: string;
    x: number;       // leftmost x (determines indentation)
    y: number;       // actual y baseline
    pageIdx: number;
    itemCount: number;
  }

  const sortedLines: Line[] = [...lineMap.entries()]
    .sort(([a], [b]) => {
      const [ap, ay] = a.split("_").map(Number);
      const [bp, by] = b.split("_").map(Number);
      return ap !== bp ? ap - bp : by - ay;
    })
    .map(([key, items]) => {
      const sorted = items.sort((a, b) => a.x - b.x);
      const [pageIdxStr] = key.split("_");
      return {
        key,
        text: sorted.map(i => i.str).join(" ").trim(),
        x: sorted[0].x,
        y: sorted[0].y,
        pageIdx: parseInt(pageIdxStr),
        itemCount: items.length,
      };
    })
    .filter(l => l.text.length > 0);

  // Section header: alone on its line, all-caps, left-aligned
  function isSectionHeader(line: Line): boolean {
    return (
      SECTION_RE.test(line.text) &&
      line.text.length >= 3 && line.text.length < 40 &&
      !SKIP_RE.test(line.text) &&
      line.x <= margin + 15 &&
      line.itemCount === 1
    );
  }

  // Bullet line: indented beyond margin OR starts with a bullet character
  // (Some PDFs place the ● glyph at margin x, then the text indented — grouping by y
  //  puts them on the same line with x = margin, so we must also check the text.)
  function isBulletLine(line: Line): boolean {
    return line.x > margin + 5 || /^[●•]/.test(line.text);
  }

  // ── Build sections ──────────────────────────────────────────────────────────
  const sections: ResumeSection[] = [];
  const contactLines: { text: string; y: number; pageIdx: number }[] = [];
  let inContact = true;
  let currentSection: ResumeSection | null = null;

  // Pending indented lines — grouped into bullet groups
  let pendingBulletLines: Line[] = [];

  function flushBulletGroup() {
    if (pendingBulletLines.length === 0 || !currentSection) return;
    const text = pendingBulletLines.map(l => l.text).join(" ").replace(/^[●•\-\*]\s*/, "").trim();
    if (text) {
      currentSection.bullets.push({
        text,
        topY: pendingBulletLines[0].y,
        bottomY: pendingBulletLines[pendingBulletLines.length - 1].y,
        pageIdx: pendingBulletLines[0].pageIdx,
      });
    }
    pendingBulletLines = [];
  }

  for (let i = 0; i < sortedLines.length; i++) {
    const line = sortedLines[i];

    if (isSectionHeader(line)) {
      flushBulletGroup();
      if (inContact) inContact = false;
      if (currentSection) sections.push(currentSection);
      currentSection = {
        header: line.text,
        pageIdx: line.pageIdx,
        headerY: line.y,
        metaLines: [],
        bullets: [],
        preserve: PRESERVE_RE.test(line.text),
      };
      continue;
    }

    if (inContact) {
      contactLines.push({ text: line.text, y: line.y, pageIdx: line.pageIdx });
      continue;
    }

    if (!currentSection) continue;

    if (isBulletLine(line)) {
      // Check if this is a continuation of the previous bullet or a new one
      // A new bullet starts when: text starts with ● / • / - / * OR the y gap is large
      const isNewBullet =
        /^[●•\-\*]/.test(line.text) ||
        pendingBulletLines.length === 0 ||
        pendingBulletLines[0].pageIdx !== line.pageIdx ||
        (pendingBulletLines[pendingBulletLines.length - 1].y - line.y) > lineHeight * 1.8;

      if (isNewBullet) flushBulletGroup();
      pendingBulletLines.push(line);
    } else {
      // Meta line (company, title, date) — flush any pending bullet first
      flushBulletGroup();
      currentSection.metaLines.push({ text: line.text, y: line.y, pageIdx: line.pageIdx });
    }
  }

  flushBulletGroup();
  if (currentSection) sections.push(currentSection);

  // ── Extract skill tags from SKILLS section ──────────────────────────────────
  const skillSection = sections.find(s => /^SKILLS?/i.test(s.header));
  const skillTags = skillSection
    ? skillSection.metaLines
        .concat(skillSection.bullets.map(b => ({ text: b.text, y: 0, pageIdx: 0 })))
        .flatMap(l => l.text.split(/[,;|]/))
        .map(t => t.replace(/^[^:]+:\s*/, "").trim().toLowerCase())
        .filter(t => t.length > 1 && t.length < 30)
    : [];

  return { contactLines, sections, skillTags };
}
