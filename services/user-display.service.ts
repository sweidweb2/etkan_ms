import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

/** Build a display label from JWT/auth fields + optional username (no DB). */
export function displayNameFromAuthUser(
  authUser: User,
  username?: string | null
): string {
  const metadataName = authUser.user_metadata?.full_name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  if (username?.trim()) {
    return username.trim();
  }

  const emailPrefix = authUser.email?.split("@")[0];
  return emailPrefix?.trim() || "User";
}

/**
 * Resolve a human display name.
 * Prefers JWT `user_metadata.full_name` (no DB) before student_profiles / profiles.
 */
export async function resolveDisplayName(
  client: Supabase,
  authUser: User
): Promise<string> {
  const metadataName = authUser.user_metadata?.full_name;
  if (typeof metadataName === "string" && metadataName.trim()) {
    return metadataName.trim();
  }

  const { data: studentProfile } =
    await studentProfileRepository.findStudentProfileByUserId(
      client,
      authUser.id
    );

  if (studentProfile?.full_name?.trim()) {
    return studentProfile.full_name.trim();
  }

  const { data: profile } = await profileRepository.findProfileById(
    client,
    authUser.id
  );

  if (profile?.username?.trim()) {
    return profile.username.trim();
  }

  return displayNameFromAuthUser(authUser);
}
