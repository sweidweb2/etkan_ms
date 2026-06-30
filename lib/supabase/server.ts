import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

/**
 * Create a Supabase client for Server Components.
 * This client can only READ cookies (not modify them).
 * Use this in Server Components like layouts, pages, etc.
 */
export async function createSupabaseServerComponentClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // No-op: Server Components cannot modify cookies
          // This prevents errors when Supabase tries to refresh tokens
        },
      },
    }
  );
}

/**
 * Create a Supabase client for Server Actions and Route Handlers.
 * This client can READ and MODIFY cookies.
 * Use this in Server Actions (functions with 'use server') and Route Handlers (route.ts files).
 */
export async function createSupabaseServerActionClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
