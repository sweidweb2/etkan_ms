import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/supabase";

type MiddlewareSupabaseClient = {
  supabase: ReturnType<typeof createServerClient<Database>>;
  /** Always read this at return time — cookie refresh replaces the response. */
  getResponse: () => NextResponse;
};

/**
 * Create a Supabase client for use in Next.js middleware (edge runtime).
 * Refreshes the auth session and keeps request + response cookies in sync
 * so Server Components see the updated tokens on the same request.
 */
export function createSupabaseMiddlewareClient(
  request: NextRequest
): MiddlewareSupabaseClient {
  let response = nextWithPathname(request);

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });

          response = nextWithPathname(request);

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              response.headers.set(key, value);
            });
          }
        },
      },
    }
  );

  return {
    supabase,
    getResponse: () => response,
  };
}

/**
 * Copy refreshed auth cookies onto a redirect (or any new) response.
 * Required when middleware does not return the supabase response as-is.
 */
export function applyAuthCookies(
  target: NextResponse,
  source: NextResponse
): NextResponse {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie.name, cookie.value);
  });
  return target;
}

function nextWithPathname(request: NextRequest): NextResponse {
  request.headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request });
}
