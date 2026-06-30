import { ROLES } from "@/lib/constants/roles";
import {
  baseUsernameFromEmail,
  usernameWithSuffix,
} from "@/lib/auth/username";
import { hashPassword } from "@/lib/utils/password";
import * as userRepository from "@/repositories/user.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function generateUniqueUsername(
  client: Supabase,
  email: string
): Promise<string> {
  const base = baseUsernameFromEmail(email);

  if (!(await userRepository.findUserByUsername(client, base)).data) {
    return base;
  }

  for (let suffix = 1; suffix < 1000; suffix++) {
    const candidate = usernameWithSuffix(base, suffix);
    if (!(await userRepository.findUserByUsername(client, candidate)).data) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique username.");
}

export async function createUserRecord(
  client: Supabase,
  input: {
    authId: string;
    email: string;
    password: string;
    username?: string;
    role?: typeof ROLES.ADMIN | typeof ROLES.CUSTOMER;
  }
): Promise<{ userId: number }> {
  const existing = await userRepository.findUserByAuthId(client, input.authId);

  if (existing.data) {
    return { userId: existing.data.id };
  }

  const username =
    input.username ?? (await generateUniqueUsername(client, input.email));
  const password_hash = await hashPassword(input.password);

  const { data: user, error: userError } = await userRepository.createUser(
    client,
    {
      auth_id: input.authId,
      username,
      email: input.email,
      password_hash,
      role: input.role ?? ROLES.CUSTOMER,
    }
  );

  if (userError || !user) {
    throw new Error(userError?.message ?? "Failed to create user record.");
  }

  return { userId: user.id };
}
