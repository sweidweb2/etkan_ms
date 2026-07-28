import {
  baseUsernameFromEmail,
  usernameWithSuffix,
} from "@/lib/auth/username";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export async function generateUniqueUsername(
  client: Supabase,
  email: string
): Promise<string> {
  const base = baseUsernameFromEmail(email);

  if (!(await profileRepository.findProfileByUsername(client, base)).data) {
    return base;
  }

  for (let suffix = 1; suffix < 1000; suffix++) {
    const candidate = usernameWithSuffix(base, suffix);
    if (
      !(await profileRepository.findProfileByUsername(client, candidate)).data
    ) {
      return candidate;
    }
  }

  throw new Error("Unable to generate a unique username.");
}

export async function ensureStudentRegistration(
  client: Supabase,
  input: {
    authId: string;
    username?: string;
    email: string;
    fullName: string;
    birthDate?: string | null;
    phone?: string | null;
    role?: RoleValue;
  }
): Promise<{ profileId: string }> {
  const existingProfile = await profileRepository.findProfileById(
    client,
    input.authId
  );

  if (existingProfile.data) {
    const existingStudent =
      await studentProfileRepository.findStudentProfileByUserId(
        client,
        input.authId
      );

    if (!existingStudent.data) {
      const { error: studentError } =
        await studentProfileRepository.createStudentProfile(client, {
          user_id: input.authId,
          full_name: input.fullName,
          birth_date: input.birthDate,
          phone: input.phone,
        });

      if (studentError) {
        throw new Error(studentError.message);
      }
    }

    return { profileId: existingProfile.data.id };
  }

  const username =
    input.username ?? (await generateUniqueUsername(client, input.email));
  const role = input.role ?? ROLES.STUDENT;

  const { data: profile, error: profileError } =
    await profileRepository.createProfile(client, {
      id: input.authId,
      username,
      role,
    });

  if (profileError || !profile) {
    throw new Error(profileError?.message ?? "Failed to create profile.");
  }

  const existingStudent =
    await studentProfileRepository.findStudentProfileByUserId(
      client,
      input.authId
    );

  if (!existingStudent.data) {
    const { error: studentError } =
      await studentProfileRepository.createStudentProfile(client, {
        user_id: input.authId,
        full_name: input.fullName,
        birth_date: input.birthDate,
        phone: input.phone,
      });

    if (studentError) {
      await profileRepository.deleteProfileById(client, input.authId);
      throw new Error(studentError.message);
    }
  }

  return { profileId: profile.id };
}
