import { AIOperationType } from "@/types";
import type { Handler } from "./types";
import { handleExtractResume } from "./extract-resume";
import { handleAnalyzeJob } from "./analyze-job";
import { handleGenerateResume } from "./generate-resume";
import { handleClassifyEmail } from "./classify-email";

export const handlers: Record<AIOperationType, Handler> = {
  extract_resume: handleExtractResume,
  analyze_job: handleAnalyzeJob,
  generate_resume: handleGenerateResume,
  classify_email: handleClassifyEmail,
};
