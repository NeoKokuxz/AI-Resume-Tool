import { TECH_KEYWORDS } from "@/lib/ats-scorer";

export function extractSkills(content: string): string[] {
  const lower = content.toLowerCase();
  return TECH_KEYWORDS.filter((s) => lower.includes(s)).map((s) =>
    s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}
