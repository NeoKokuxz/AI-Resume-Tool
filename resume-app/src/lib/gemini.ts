import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiFlash = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
export const geminiFlashLite = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

export function geminiJson() {
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: { responseMimeType: "application/json" },
  });
}
