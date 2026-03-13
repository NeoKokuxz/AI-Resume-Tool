import { NextRequest, NextResponse } from "next/server";
import { geminiJson } from "@/lib/gemini";
// pdf-parse has a known issue with Next.js — import from the lib path directly
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    let resumeText = "";
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (isPDF) {
      const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
      const pdf = await loadingTask.promise;
      const pages: string[] = [];
      const annotationUrls: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);

        // Extract visible text
        const content = await page.getTextContent();
        pages.push(content.items.map((item: { str?: string }) => item.str ?? "").join(" "));

        // Extract hyperlink annotations (embedded clickable links)
        const annotations = await page.getAnnotations();
        for (const ann of annotations) {
          if (ann.url) annotationUrls.push(ann.url);
          if (ann.unsafeUrl) annotationUrls.push(ann.unsafeUrl);
        }
      }

      // Append extracted URLs as plain text so the AI can see them
      const urlBlock = annotationUrls.length > 0
        ? "\n\nEmbedded links:\n" + annotationUrls.join("\n")
        : "";
      resumeText = pages.join("\n") + urlBlock;
    } else {
      resumeText = buffer.toString("utf-8");
    }

    if (!resumeText.trim()) {
      return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 });
    }

    const prompt = `Extract structured information from this resume. Be accurate and concise.

Resume:
${resumeText.slice(0, 6000)}

Return a JSON object with these exact fields:
{
  "fullName": "candidate's full name",
  "workTitle": "current or most recent job title",
  "yearsExperience": 3,
  "location": "city and country/state",
  "phone": "phone number or empty string",
  "linkedin": "full LinkedIn URL or empty string",
  "github": "full GitHub URL or empty string",
  "skills": ["skill1", "skill2"]
}

Rules:
- yearsExperience: estimate as integer from work history dates, or 0 if unclear
- skills: up to 15 most relevant technical and professional skills
- linkedin: extract any linkedin.com URL or username (e.g. "linkedin.com/in/johndoe" or just "johndoe" from context)
- github: extract any github.com URL or username (e.g. "github.com/johndoe" or just "johndoe" from context)
- Return ONLY the JSON, no markdown, no other text`;

    const result = await geminiJson().generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });

    const extracted = JSON.parse(jsonMatch[0]);

    // Normalize linkedin/github to full URLs
    if (extracted.linkedin && !extracted.linkedin.startsWith("http")) {
      const slug = extracted.linkedin.replace(/.*linkedin\.com\/in\//i, "").replace(/^\//, "");
      extracted.linkedin = `https://linkedin.com/in/${slug}`;
    }
    if (extracted.github && !extracted.github.startsWith("http")) {
      const slug = extracted.github.replace(/.*github\.com\//i, "").replace(/^\//, "");
      extracted.github = `https://github.com/${slug}`;
    }

    return NextResponse.json({ extracted, resumeText });
  } catch (error) {
    console.error("Error extracting resume:", error);
    return NextResponse.json({ error: "Failed to extract resume data" }, { status: 500 });
  }
}
