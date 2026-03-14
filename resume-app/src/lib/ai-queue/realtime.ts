"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

interface UseAIOperationOptions {
  operationId: string | null;
  onSuccess: () => void;
  onError: (error: string) => void;
  timeoutMs?: number;
}

export function useAIOperation({
  operationId,
  onSuccess,
  onError,
  timeoutMs = 60_000,
}: UseAIOperationOptions) {
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    if (!operationId) return;

    const supabase = createClient();
    let resolved = false;

    function resolve(status: "completed" | "failed", error?: string) {
      if (resolved) return;
      resolved = true;
      if (status === "completed") onSuccessRef.current();
      else onErrorRef.current(error || "Operation failed");
    }

    async function checkStatus() {
      try {
        const res = await fetch(`/api/ai-queue/status?id=${operationId}`);
        const data = await res.json();
        if (data.status === "completed") resolve("completed");
        else if (data.status === "failed") resolve("failed", data.error);
      } catch {
        // ignore — Realtime or timeout will handle it
      }
    }

    // Subscribe first, then immediately poll current status.
    // This closes the race window where the operation finishes
    // before the Realtime subscription is active.
    const channel = supabase
      .channel(`ai-op-${operationId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "ai_queue",
          filter: `id=eq.${operationId}`,
        },
        (payload) => {
          const status = payload.new.status as string;
          if (status === "completed") resolve("completed");
          else if (status === "failed") resolve("failed", payload.new.error_message as string);
        }
      )
      .subscribe(() => {
        // Once subscribed, poll immediately to catch anything that completed
        // while we were connecting
        checkStatus();
      });

    const timeout = setTimeout(() => {
      if (!resolved) resolve("failed", "Operation timed out");
    }, timeoutMs);

    return () => {
      resolved = true; // prevent callbacks after unmount
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [operationId, timeoutMs]);
}
