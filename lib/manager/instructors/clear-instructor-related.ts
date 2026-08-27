import type { SupabaseClient } from "@supabase/supabase-js";
import { ENTITY_SCHEDULE_TYPE_INSTRUCTOR } from "@/lib/validators/manager/instructor-schedule-slot";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import * as mentorSubjectCapabilityRepository from "@/repositories/mentor-subject-capability.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

export type ClearInstructorRelatedResult = {
  error: string | null;
};

/**
 * When `is_instructor` is turned off: capabilities → workshop assignments →
 * all instructor schedule slots (own + workshop mirrors).
 */
export async function clearInstructorWorkshopRelatedData(
  admin: Supabase,
  userId: string
): Promise<ClearInstructorRelatedResult> {
  const { error: capabilityError } =
    await mentorSubjectCapabilityRepository.deleteCapabilitiesByUserId(
      admin,
      userId
    );
  if (capabilityError) {
    return {
      error:
        capabilityError.message ||
        "Unable to clear instructor mentor subject capabilities.",
    };
  }

  // Profile hard-delete cascades workshop_instructors via FK; flag-off needs explicit cleanup.
  const { error: workshopInstructorError } =
    await workshopInstructorRepository.deleteWorkshopInstructorsByUserId(
      admin,
      userId
    );
  if (workshopInstructorError) {
    return {
      error:
        workshopInstructorError.message ||
        "Unable to clear workshop instructor assignments.",
    };
  }

  const { error: slotsError } =
    await instructorScheduleSlotRepository.deleteInstructorScheduleSlotsByEntityRecord(
      admin,
      ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
      userId
    );
  if (slotsError) {
    return {
      error:
        slotsError.message || "Unable to clear instructor schedule slots.",
    };
  }

  return { error: null };
}
