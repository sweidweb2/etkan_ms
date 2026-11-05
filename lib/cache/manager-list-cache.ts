import { revalidatePath, revalidateTag } from "next/cache";
import { clearCachedAuthEmails } from "@/lib/auth/auth-emails-cache";
import { ROUTES } from "@/lib/constants/routes";

/** Cache tags for manager list caches — keep in sync with docs/caching. */
export const MANAGER_CACHE_TAGS = {
  USERS: "manager-users",
  STUDENTS: "manager-students",
  INSTRUCTORS: "manager-instructors",
} as const;

const REVALIDATE_PROFILE = "max" as const;

export function revalidateManagerUsersList(): void {
  revalidateTag(MANAGER_CACHE_TAGS.USERS, REVALIDATE_PROFILE);
  revalidatePath(ROUTES.MANAGER_USERS);
  clearCachedAuthEmails();
}

export function revalidateManagerStudentsList(): void {
  revalidateTag(MANAGER_CACHE_TAGS.STUDENTS, REVALIDATE_PROFILE);
  revalidatePath(ROUTES.MANAGER_STUDENTS);
  clearCachedAuthEmails();
}

/** Student create/update/delete touches both student rows and the all-profiles users list. */
export function revalidateManagerPeopleLists(): void {
  revalidateManagerUsersList();
  revalidateManagerStudentsList();
  revalidateManagerInstructorsList();
}

export function revalidateManagerInstructorsList(): void {
  revalidateTag(MANAGER_CACHE_TAGS.INSTRUCTORS, REVALIDATE_PROFILE);
  revalidatePath(ROUTES.MANAGER_INSTRUCTORS);
  clearCachedAuthEmails();
}