import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/ai-queue/client";
import { handlers } from "@/lib/ai-queue/handlers";
import { AIOperationType } from "@/types";

const MAX_RETRIES = 3;

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-worker-secret");
  if (secret !== process.env.WORKER_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { operationId } = await request.json();
  if (!operationId) return NextResponse.json({ error: "Missing operationId" }, { status: 400 });

  const supabase = createServiceRoleClient();

  // Atomically claim the job — only succeeds if status is still 'pending'
  const { data: claimed } = await supabase
    .from("ai_queue")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", operationId)
    .eq("status", "pending")
    .select()
    .single();

  if (!claimed) {
    // Already being processed or doesn't exist
    return NextResponse.json({ ok: true });
  }

  const { user_id: userId, operation_type: operationType, payload, retry_count: retryCount } = claimed;
  const handler = handlers[operationType as AIOperationType];

  if (!handler) {
    await supabase
      .from("ai_queue")
      .update({ status: "failed", error_message: `Unknown operation type: ${operationType}`, updated_at: new Date().toISOString() })
      .eq("id", operationId);
    return NextResponse.json({ ok: true });
  }

  for (let attempt = retryCount; attempt < MAX_RETRIES; attempt++) {
    try {
      await handler({ payload, userId, supabase });

      await supabase
        .from("ai_queue")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", operationId);

      return NextResponse.json({ ok: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isLastAttempt = attempt + 1 >= MAX_RETRIES;

      if (!isLastAttempt) {
        await supabase
          .from("ai_queue")
          .update({ retry_count: attempt + 1, updated_at: new Date().toISOString() })
          .eq("id", operationId);
        // Continue loop for next retry
      } else {
        // Mark failed in queue (triggers Realtime to client)
        await supabase
          .from("ai_queue")
          .update({
            status: "failed",
            error_message: errorMessage,
            updated_at: new Date().toISOString(),
          })
          .eq("id", operationId);

        // Archive to failed_operations for record keeping
        await supabase.from("ai_failed_operations").insert({
          original_id: operationId,
          user_id: userId,
          operation_type: operationType,
          payload,
          error_message: errorMessage,
          retry_count: attempt + 1,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
