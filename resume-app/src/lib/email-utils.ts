import { EmailClassification } from "@/types";

export async function classifyEmail(
  emailSubject: string,
  emailBody: string
): Promise<EmailClassification> {
  try {
    const res = await fetch("/api/classify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: emailSubject, body: emailBody }),
    });
    const data = await res.json();
    return data.classification || "unknown";
  } catch (err) {
    console.error("classifyEmail failed:", err);
    return "unknown";
  }
}
