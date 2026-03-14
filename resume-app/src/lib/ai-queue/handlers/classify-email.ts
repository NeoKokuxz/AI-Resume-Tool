import { geminiFlash } from "@/lib/gemini";
import { EmailClassification } from "@/types";
import type { HandlerContext } from "./types";

function classifyEmailLocally(subject: string, body: string): EmailClassification {
  const text = `${subject} ${body}`.toLowerCase();

  if (
    text.includes("schedule interview") ||
    text.includes("interview invitation") ||
    text.includes("would like to interview") ||
    text.includes("invite you to interview") ||
    text.includes("technical interview") ||
    text.includes("video call") ||
    text.includes("phone screen")
  ) return "interview";

  if (
    text.includes("assessment") ||
    text.includes("coding challenge") ||
    text.includes("take-home") ||
    text.includes("technical test") ||
    text.includes("hackerrank") ||
    text.includes("codility") ||
    text.includes("online test")
  ) return "assessment";

  if (
    text.includes("unfortunately") ||
    text.includes("not moving forward") ||
    text.includes("not selected") ||
    text.includes("decided to move forward with other") ||
    text.includes("we will not be") ||
    text.includes("position has been filled") ||
    text.includes("not a fit")
  ) return "rejection";

  if (
    text.includes("reached out") ||
    text.includes("came across your profile") ||
    text.includes("exciting opportunity") ||
    text.includes("recruiter") ||
    text.includes("talent acquisition") ||
    text.includes("open to opportunities")
  ) return "recruiter_outreach";

  return "unknown";
}

export async function handleClassifyEmail({ payload, supabase }: HandlerContext) {
  const { subject, body, emailId } = payload as {
    subject: string;
    body: string;
    emailId: string;
  };

  const localClassification = classifyEmailLocally(subject, body);
  let classification: EmailClassification = localClassification;

  if (localClassification === "unknown") {
    const prompt = `Classify this job application email into one of these categories:
- "interview": Interview invitation or scheduling
- "assessment": Online assessment or coding challenge
- "rejection": Application rejection
- "recruiter_outreach": Recruiter reaching out about opportunities
- "unknown": None of the above

Email Subject: ${subject}
Email Body: ${body}

Respond with ONLY the category name, nothing else.`;

    const result = await geminiFlash.generateContent(prompt);
    const responseText = result.response.text().trim().toLowerCase();
    const valid: EmailClassification[] = ["interview", "assessment", "rejection", "recruiter_outreach", "unknown"];
    if (valid.includes(responseText as EmailClassification)) {
      classification = responseText as EmailClassification;
    }
  }

  await supabase.from("emails").update({ classification }).eq("id", emailId);
}
