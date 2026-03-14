import { geminiJson } from "@/lib/gemini";
import type { HandlerContext } from "./types";

export async function handleExtractResume({ payload, userId, supabase }: HandlerContext) {
  const { resumeText, fileName } = payload as { resumeText: string; fileName: string };

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
- linkedin: extract any linkedin.com URL or username
- github: extract any github.com URL or username
- Return ONLY the JSON, no markdown, no other text`;

  const result = await geminiJson().generateContent(prompt);
  const text = result.response.text();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Could not parse AI response");

  const extracted = JSON.parse(jsonMatch[0]);

  if (extracted.linkedin && !extracted.linkedin.startsWith("http")) {
    const slug = extracted.linkedin.replace(/.*linkedin\.com\/in\//i, "").replace(/^\//, "");
    extracted.linkedin = `https://linkedin.com/in/${slug}`;
  }
  if (extracted.github && !extracted.github.startsWith("http")) {
    const slug = extracted.github.replace(/.*github\.com\//i, "").replace(/^\//, "");
    extracted.github = `https://github.com/${slug}`;
  }

  // Upsert base resume
  const { data: existing } = await supabase
    .from("resumes")
    .select("id")
    .eq("user_id", userId)
    .eq("type", "base")
    .maybeSingle();

  const { data: resumeData } = await supabase
    .from("resumes")
    .upsert({
      ...(existing?.id ? { id: existing.id } : {}),
      user_id: userId,
      type: "base",
      file_name: fileName,
      content: resumeText,
      skills: extracted.skills || [],
      uploaded_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  // Save extracted profile fields — onboarded stays false until user confirms
  await supabase.from("user_profiles").upsert({
    id: userId,
    full_name: extracted.fullName || null,
    work_title: extracted.workTitle || null,
    years_experience: extracted.yearsExperience || null,
    location: extracted.location || null,
    phone: extracted.phone || null,
    linkedin: extracted.linkedin || null,
    github: extracted.github || null,
    skills: extracted.skills || [],
    ...(resumeData?.id ? { base_resume_id: resumeData.id } : {}),
  });
}
