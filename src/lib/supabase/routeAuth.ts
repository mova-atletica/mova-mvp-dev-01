import { createClient as createSupabaseClient, type User } from "@supabase/supabase-js";
import { createClient } from "./server";

export type RouteAuthResult =
  | { user: User; error: null }
  | { user: null; error: "missing" | "invalid" };

function bearerToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/**
 * Resolve the authenticated Supabase user from cookie session (web) or Bearer JWT (iOS).
 */
export async function getAuthenticatedUser(request: Request): Promise<RouteAuthResult> {
  const token = bearerToken(request);

  if (token) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    const supabase = createSupabaseClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
      return { user: null, error: "invalid" };
    }
    return { user: data.user, error: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, error: "missing" };
  }

  return { user, error: null };
}
