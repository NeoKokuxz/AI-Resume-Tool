import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

interface StoredResume {
  content: string;
  fileName: string;
}

const CACHE_FILE = path.join(process.cwd(), ".resume-cache.json");

function readFromDisk(): StoredResume | null {
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch {
    return null;
  }
}

function writeToDisk(resume: StoredResume) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(resume), "utf8");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  const resume = readFromDisk();
  if (!resume) {
    return NextResponse.json({ error: "No resume" }, { status: 404, headers: corsHeaders });
  }
  return NextResponse.json(resume, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const { content, fileName } = await req.json();
  writeToDisk({ content, fileName });
  return NextResponse.json({ ok: true }, { headers: corsHeaders });
}
