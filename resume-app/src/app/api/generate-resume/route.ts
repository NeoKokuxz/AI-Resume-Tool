import { NextRequest, NextResponse } from "next/server";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const { baseResume, jobTitle, company } = await request.json();

  const tailoredResume = baseResume;

  const coverLetter = `Dear Hiring Team,

I'm excited to apply for the ${jobTitle || "open position"} role at ${company || "your company"}. With my background in software engineering and a proven track record of delivering scalable solutions, I'm confident I can make an immediate impact on your team.

Over the past several years, I've developed expertise in the technologies and methodologies that align directly with your requirements. My experience building high-performance applications and collaborating cross-functionally has prepared me well for this opportunity.

I'd welcome the chance to discuss how my skills can contribute to ${company || "your company"}'s goals.

Best regards,
[Your Name]`;

  return NextResponse.json({ tailoredResume, coverLetter }, { headers: corsHeaders });
}
