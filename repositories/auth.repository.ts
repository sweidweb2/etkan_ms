import {
  getCachedAuthEmails,
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
    username: string;
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
        username: input.username,
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
    username?: string;
  }
) {
  return client.auth.admin.updateUserById(authUserId, {
    ...(input.email ? { email: input.email } : {}),
    user_metadata: {
      ...(input.fullName ? { full_name: input.fullName } : {}),
      ...(input.username ? { username: input.username } : {}),
    },
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
    username: string;
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
      username: input.username,
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

/**
 * Resolve emails for many auth user IDs.
 * Small batches use parallel `getUserById` (targeted).
 * Large batches fall back to paginated `listUsers`.
 */
export async function listAuthEmailsByIds(
  client: Supabase,
  userIds: readonly string[]
): Promise<{ data: Map<string, string>; error: Error | null }> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  const emailById = new Map<string, string>();

  if (uniqueIds.length === 0) {
    return { data: emailById, error: null };
  }

  const cached = getCachedAuthEmails(uniqueIds);
  if (cached) {
    return { data: cached, error: null };
  }

  /** Auth Admin getUserById is cheaper than scanning all users for typical list pages. */
  const GET_BY_ID_MAX = 50;

  if (uniqueIds.length <= GET_BY_ID_MAX) {
    const results = await Promise.all(
      uniqueIds.map(async (id) => {
        const { data, error } = await client.auth.admin.getUserById(id);
        return { id, data, error };
      })
    );

    for (const row of results) {
      if (row.error) {
        emailById.set(row.id, "");
        continue;
      }
      emailById.set(row.id, row.data.user?.email ?? "");
    }

    setCachedAuthEmails(uniqueIds, emailById);
    return { data: emailById, error: null };
  }

  const needed = new Set(uniqueIds);
  let page = 1;
  const perPage = 1000;

  while (needed.size > 0) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });

    if (error) {
      return { data: emailById, error };
    }

    for (const user of data.users) {
      if (needed.has(user.id)) {
        emailById.set(user.id, user.email ?? "");
        needed.delete(user.id);
      }
    }

    if (data.users.length < perPage) {
      break;
    }

    page += 1;
  }

  for (const id of uniqueIds) {
    if (!emailById.has(id)) {
      emailById.set(id, "");
    }
  }

  setCachedAuthEmails(uniqueIds, emailById);
  return { data: emailById, error: null };
}

/** Paginates auth users until a matching email is found or pages are exhausted. */
export async function findAuthUserByEmail(client: Supabase, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });

    if (error) {
      return { data: null, error };
    }

    const match = data.users.find(
      (user) => user.email?.trim().toLowerCase() === normalizedEmail
    );

    if (match) {
      return { data: { user: match }, error: null };
    }

    if (data.users.length < perPage) {
      return { data: null, error: null };
    }

    page += 1;
  }
}
