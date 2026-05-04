import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AIOperationType } from "@/types";

const VALID_TYPES: AIOperationType[] = [
  "extract_resume",
  "analyze_job",
  "generate_resume",
  "classify_email",
];

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { operationType, payload } = await request.json();

  if (!VALID_TYPES.includes(operationType)) {
    return NextResponse.json({ error: "Invalid operation type" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ai_queue")
    .insert({ user_id: user.id, operation_type: operationType, payload })
    .select("id")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Failed to queue operation" }, { status: 500 });
  }

  // Fire-and-forget — worker runs independently
  const baseUrl = new URL(request.url).origin;
  fetch(`${baseUrl}/api/ai-worker`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-worker-secret": process.env.WORKER_SECRET!,
    },
    body: JSON.stringify({ operationId: data.id }),
  }).catch(console.error);

  return NextResponse.json({ operationId: data.id }, { status: 201 });
}
