import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createServiceRoleClient } from "@/lib/ai-queue/client";
import { geminiJson } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    // Auth: get user from cookie session (called from the web app, not the extension)
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resumeText } = await request.json();
    if (!resumeText) {
      return NextResponse.json({ error: "resumeText required" }, { status: 400 });
    }

    // ── Extract rich data via Gemini ──────────────────────────────────────
    const prompt = `Extract structured information from this resume. Be accurate and concise.

Resume:
${resumeText.slice(0, 6000)}

Return a JSON object with these exact fields:
{
  "fullName": "candidate's full name",
  "email": "email address or empty string",
  "workTitle": "current or most recent job title",
  "yearsExperience": 3,
  "location": "city and country/state",
  "city": "city name or empty string",
  "state": "state/province or empty string",
  "country": "country or empty string",
  "phone": "phone number or empty string",
  "linkedin": "full LinkedIn URL or empty string",
  "github": "full GitHub URL or empty string",
  "website": "personal website URL or empty string",
  "summary": "professional summary/objective from the resume, or empty string",
  "skills": ["skill1", "skill2"],
  "tools": ["tool1", "tool2"],
  "languages": ["English", "Spanish"],
  "certifications": ["cert1", "cert2"],
  "education": [{"degree": "BS", "school": "MIT", "year": "2020", "field": "Computer Science"}],
  "experience": [{"title": "Software Engineer", "company": "Google", "start": "2020-01", "end": "2023-06", "description": "Built distributed systems"}],
  "workAuthorization": "US Citizen, Green Card, etc. — or empty string if not mentioned"
}

Rules:
- yearsExperience: estimate as integer from work history dates, or 0 if unclear
- skills: up to 15 most relevant technical and professional skills
- tools: up to 10 tools, frameworks, platforms (e.g. Docker, AWS, VS Code, Figma)
- languages: spoken/written languages only, NOT programming languages
- education: list all degrees/education entries
- experience: list all work positions, most recent first. Keep descriptions to 1-2 sentences.
- linkedin: extract any linkedin.com URL or username
- github: extract any github.com URL or username
- Return ONLY the JSON, no markdown, no other text`;

    const result = await geminiJson().generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Normalize URLs
    if (extracted.linkedin && !extracted.linkedin.startsWith("http")) {
      const slug = extracted.linkedin.replace(/.*linkedin\.com\/in\//i, "").replace(/^\//, "");
      extracted.linkedin = `https://linkedin.com/in/${slug}`;
    }
    if (extracted.github && !extracted.github.startsWith("http")) {
      const slug = extracted.github.replace(/.*github\.com\//i, "").replace(/^\//, "");
      extracted.github = `https://github.com/${slug}`;
    }

    // ── Upsert resume_data ───────────────────────────────────────────────
    const supabase = createServiceRoleClient();
    const locationParts = (extracted.location || "").split(",").map((s: string) => s.trim());

    await supabase.from("resume_data").upsert({
      user_id: user.id,
      full_name: extracted.fullName || "",
      email: extracted.email || user.email || "",
      phone: extracted.phone || "",
      linkedin: extracted.linkedin || "",
      github: extracted.github || "",
      website: extracted.website || "",
      location: extracted.location || "",
      city: extracted.city || locationParts[0] || "",
      state: extracted.state || locationParts[1] || "",
      country: extracted.country || "",
      work_title: extracted.workTitle || "",
      years_experience: extracted.yearsExperience || 0,
      summary: extracted.summary || "",
      skills: extracted.skills || [],
      tools: extracted.tools || [],
      languages: extracted.languages || [],
      certifications: extracted.certifications || [],
      education: extracted.education || [],
      experience: extracted.experience || [],
      work_authorization: extracted.workAuthorization || "",
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error extracting resume data:", error);
    return NextResponse.json({ error: "Failed to extract resume data" }, { status: 500 });
  }
}
