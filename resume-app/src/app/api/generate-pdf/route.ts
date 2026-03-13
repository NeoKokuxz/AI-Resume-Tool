import { NextRequest, NextResponse } from "next/server";
import { generatePDFBytes } from "@/lib/pdf-utils";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const { content, fileName } = await request.json();
  const pdfBytes = await generatePDFBytes(content as string);

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName || "tailored-resume"}.pdf"`,
    },
  });
}
