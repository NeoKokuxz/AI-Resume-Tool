import { GoogleGenerativeAI } from "@google/generative-ai";
import { STUDY_MODELS } from "@/lib/study-utils";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Generate JSON via Gemini with model fallback. Tries the preferred model
 * first (one retry on transient 5xx/429), then falls through the rest of the
 * configured study models. Returns both the raw text and the model id that
 * actually produced it so callers can persist provenance.
 *
 * @throws The last underlying error if all models exhaust their retries.
 */
export async function generateJsonWithFallback(
  prompt: string,
  preferred?: string
): Promise<{ text: string; model: string }> {
  const allIds = STUDY_MODELS.map((m) => m.id);
  const ordered =
    preferred && allIds.includes(preferred)
      ? [preferred, ...allIds.filter((id) => id !== preferred)]
      : allIds;

  let lastErr: unknown;
  for (const modelName of ordered) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { responseMimeType: "application/json" },
        });
        const result = await model.generateContent(prompt);
        return { text: result.response.text(), model: modelName };
      } catch (err) {
        lastErr = err;
        const status = (err as { status?: number })?.status;
        const transient =
          status === 503 || status === 429 || (status !== undefined && status >= 500);
        if (!transient) throw err;
        if (attempt === 0) await new Promise((r) => setTimeout(r, 600));
      }
    }
  }
  throw lastErr;
}

/**
 * Strict JSON parse that tolerates AI responses wrapped in stray text or
 * code fences. Returns null if no JSON object can be located.
 */
export function parseJsonObject<T>(raw: string): T | null {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match?.[0] || raw) as T;
  } catch {
    return null;
  }
}

/**
 * True when the underlying error from Gemini is a transient overload (503)
 * or rate-limit (429) — useful for returning a friendly message to clients.
 */
export function isTransientAIError(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 503 || status === 429;
}
