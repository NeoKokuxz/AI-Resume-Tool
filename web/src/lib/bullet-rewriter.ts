import { geminiFlash } from "@/lib/gemini";

export interface BulletRewriteResult {
  rewritten: string;
  usedKeywords: string[];
  fallback: boolean; // true = original was kept (rewrite failed validation)
}

// ─── Keyword filtering ────────────────────────────────────────────────────────

/**
 * Only pass JD keywords to AI that semantically overlap with the bullet's skill tags.
 * Prevents injecting tech the candidate never used.
 */
function getSafeKeywords(jdKeywords: string[], skillTags: string[]): string[] {
  return jdKeywords.filter(kw => {
    const kwLower = kw.toLowerCase();
    return skillTags.some(tag => tag.includes(kwLower) || kwLower.includes(tag));
  });
}

// ─── Validation ───────────────────────────────────────────────────────────────

/** Extract capitalised / tech-looking words from text */
function extractTechTerms(text: string): string[] {
  return (text.match(/\b[A-Z][a-zA-Z0-9.#+\-]{1,25}\b/g) ?? [])
    .map(t => t.toLowerCase());
}

const FLUFF_WORDS = /\b(various|multiple|numerous|many|several|leveraged|utilized|robust|seamless|cutting-edge|state-of-the-art)\b/i;

function validate(
  rewritten: string,
  original: string,
  skillTags: string[],
  safeKeywords: string[],
): boolean {
  if (!rewritten.trim()) return false;

  // Length guard
  const wordCount = rewritten.trim().split(/\s+/).length;
  if (wordCount > 45) return false;

  // Fluff guard
  if (FLUFF_WORDS.test(rewritten)) return false;

  // Anti-hallucination: reject if new tech terms appear that aren't in original or skill tags
  const allowedTerms = new Set([
    ...extractTechTerms(original),
    ...skillTags,
    ...safeKeywords.map(k => k.toLowerCase()),
  ]);
  const newTerms = extractTechTerms(rewritten).filter(t => !allowedTerms.has(t));

  // Allow terms that are substrings of allowed terms (e.g. "postgres" ⊂ "postgresql")
  const forbidden = newTerms.filter(t =>
    ![...allowedTerms].some(a => a.includes(t) || t.includes(a))
  );

  return forbidden.length === 0;
}

// ─── Rewriter ─────────────────────────────────────────────────────────────────

export async function rewriteBullet(
  bullet: string,
  opts: { skillTags: string[]; jdKeywords: string[]; jdContext: string },
): Promise<BulletRewriteResult> {
  const safeKeywords = getSafeKeywords(opts.jdKeywords, opts.skillTags);

  const systemPrompt = `You are a resume bullet rewriting assistant.

STRICT RULES:
- Do NOT add new technologies, tools, companies, or experiences not in the original
- Do NOT fabricate metrics, numbers, or impact statements
- Only rephrase the provided bullet — improve clarity and keyword alignment
- You may incorporate the allowed keywords ONLY if they naturally fit
- Keep it concise (under 35 words)
- Output ONE bullet only — no leading bullet symbols, no commentary`;

  const userPrompt = `Original bullet:
"${bullet}"

Allowed keywords (only use if genuinely relevant):
${safeKeywords.length > 0 ? safeKeywords.join(", ") : "none — focus on clarity only"}

Job context:
${opts.jdContext.slice(0, 400)}

Rewrite the bullet to better align with the job. Do not add new skills or exaggerate.`;

  try {
    const result = await geminiFlash.generateContent({
      systemInstruction: systemPrompt,
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    });
    const rewritten = result.response.text().trim().replace(/^[●•\-\*]\s*/, "");

    if (rewritten && validate(rewritten, bullet, opts.skillTags, safeKeywords)) {
      const usedKeywords = safeKeywords.filter(k =>
        rewritten.toLowerCase().includes(k.toLowerCase())
      );
      return { rewritten, usedKeywords, fallback: false };
    }
  } catch {
    // fall through to fallback
  }

  return { rewritten: bullet, usedKeywords: [], fallback: true };
}

/**
 * Rewrite all bullets across all non-preserved sections in parallel.
 * Returns a map from original bullet text → rewrite result.
 */
export async function rewriteAllBullets(
  bullets: string[],
  opts: { skillTags: string[]; jdKeywords: string[]; jdContext: string },
): Promise<Map<string, BulletRewriteResult>> {
  const results = await Promise.all(
    bullets.map(async bullet => {
      const result = await rewriteBullet(bullet, opts);
      return [bullet, result] as const;
    })
  );
  return new Map(results);
}
