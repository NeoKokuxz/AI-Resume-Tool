import { ATSResult } from "@/types";

const TECH_KEYWORDS = [
  "react", "typescript", "javascript", "python", "node.js", "next.js",
  "vue", "angular", "graphql", "rest api", "sql", "nosql", "mongodb",
  "postgresql", "mysql", "redis", "docker", "kubernetes", "aws", "gcp",
  "azure", "ci/cd", "git", "agile", "scrum", "java", "golang", "rust",
  "microservices", "machine learning", "ai", "llm", "data science",
  "tensorflow", "pytorch", "fastapi", "django", "flask", "spring",
  "tailwind", "css", "html", "figma", "ux", "ui", "product management",
  "leadership", "communication", "teamwork", "testing", "jest", "cypress",
  "webpack", "vite", "linux", "bash", "terraform", "ansible", "nginx",
  "express", "nestjs", "prisma", "sequelize", "typeorm", "graphql",
  "apollo", "trpc", "supabase", "firebase", "stripe", "twilio",
  "datadog", "sentry", "github", "gitlab", "jira", "confluence",
  "figma", "sketch", "storybook", "eslint", "prettier", "jest",
];

const SOFT_SKILLS = [
  "communication", "leadership", "teamwork", "problem solving",
  "analytical", "critical thinking", "attention to detail", "proactive",
  "self-motivated", "collaborative", "mentoring", "cross-functional",
];

function normalizeText(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s.]/g, " ").replace(/\s+/g, " ").trim();
}

function extractKeywordsFromText(text: string): string[] {
  const normalized = normalizeText(text);
  const found = new Set<string>();

  // Check multi-word tech keywords first
  for (const kw of TECH_KEYWORDS) {
    if (normalized.includes(kw)) {
      found.add(kw);
    }
  }

  for (const skill of SOFT_SKILLS) {
    if (normalized.includes(skill)) {
      found.add(skill);
    }
  }

  // Extract capitalized tech terms (e.g., React, AWS, TypeScript)
  const capitalPattern = /\b([A-Z][a-zA-Z0-9]*(?:\.[a-zA-Z0-9]+)?)\b/g;
  const matches = text.matchAll(capitalPattern);
  for (const match of matches) {
    const word = match[1].toLowerCase();
    if (word.length > 2 && word.length < 20) {
      found.add(word);
    }
  }

  return Array.from(found);
}

function extractRequiredExperienceYears(text: string): number {
  const patterns = [
    /(\d+)\+?\s*(?:to\s*\d+\s*)?years?\s+of\s+(?:professional\s+)?experience/gi,
    /(\d+)\+?\s*years?\s+experience/gi,
    /experience\s+of\s+(\d+)\+?\s*years?/gi,
    /minimum\s+(?:of\s+)?(\d+)\+?\s*years?/gi,
    /at\s+least\s+(\d+)\s+years?/gi,
  ];

  let maxYears = 0;
  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const years = parseInt(match[1], 10);
      if (!isNaN(years) && years > maxYears) {
        maxYears = years;
      }
    }
  }
  return maxYears;
}

function extractResumeExperienceYears(resumeText: string): number {
  const yearPattern = /\b(20\d{2})\b/g;
  const matches = [...resumeText.matchAll(yearPattern)];
  if (matches.length < 2) return 3; // default assumption

  const years = matches.map((m) => parseInt(m[1]));
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  return Math.min(maxYear - minYear, 20);
}

export function calculateATSScore(
  jobDescription: string,
  resumeText: string
): ATSResult {
  const jobKeywords = extractKeywordsFromText(jobDescription);
  const resumeKeywords = extractKeywordsFromText(resumeText);

  // Keyword matching (50% weight)
  const matchedKeywords = jobKeywords.filter((kw) => resumeKeywords.includes(kw));
  const missingKeywords = jobKeywords.filter((kw) => !resumeKeywords.includes(kw));
  const keywordScore =
    jobKeywords.length > 0
      ? (matchedKeywords.length / jobKeywords.length) * 100
      : 50;

  // Experience matching (30% weight)
  const requiredYears = extractRequiredExperienceYears(jobDescription);
  const resumeYears = extractResumeExperienceYears(resumeText);
  let experienceScore = 80; // default if no specific requirement
  if (requiredYears > 0) {
    if (resumeYears >= requiredYears) {
      experienceScore = 100;
    } else {
      experienceScore = Math.max((resumeYears / requiredYears) * 100, 20);
    }
  }

  // Title similarity (20% weight)
  const jobTitleLine = jobDescription.split("\n")[0]?.toLowerCase() || "";
  const resumeLower = resumeText.toLowerCase();
  const titleWords = jobTitleLine.split(/\s+/).filter((w) => w.length > 3);
  const titleMatchCount = titleWords.filter((w) => resumeLower.includes(w)).length;
  const titleScore =
    titleWords.length > 0 ? (titleMatchCount / titleWords.length) * 100 : 50;

  // Weighted score
  const score = Math.round(
    keywordScore * 0.5 + experienceScore * 0.3 + titleScore * 0.2
  );

  return {
    score: Math.min(Math.max(score, 0), 100),
    keywordScore: Math.round(keywordScore),
    experienceScore: Math.round(experienceScore),
    titleScore: Math.round(titleScore),
    matchedKeywords: matchedKeywords.slice(0, 15),
    missingKeywords: missingKeywords.slice(0, 10),
  };
}
