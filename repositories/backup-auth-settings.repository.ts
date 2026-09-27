import { getSupabaseProjectRef } from "@/lib/supabase/project-ref";

type JsonRecord = Record<string, unknown>;

export async function fetchGoTruePublicSettings(): Promise<{
  data: JsonRecord | null;
  error: string | null;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !apiKey) {
    return {
      data: null,
      error: "Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase API key.",
    };
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      data: null,
      error: `Unable to read public auth settings (${response.status}).`,
    };
  }

  const data = (await response.json()) as unknown;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return { data: null, error: "Public auth settings were not an object." };
  }

  return { data: data as JsonRecord, error: null };
}

export async function fetchManagementAuthConfig(): Promise<{
  data: JsonRecord | null;
  error: string | null;
  missingToken: boolean;
  projectRef: string | null;
}> {
  const projectRef = getSupabaseProjectRef();
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim() ?? "";

  if (!accessToken) {
    return {
      data: null,
      error: null,
      missingToken: true,
      projectRef,
    };
  }

  if (!projectRef) {
    return {
      data: null,
      error: "Unable to read the Supabase project ref from NEXT_PUBLIC_SUPABASE_URL.",
      missingToken: false,
      projectRef: null,
    };
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    return {
      data: null,
      error: `Unable to read dashboard auth settings (${response.status}). Use a personal access token with auth_config_read.`,
      missingToken: false,
      projectRef,
    };
  }

  const data = (await response.json()) as unknown;
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      data: null,
      error: "Dashboard auth settings were not an object.",
      missingToken: false,
      projectRef,
    };
  }

  return {
    data: data as JsonRecord,
    error: null,
    missingToken: false,
    projectRef,
  };
}
