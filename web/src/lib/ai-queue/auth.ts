import { createServiceRoleClient } from "./client";

/**
 * Verifies a Supabase JWT (from Authorization: Bearer header) and returns the user ID.
 * Used by extension-facing API routes that don't have cookie-based sessions.
 */
export async function getUserIdFromToken(token: string): Promise<string | null> {
  const supabase = createServiceRoleClient();
  const { data: { user } } = await supabase.auth.getUser(token);
  return user?.id ?? null;
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}
