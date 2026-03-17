import { geminiFlash } from "@/lib/gemini";

// Sections that stay unchanged — not sent to AI
export const PRESERVE_RE = /^(SKILLS?|TECHNICAL SKILLS?|CORE SKILLS?|KEY SKILLS?|TECHNICAL COMPETENCIES|CORE COMPETENCIES|TOOLS?(?: AND TECHNOLOGIES?)?|TECHNOLOGIES?|EDUCATION|ACADEMIC(?: BACKGROUND)?|DEGREES?|CERTIFICATIONS?|LANGUAGES?|AWARDS?)$/i;

const SECTION_RE = /^[A-Z][A-Z0-9\s\/\-\+\|&,]{2,}$/;
const SKIP_RE = /^(SUMMARY|PROFESSIONAL SUMMARY|OBJECTIVE|PROFILE|PROFESSIONAL PROFILE|LINKS?)$/i;

// ─── Section parser ───────────────────────────────────────────────────────────

export interface ResumeSection {
  header: string;
  content: string;
}

export function parseResumeSections(text: string): {
  contactHeader: string;
  sections: ResumeSection[];
} {
  const cleanText = text.replace(/\n+Links:\n[\s\S]*$/, "").trim();
  const lines = cleanText.split("\n");

  let firstSectionIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim().replace(/^\*\*|\*\*$/g, "").trim();
    if (SECTION_RE.test(trimmed) && trimmed.length < 40 && !SKIP_RE.test(trimmed)) {
      firstSectionIdx = i;
      break;
    }
  }

  if (firstSectionIdx === -1) {
    return { contactHeader: cleanText, sections: [] };
  }

  const contactHeader = lines.slice(0, firstSectionIdx).join("\n").trim();
  const sections: ResumeSection[] = [];
  let currentHeader = "";
  let currentLines: string[] = [];

  for (let i = firstSectionIdx; i < lines.length; i++) {
    const trimmed = lines[i].trim().replace(/^\*\*|\*\*$/g, "").trim();
    if (SECTION_RE.test(trimmed) && trimmed.length < 40 && !SKIP_RE.test(trimmed)) {
      if (currentHeader) sections.push({ header: currentHeader, content: currentLines.join("\n").trim() });
      currentHeader = trimmed;
      currentLines = [];
    } else {
      currentLines.push(lines[i]);
    }
  }
  if (currentHeader) sections.push({ header: currentHeader, content: currentLines.join("\n").trim() });

  return { contactHeader, sections };
}

// ─── Core tailor function ─────────────────────────────────────────────────────

export interface TailorResult {
  /** Fully assembled tailored resume text (ready to store / display) */
  tailoredResume: string;
  coverLetter: string;
  /** Only the sections that were AI-rewritten (skills/education excluded) */
  tailoredSections: ResumeSection[];
}

export async function tailorResume(params: {
  baseResume: string;
  jobDescription: string;
  jobTitle: string;
  company: string;
}): Promise<TailorResult> {
  const { baseResume, jobDescription, jobTitle, company } = params;

  const { contactHeader, sections } = parseResumeSections(baseResume);
  const jobContext = `Job Title: ${jobTitle || "Unknown"}\nCompany: ${company || "Unknown"}\n\nJob Description:\n${jobDescription.slice(0, 2000)}`;

  const sectionsToTailor = sections.filter(s => !PRESERVE_RE.test(s.header));

  const [tailoredSections, coverResult] = await Promise.all([
    Promise.all(
      sectionsToTailor.map(async ({ header, content }) => {
        const prompt = `You are an expert resume writer. Tailor the following "${header}" resume section to better match the job.

Rules:
- Keep the same structure and number of entries — do not add or remove jobs, projects, or items.
- Emphasize relevance to the job in wording. Do not fabricate experience.
- Be concise and impactful.
- Do NOT include the section header in your response.
- Return ONLY the tailored section content, no commentary.

${jobContext}

"${header}" section to tailor:
${content}`;
        const result = await geminiFlash.generateContent(prompt);
        return { header, content: result.response.text().trim() };
      })
    ),
    geminiFlash.generateContent(
      `Write a concise, professional cover letter for this job application.
3 paragraphs max. No placeholders — write naturally even without personal details.

${jobContext}

Resume Summary:
${baseResume.slice(0, 1500)}

Return ONLY the cover letter text.`
    ),
  ]);

  // Reassemble: preserved sections keep original content
  const allSections = sections.map(s =>
    PRESERVE_RE.test(s.header)
      ? s
      : tailoredSections.find(t => t.header === s.header) ?? s
  );

  const linksBlockMatch = baseResume.match(/\n+Links:\n[\s\S]*$/);
  const tailoredResume = [
    contactHeader,
    "",
    ...allSections.flatMap(({ header, content }) => [header, content, ""]),
  ].join("\n").trimEnd() + (linksBlockMatch ? linksBlockMatch[0] : "");

  return {
    tailoredResume,
    coverLetter: coverResult.response.text().trim(),
    tailoredSections,
  };
}
