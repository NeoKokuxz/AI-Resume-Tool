import { NextRequest, NextResponse } from "next/server";
import { geminiJson } from "@/lib/gemini";
import { parsePDFText } from "@/lib/pdf-utils";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    let resumeText = "";
    if (isPDF) {
      resumeText = await parsePDFText(bytes);
    } else {
      resumeText = Buffer.from(bytes).toString("utf-8");
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
