import "server-only";

import {
  collectCachedAuthEmails,
  getMissingAuthEmailIds,
  setCachedAuthEmailMisses,
  setCachedAuthEmails,
} from "@/lib/auth/auth-emails-cache";
import { getClaimsWithSharedJwks } from "@/lib/auth/get-claims";
import { withClaimsTiming } from "@/lib/debug/claims-timing";
import type { RoleValue } from "@/lib/constants/roles";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function signInWithPassword(
  client: Supabase,
  email: string,
  password: string
) {
  return client.auth.signInWithPassword({ email, password });
}

/**
 * Verifies email/password without touching the caller's cookie session.
 * Uses an ephemeral anon client (no persist / refresh / URL detection).
 */
export async function verifyPassword(
  email: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { ok: false, error: "Unable to verify password." };
  }

  const ephemeral = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
      },
    },
  });

  const { error } = await ephemeral.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { ok: false, error: error.message || "Invalid password." };
  }

  await ephemeral.auth.signOut({ scope: "local" });
  return { ok: true };
}

export async function signOut(client: Supabase) {
  return client.auth.signOut({ scope: "global" });
}

export async function getUser(client: Supabase) {
  return client.auth.getUser();
}

/** Local JWT verify / process-shared JWKS — prefer over getUser for RSC session bootstrap. */
export async function getClaims(client: Supabase) {
  return withClaimsTiming("rsc", () => getClaimsWithSharedJwks(client));
}

export async function signUp(
  client: Supabase,
  input: {
    email: string;
    password: string;
    fullName: string;
    emailRedirectTo: string;
    role: RoleValue;
  }
) {
  return client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: input.emailRedirectTo,
      data: {
        full_name: input.fullName,
        role: input.role,
      },
    },
  });
}

export async function deleteAuthUser(
  client: Supabase,
  authUserId: string
) {
  return client.auth.admin.deleteUser(authUserId);
}

export async function updateAuthUserRole(
  client: Supabase,
  authUserId: string,
  role: string
) {
  return client.auth.admin.updateUserById(authUserId, {
    app_metadata: { role },
  });
}

export async function updateAuthUserByAdmin(
  client: Supabase,
  authUserId: string,
  input: {
    email?: string;
    fullName?: string;
  }
) {
  return client.auth.admin.updateUserById(authUserId, {
    ...(input.email ? { email: input.email } : {}),
    ...(input.fullName ? { user_metadata: { full_name: input.fullName } } : {}),
  });
}

/** Sets another user's Auth password via service role. */
export async function updateAuthUserPasswordByAdmin(
  client: Supabase,
  authUserId: string,
  password: string
) {
  return client.auth.admin.updateUserById(authUserId, { password });
}

/** Creates an Auth user via service role — does not start a session. */
export async function createAuthUser(
  client: Supabase,
  input: {
    email: string;
    password: string;
    fullName: string;
    role: string;
  }
) {
  return client.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    app_metadata: { role: input.role },
    user_metadata: {
      full_name: input.fullName,
    },
  });
}

export async function updateAuthUserEmailAndPassword(
  client: Supabase,
  input: { email?: string; password?: string }
) {
  return client.auth.updateUser({
    ...(input.email ? { email: input.email } : {}),
    ...(input.password ? { password: input.password } : {}),
  });
}

export async function getAuthUserById(client: Supabase, id: string) {
  return client.auth.admin.getUserById(id);
}

/** Cap Auth Admin hangs so roster/list pages soft-fail instead of stalling. */
const AUTH_EMAIL_LOOKUP_TIMEOUT_MS = 8_000;
/** Parallel Auth Admin fallback chunk size when the RPC misses rows. */
const AUTH_EMAIL_GET_BY_ID_CHUNK = 40;

type AuthEmailLookupResult = {
  id: string;
  email: string;
  ok: boolean;
};

async function lookupAuthEmailById(
  client: Supabase,
  id: string
): Promise<AuthEmailLookupResult> {
  try {
    const result = await Promise.race([
      client.auth.admin.getUserById(id),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error("Auth email lookup timed out."));
        }, AUTH_EMAIL_LOOKUP_TIMEOUT_MS);
      }),
    ]);

    if (result.error) {
      return { id, email: "", ok: false };
    }

    return { id, email: result.data.user?.email ?? "", ok: true };
  } catch {
    return { id, email: "", ok: false };
  }
}

/**
 * Resolve emails for many auth user IDs.
 * Prefer one DB RPC against auth.users; fall back to timed Auth Admin getUserById
 * only for ids the RPC did not return. Soft-fail misses use a short negative
 * cache so concurrent roster loads do not stampede Auth Admin.
 */
export async function listAuthEmailsByIds(
  client: Supabase,
  userIds: readonly string[]
): Promise<{ data: Map<string, string>; error: Error | null }> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const emailById = collectCachedAuthEmails(uniqueIds);

  if (uniqueIds.length === 0) {
    return { data: emailById, error: null };
  }

  const missingIds = getMissingAuthEmailIds(uniqueIds);
  if (missingIds.length === 0) {
    return { data: emailById, error: null };
  }

  const fetched = new Map<string, string>();
  let stillMissing = missingIds;
  const failedIds: string[] = [];

  const { data: rpcRows, error: rpcError } = await client.rpc(
    "list_auth_emails_by_ids",
    { p_ids: missingIds }
  );

  if (rpcError) {
    // RPC down: soft-fail without Auth Admin fan-out under concurrent load.
    for (const id of missingIds) {
      emailById.set(id, "");
      failedIds.push(id);
    }
    setCachedAuthEmailMisses(failedIds);
    return { data: emailById, error: null };
  }

  if (rpcRows) {
    for (const row of rpcRows) {
      const email = row.email ?? "";
      fetched.set(row.id, email);
      emailById.set(row.id, email);
    }
    stillMissing = missingIds.filter((id) => !fetched.has(id));
  }

  if (stillMissing.length > 0) {
    for (
      let index = 0;
      index < stillMissing.length;
      index += AUTH_EMAIL_GET_BY_ID_CHUNK
    ) {
      const chunk = stillMissing.slice(
        index,
        index + AUTH_EMAIL_GET_BY_ID_CHUNK
      );
      const results = await Promise.all(
        chunk.map((id) => lookupAuthEmailById(client, id))
      );

      for (const row of results) {
        if (!row.ok) {
          emailById.set(row.id, "");
          failedIds.push(row.id);
          continue;
        }
        fetched.set(row.id, row.email);
        emailById.set(row.id, row.email);
      }
    }
  }

  setCachedAuthEmails([...fetched.keys()], fetched);
  setCachedAuthEmailMisses(failedIds);

  return { data: emailById, error: null };
}

/**
 * Resolve an auth user by email via DB lookup (no Auth Admin directory scan).
 * Returns the same shape as `getUserById` when found.
 */
export async function findAuthUserByEmail(client: Supabase, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return { data: null, error: null };
  }

  const { data: userId, error: lookupError } = await client.rpc(
    "find_auth_user_id_by_email",
    { p_email: normalizedEmail }
  );

  if (lookupError) {
    return { data: null, error: lookupError };
  }

  if (!userId) {
    return { data: null, error: null };
  }

  return client.auth.admin.getUserById(userId);
}
