import type { ExtractedField, FieldAnswer, ResumeData } from "@/types/autofill";

// ── Autocomplete attribute → classification ────────────────────────────────
const AUTOCOMPLETE_MAP: Record<string, string> = {
  "given-name": "first_name",
  "family-name": "last_name",
  "name": "full_name",
  "email": "email",
  "tel": "phone",
  "tel-national": "phone",
  "url": "website",
  "organization": "company",
  "organization-title": "work_title",
  "street-address": "address_line1",
  "address-line1": "address_line1",
  "address-line2": "address_line2",
  "address-level2": "city",
  "address-level1": "state",
  "postal-code": "zip",
  "country-name": "country",
  "country": "country",
};

// ── Name attribute → classification ────────────────────────────────────────
const NAME_MAP: [RegExp, string][] = [
  [/^first[_-]?name$/i, "first_name"],
  [/^last[_-]?name$/i, "last_name"],
  [/^full[_-]?name$/i, "full_name"],
  [/^e?mail$/i, "email"],
  [/^phone$/i, "phone"],
  [/^linkedin$/i, "linkedin"],
  [/^website|portfolio|github$/i, "website"],
  [/^city$/i, "city"],
  [/^state$/i, "state"],
  [/^zip|postal/i, "zip"],
  [/^country$/i, "country"],
];

// ── Label text → classification (checked last, broadest patterns) ──────────
const LABEL_MAP: [RegExp, string][] = [
  [/first\s*name/i, "first_name"],
  [/last\s*name/i, "last_name"],
  [/full\s*name|your\s*name/i, "full_name"],
  [/e[\s-]*mail/i, "email"],
  [/phone|mobile|cell/i, "phone"],
  [/linkedin/i, "linkedin"],
  [/website|portfolio|personal\s*url/i, "website"],
  [/github/i, "github"],
  [/^location$|city.*state|where.*located/i, "location"],
  [/address\s*line\s*1|street\s*address(?!\s*2)/i, "address_line1"],
  [/address\s*line\s*2/i, "address_line2"],
  [/\bcity\b/i, "city"],
  [/\bstate\b|province/i, "state"],
  [/zip|postal/i, "zip"],
  [/country/i, "country"],
  [/current\s*(job\s*)?title|work\s*title|job\s*title/i, "work_title"],
  [/years?\s*(of\s*)?experience/i, "years_experience"],
  [/salary|compensation|pay/i, "salary_expectation"],
  [/start\s*date|earliest\s*start|available.*start/i, "start_date"],
  [/cover\s*letter/i, "cover_letter"],
  [/today.{0,10}date|date.{0,10}application/i, "date"],
  [/how\s*did\s*you\s*hear/i, "referral_source"],
  [/authorized.*work|work.*authori[sz]/i, "work_authorization"],
  [/sponsor|visa/i, "sponsorship"],
  [/gender|pronoun/i, "gender"],
  [/race|ethnicity/i, "ethnicity"],
  [/veteran/i, "veteran_status"],
  [/disability|disabilit/i, "disability_status"],
  [/language/i, "languages"],
  [/education|degree|school|university/i, "education"],
  [/certifi/i, "certifications"],
  [/summary|about\s*(you|yourself)|tell\s*us/i, "summary"],
];

/**
 * Classify a field using deterministic rules.
 * Checks: autocomplete attr → name attr → label regex.
 */
export function classifyField(field: ExtractedField): string | null {
  // 1. Autocomplete attribute (highest signal)
  if (field.autocomplete) {
    const cls = AUTOCOMPLETE_MAP[field.autocomplete.toLowerCase().trim()];
    if (cls) return cls;
  }

  // 2. Name attribute
  for (const [pattern, cls] of NAME_MAP) {
    if (pattern.test(field.name)) return cls;
  }

  // 3. Label text (combine label + placeholder for broader matching)
  const text = `${field.label} ${field.placeholder}`.trim();
  if (!text) return null;

  for (const [pattern, cls] of LABEL_MAP) {
    if (pattern.test(text)) return cls;
  }

  return null;
}

/**
 * Resolve a classification to a concrete value from resume_data.
 */
export function resolveValue(
  classification: string,
  data: ResumeData
): string | null {
  const now = new Date();
  const todayStr = `${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")}/${String(now.getFullYear()).slice(-2)}`;

  const nameParts = (data.fullName || "").trim().split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const map: Record<string, string | undefined> = {
    first_name: firstName,
    last_name: lastName,
    full_name: data.fullName,
    email: data.email,
    phone: data.phone,
    linkedin: data.linkedin,
    github: data.github,
    website: data.website || data.github,
    city: data.city,
    state: data.state,
    country: data.country,
    location: data.location || [data.city, data.state].filter(Boolean).join(", "),
    work_title: data.workTitle,
    years_experience: data.yearsExperience > 0 ? data.yearsExperience.toString() : undefined,
    date: todayStr,
    summary: data.summary,
    work_authorization: data.workAuthorization,
    languages: data.languages.length > 0 ? data.languages.join(", ") : undefined,
    certifications: data.certifications.length > 0 ? data.certifications.join(", ") : undefined,
    skills: data.skills.length > 0 ? data.skills.join(", ") : undefined,
  };

  return map[classification] || null;
}

/**
 * For select/radio fields with options, try to match the resolved value
 * to the best available option (case-insensitive, partial match).
 */
export function matchOption(
  options: string[],
  value: string
): string | null {
  if (options.length === 0) return null;
  const lower = value.toLowerCase().trim();

  // Exact match
  const exact = options.find((o) => o.toLowerCase().trim() === lower);
  if (exact) return exact;

  // Option contains the value or vice versa
  const partial = options.find(
    (o) =>
      o.toLowerCase().includes(lower) || lower.includes(o.toLowerCase().trim())
  );
  if (partial) return partial;

  // Numeric range match (e.g. value "3" matches "2-4 years")
  const num = parseInt(value, 10);
  if (!isNaN(num)) {
    for (const opt of options) {
      const rangeMatch = opt.match(/(\d+)\s*[-–]\s*(\d+)/);
      if (rangeMatch) {
        const lo = parseInt(rangeMatch[1], 10);
        const hi = parseInt(rangeMatch[2], 10);
        if (num >= lo && num <= hi) return opt;
      }
      const plusMatch = opt.match(/(\d+)\s*\+/);
      if (plusMatch && num >= parseInt(plusMatch[1], 10)) return opt;
    }
  }

  return null;
}

/**
 * Run rule-based classification + resolution on a single field.
 * Returns a FieldAnswer if we can answer it, null otherwise.
 */
export function classifyAndResolve(
  field: ExtractedField,
  data: ResumeData
): FieldAnswer | null {
  const classification = classifyField(field);
  if (!classification) return null;

  const value = resolveValue(classification, data);
  if (!value) return null;

  // For select/radio fields, match against available options
  if (field.options.length > 0) {
    const matched = matchOption(field.options, value);
    if (matched) {
      return {
        id: field.id,
        value: matched,
        confidence: 0.90,
        source: "rule",
        classification,
      };
    }
    // Can't match options deterministically — let AI handle it
    return null;
  }

  return {
    id: field.id,
    value,
    confidence: 0.95,
    source: "rule",
    classification,
  };
}
