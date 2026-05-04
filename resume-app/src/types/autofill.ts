// Types shared between the /api/autofill backend and the Chrome extension.
// The extension uses the same shapes in plain JS (no TS import).

export interface ExtractedField {
  /** Unique CSS selector to re-target this element in Phase 2 */
  id: string;
  tagName: "input" | "select" | "textarea" | "radio-group" | "checkbox";
  inputType: string; // text, email, tel, url, number, file, radio, checkbox, etc.
  name: string;
  label: string;
  placeholder: string;
  ariaLabel: string;
  required: boolean;
  /** For <select> and radio groups — the available option strings */
  options: string[];
  currentValue: string;
  /** HTML autocomplete attribute (e.g. "given-name", "email") */
  autocomplete: string;
  /** Hash of label+name+placeholder for memory cache matching */
  fieldSignature: string;
}

export interface FieldAnswer {
  /** Matches ExtractedField.id */
  id: string;
  value: string;
  /** 0–1 confidence score */
  confidence: number;
  source: "rule" | "memory" | "ai";
  classification: string;
}

/** Structured data extracted from a user's resume, stored in the resume_data table. */
export interface ResumeData {
  id: string;
  userId: string;
  // Basic info
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  website: string;
  location: string;
  city: string;
  state: string;
  country: string;
  // Professional
  workTitle: string;
  yearsExperience: number;
  summary: string;
  // Structured arrays
  skills: string[];
  tools: string[];
  languages: string[];
  certifications: string[];
  education: { degree: string; school: string; year: string; field: string }[];
  experience: {
    title: string;
    company: string;
    start: string;
    end: string;
    description: string;
  }[];
  // Extra
  workAuthorization: string;
}

export interface AutofillRequest {
  fields: ExtractedField[];
  jobContext?: {
    title: string;
    company: string;
    description: string;
  };
  // profile/resumeData fetched server-side from auth token — not sent by extension
}

export interface AutofillResponse {
  answers: FieldAnswer[];
}
