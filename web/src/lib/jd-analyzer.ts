import { geminiFlash } from "@/lib/gemini";

/**
 * Extract tech keywords from a job description.
 * Returns a list of terms safe to use as hints for bullet rewriting.
 */
export async function extractJDKeywords(jobDescription: string): Promise<string[]> {
  const prompt = `Extract the most important technical keywords from this job description.

Return a JSON array of strings only.
Include: programming languages, frameworks, libraries, tools, cloud services, methodologies, domain terms.
Exclude: soft skills, generic words like "experience", "team", "communication", "ability".
Max 30 items. Keep terms concise (e.g. "TypeScript" not "TypeScript programming language").

Job Description:
${jobDescription.slice(0, 3000)}

Return ONLY a valid JSON array. Example: ["TypeScript", "React", "distributed systems", "REST APIs"]`;

  try {
    const result = await geminiFlash.generateContent(prompt);
    const text = result.response.text().trim();
    const match = text.match(/\[[\s\S]*?\]/);
    if (match) return JSON.parse(match[0]) as string[];
  } catch {
    // fall through
  }
  return [];
}
