import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const operationId = request.nextUrl.searchParams.get("id");
  if (!operationId) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("ai_queue")
    .select("status, error_message")
    .eq("id", operationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (data) {
    return NextResponse.json({ status: data.status, error: data.error_message });
  }

  // Row gone — check if it failed
  const { data: failed } = await supabase
    .from("ai_failed_operations")
    .select("error_message")
    .eq("original_id", operationId)
    .maybeSingle();

  if (failed) {
    return NextResponse.json({ status: "failed", error: failed.error_message });
  }

  // Row gone and not in failed — it completed and was cleaned up
  return NextResponse.json({ status: "completed" });
}
