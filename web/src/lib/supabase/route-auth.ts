import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

/**
 * Cookie-based auth client for Next route handlers. Read-only — route
 * handlers don't write cookies back, so setAll is a no-op.
 */
export function createRouteAuthClient(request: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  );
}

/**
 * Returns the authenticated user from the request's session cookie, or null
 * if the request is unauthenticated.
 */
export async function getRouteUser(request: NextRequest): Promise<User | null> {
  const supabase = createRouteAuthClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
