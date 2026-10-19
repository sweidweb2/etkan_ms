import { PERMISSIONS } from "@/lib/constants/permissions";
import * as authRepository from "@/repositories/auth.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import {
  assertStudentSelfAccess,
  getUnauthorizedError,
} from "@/services/auth/authorization.service";
import { getStudentForSelf } from "@/services/students/student.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerStudentRow } from "@/types/manager-student";
import { updateOwnStudentProfileSchema } from "@/lib/validators/student/update-own-profile";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type UpdateOwnStudentProfileResult =
  | { success: true; student: ManagerStudentRow; message: string }
  | { success: false; error: string; fieldErrors?: FieldErrors };

export async function updateOwnStudentProfile(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<UpdateOwnStudentProfileResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.STUDENTS_UPDATE_OWN
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateOwnStudentProfileSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const userId = await assertStudentSelfAccess(adminClient, actorUserId);
  const [existing, existingProfile] = await Promise.all([
    studentProfileRepository.findStudentProfileByUserId(adminClient, userId),
    profileRepository.findProfileById(adminClient, userId),
  ]);

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to update profile.",
    };
  }

  if (!existing.data || existingProfile.error || !existingProfile.data) {
    return { success: false, error: "Profile not found." };
  }

  const birthDate = parsed.data.birthDate?.trim() || null;
  const phone = parsed.data.phone?.trim() || null;
  const fullName = parsed.data.fullName.trim();
  const username = parsed.data.username.trim();
  const previousUsername = existingProfile.data.username ?? "";

  if (username !== previousUsername) {
    const taken = await profileRepository.findProfileByUsername(
      adminClient,
      username
    );
    if (taken.error) {
      return {
        success: false,
        error: taken.error.message || "Unable to update profile.",
      };
    }
    if (taken.data && taken.data.id !== userId) {
      return {
        success: false,
        error: "Please fix the errors below.",
        fieldErrors: { username: ["This username is already taken."] },
      };
    }
  }

  const profileUpdate = await profileRepository.updateProfileById(
    adminClient,
    userId,
    { username }
  );

  if (profileUpdate.error || !profileUpdate.data) {
    return {
      success: false,
      error: profileUpdate.error?.message || "Unable to update username.",
    };
  }

  const { error: authError } = await authRepository.updateAuthUserByAdmin(
    adminClient,
    userId,
    { fullName, username }
  );

  if (authError) {
    return {
      success: false,
      error: authError.message || "Unable to update username.",
    };
  }

  const updated = await studentProfileRepository.updateStudentProfileDetailsById(
    adminClient,
    existing.data.id,
    {
      full_name: fullName,
      birth_date: birthDate,
      phone,
    }
  );

  if (updated.error || !updated.data) {
    return {
      success: false,
      error: updated.error?.message || "Unable to update profile.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "student_profiles",
    record_id: existing.data.id,
    old_data: {
      username: previousUsername,
      full_name: existing.data.full_name,
      birth_date: existing.data.birth_date,
      phone: existing.data.phone,
    },
    new_data: {
      username,
      full_name: updated.data.full_name,
      birth_date: updated.data.birth_date,
      phone: updated.data.phone,
    },
  });

  const student = await getStudentForSelf(adminClient, userId);
  if (!student) {
    return { success: false, error: "Unable to update profile." };
  }

  return {
    success: true,
    student,
    message: "Profile updated.",
  };
}
