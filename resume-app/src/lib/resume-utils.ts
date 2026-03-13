export function extractSkills(content: string): string[] {
  const skillKeywords = [
    "react", "typescript", "javascript", "python", "node.js", "next.js",
    "vue", "angular", "sql", "postgresql", "mongodb", "redis", "docker",
    "kubernetes", "aws", "gcp", "azure", "git", "tailwind", "graphql",
    "java", "golang", "rust", "django", "fastapi", "flask", "tensorflow",
    "pytorch", "machine learning", "ai", "llm", "ci/cd", "agile", "scrum",
  ];
  const lower = content.toLowerCase();
  return skillKeywords.filter((s) => lower.includes(s)).map((s) =>
    s.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
  );
}
