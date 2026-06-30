import * as userRepository from "@/repositories/user.repository";
import type { HomePageData } from "@/types/home";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function getHomePageData(
  client: Supabase,
  input: {
    authUserId: string;
    fallbackEmail: string;
    isAdmin: boolean;
  }
): Promise<HomePageData> {
  const { data, error } = await userRepository.findUserByAuthId(
    client,
    input.authUserId
  );

  if (error || !data) {
    return {
      displayName: input.fallbackEmail.split("@")[0] ?? "User",
      email: input.fallbackEmail,
      username: null,
      memberSince: null,
      isAdmin: input.isAdmin,
    };
  }

  return {
    displayName: data.username ?? input.fallbackEmail.split("@")[0],
    email: data.email,
    username: data.username,
    memberSince: data.created_at ?? null,
    isAdmin: input.isAdmin,
  };
}
