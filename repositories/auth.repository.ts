import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import type { RoleValue } from "@/lib/constants/roles";

type Supabase = SupabaseClient<Database>;

export async function signInWithPassword(
  client: Supabase,
  email: string,
  password: string
) {
  return client.auth.signInWithPassword({ email, password });
}

export async function signOut(client: Supabase) {
  return client.auth.signOut({ scope: "global" });
}

export async function getUser(client: Supabase) {
  return client.auth.getUser();
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
