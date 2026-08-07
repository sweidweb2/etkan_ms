import { revalidatePath, revalidateTag } from "next/cache";
import { ROUTES } from "@/lib/constants/routes";

/** Cache tags for instructor-schedule catalogs — keep in sync with docs/caching. */
export const INSTRUCTOR_SCHEDULE_CACHE_TAGS = {
  INSTRUCTORS: "manager-schedule-instructors",
  ELIGIBLE_WORKSHOPS: "manager-schedule-eligible-workshops",
  SESSIONS: "manager-schedule-sessions",
} as const;

const REVALIDATE_PROFILE = "max" as const;

export function revalidateManagerScheduleInstructors(): void {
  revalidateTag(INSTRUCTOR_SCHEDULE_CACHE_TAGS.INSTRUCTORS, REVALIDATE_PROFILE);
  revalidatePath(ROUTES.MANAGER_INSTRUCTOR_SCHEDULES);
}

export function revalidateManagerScheduleEligibleWorkshops(): void {
  revalidateTag(
    INSTRUCTOR_SCHEDULE_CACHE_TAGS.ELIGIBLE_WORKSHOPS,
    REVALIDATE_PROFILE
  );
  revalidatePath(ROUTES.MANAGER_INSTRUCTOR_SCHEDULES);
}

export function revalidateManagerScheduleSessions(): void {
  revalidateTag(INSTRUCTOR_SCHEDULE_CACHE_TAGS.SESSIONS, REVALIDATE_PROFILE);
  revalidatePath(ROUTES.MANAGER_INSTRUCTOR_SCHEDULES);
}

/** Instructors + eligible workshops + sessions (workshop lock/catalog + calendar). */
export function revalidateManagerScheduleCalendar(): void {
  revalidateManagerScheduleInstructors();
  revalidateManagerScheduleEligibleWorkshops();
  revalidateManagerScheduleSessions();
}
