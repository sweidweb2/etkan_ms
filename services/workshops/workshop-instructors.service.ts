import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  deleteMirrorsForWorkshopInstructor,
  mirrorWorkshopSlotsToInstructor,
} from "@/lib/manager/workshops/mirror-instructor-schedule";
import { zodFieldErrors } from "@/lib/validators/auth/parse-form";
import {
  createWorkshopInstructorSchema,
  removeWorkshopInstructorSchema,
  updateWorkshopInstructorSchema,
} from "@/lib/validators/manager/workshop-instructor";
import * as profileRepository from "@/repositories/profile.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import type { WorkshopInstructorWithProfileRecord } from "@/repositories/workshop-instructor.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import { getUnauthorizedError } from "@/services/auth/authorization.service";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/ops/audit-log.service";
import {
  contentLockErrorForWorkshopStatus,
  mapWorkshopInstructorRecord,
  type RemoveWorkshopInstructorResult,
  type Supabase,
  type WorkshopInstructorMutationResult,
} from "@/services/workshops/workshop-shared";

export async function addWorkshopInstructorForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopInstructorMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_INSTRUCTORS_CREATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = createWorkshopInstructorSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const [workshopResult, profileResult] = await Promise.all([
    workshopRepository.findWorkshopById(adminClient, dataInput.workshop_id),
    profileRepository.findProfileById(adminClient, dataInput.user_id),
  ]);

  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to add instructor.",
    };
  }

  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }

  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  if (profileResult.error) {
    return {
      success: false,
      error: profileResult.error.message || "Unable to add instructor.",
    };
  }

  if (!profileResult.data) {
    return { success: false, error: "User not found." };
  }

  if (!profileResult.data.is_instructor) {
    return {
      success: false,
      error: "Only instructor profiles can be assigned to a workshop.",
    };
  }

  const existingAssignment =
    await workshopInstructorRepository.findWorkshopInstructorByWorkshopAndUser(
      adminClient,
      dataInput.workshop_id,
      dataInput.user_id
    );

  if (existingAssignment.error) {
    return {
      success: false,
      error: existingAssignment.error.message || "Unable to add instructor.",
    };
  }

  if (existingAssignment.data) {
    return {
      success: false,
      error: "This instructor is already assigned to this workshop.",
    };
  }

  const { data, error } =
    await workshopInstructorRepository.createWorkshopInstructor(adminClient, {
      workshop_id: dataInput.workshop_id,
      user_id: dataInput.user_id,
      role: dataInput.role,
      wage_type: dataInput.wage_type,
      wage_amount: dataInput.wage_amount,
      notes: dataInput.notes,
    });

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to add instructor.",
    };
  }

  const instructor = mapWorkshopInstructorRecord(
    data as WorkshopInstructorWithProfileRecord
  );

  const mirrorResult = await mirrorWorkshopSlotsToInstructor(
    adminClient,
    dataInput.workshop_id,
    dataInput.user_id
  );

  if (mirrorResult.error) {
    await workshopInstructorRepository.deleteWorkshopInstructorById(
      adminClient,
      instructor.id
    );
    return {
      success: false,
      error: mirrorResult.error,
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "info",
    table_name: "workshop_instructors",
    record_id: instructor.id,
    new_data: {
      workshop_id: instructor.workshop_id,
      user_id: instructor.user_id,
      role: instructor.role,
      wage_type: instructor.wage_type,
      wage_amount: instructor.wage_amount,
    },
    metadata: {
      note: "Workshop instructor assigned.",
      mirrored_busy_slots: mirrorResult.count ?? 0,
    },
  });

  return {
    success: true,
    instructor,
    message: "Instructor added.",
  };
}

export async function updateWorkshopInstructorForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<WorkshopInstructorMutationResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_INSTRUCTORS_UPDATE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = updateWorkshopInstructorSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: zodFieldErrors(parsed.error.flatten().fieldErrors),
    };
  }

  const dataInput = parsed.data;

  const existing =
    await workshopInstructorRepository.findWorkshopInstructorById(
      adminClient,
      dataInput.id
    );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to update instructor.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Instructor assignment not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Instructor assignment not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to update instructor.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const previous = mapWorkshopInstructorRecord(
    existing.data as WorkshopInstructorWithProfileRecord
  );

  const { data, error } =
    await workshopInstructorRepository.updateWorkshopInstructorById(
      adminClient,
      dataInput.id,
      {
        role: dataInput.role,
        wage_type: dataInput.wage_type,
        wage_amount: dataInput.wage_amount,
        notes: dataInput.notes,
      }
    );

  if (error || !data) {
    return {
      success: false,
      error: error?.message || "Unable to update instructor.",
    };
  }

  const instructor = mapWorkshopInstructorRecord(
    data as WorkshopInstructorWithProfileRecord
  );

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "info",
    table_name: "workshop_instructors",
    record_id: instructor.id,
    old_data: {
      role: previous.role,
      wage_type: previous.wage_type,
      wage_amount: previous.wage_amount,
      notes: previous.notes,
    },
    new_data: {
      role: instructor.role,
      wage_type: instructor.wage_type,
      wage_amount: instructor.wage_amount,
      notes: instructor.notes,
    },
    metadata: { note: "Workshop instructor updated." },
  });

  return {
    success: true,
    instructor,
    message: "Instructor updated.",
  };
}

export async function removeWorkshopInstructorForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  actor: AuditActor,
  input: unknown
): Promise<RemoveWorkshopInstructorResult> {
  const unauthorized = await getUnauthorizedError(
    adminClient,
    actorUserId,
    PERMISSIONS.WORKSHOPS_INSTRUCTORS_DELETE
  );
  if (unauthorized) {
    return { success: false, error: unauthorized };
  }

  const parsed = removeWorkshopInstructorSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
    };
  }

  const dataInput = parsed.data;

  const existing =
    await workshopInstructorRepository.findWorkshopInstructorById(
      adminClient,
      dataInput.id
    );

  if (existing.error) {
    return {
      success: false,
      error: existing.error.message || "Unable to remove instructor.",
    };
  }

  if (!existing.data) {
    return { success: false, error: "Instructor assignment not found." };
  }

  if (existing.data.workshop_id !== dataInput.workshop_id) {
    return { success: false, error: "Instructor assignment not found." };
  }

  const workshopResult = await workshopRepository.findWorkshopById(
    adminClient,
    existing.data.workshop_id
  );
  if (workshopResult.error) {
    return {
      success: false,
      error: workshopResult.error.message || "Unable to remove instructor.",
    };
  }
  if (!workshopResult.data) {
    return { success: false, error: "Workshop not found." };
  }
  const locked = contentLockErrorForWorkshopStatus(workshopResult.data.status);
  if (locked) {
    return { success: false, error: locked };
  }

  const previous = mapWorkshopInstructorRecord(
    existing.data as WorkshopInstructorWithProfileRecord
  );

  const mirrorDeleteResult = await deleteMirrorsForWorkshopInstructor(
    adminClient,
    previous.workshop_id,
    previous.user_id
  );

  if (mirrorDeleteResult.error) {
    return {
      success: false,
      error: mirrorDeleteResult.error,
    };
  }

  const { error } =
    await workshopInstructorRepository.deleteWorkshopInstructorById(
      adminClient,
      dataInput.id
    );

  if (error) {
    await mirrorWorkshopSlotsToInstructor(
      adminClient,
      previous.workshop_id,
      previous.user_id
    );
    return {
      success: false,
      error: error.message || "Unable to remove instructor.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "warning",
    table_name: "workshop_instructors",
    record_id: dataInput.id,
    old_data: {
      workshop_id: previous.workshop_id,
      user_id: previous.user_id,
      role: previous.role,
      wage_type: previous.wage_type,
      wage_amount: previous.wage_amount,
    },
    metadata: {
      note: "Workshop instructor removed.",
    },
  });

  return {
    success: true,
    message: "Instructor removed.",
  };
}
