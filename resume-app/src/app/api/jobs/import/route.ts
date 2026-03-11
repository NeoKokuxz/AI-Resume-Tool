import { NextRequest, NextResponse } from "next/server";

interface ImportedJob {
  title: string;
  company: string;
  description: string;
  location: string;
  url?: string;
}

const pendingJobs: ImportedJob[] = [];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const job: ImportedJob = {
    title: body.title || "",
    company: body.company || "",
    description: body.description || "",
    location: body.location || "",
    url: body.url,
  };
  pendingJobs.push(job);
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}

export async function GET() {
  const jobs = pendingJobs.splice(0);
  return NextResponse.json({ jobs }, { headers: corsHeaders });
}
