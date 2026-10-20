import {
  PERMISSION_DEFINITIONS,
  PERMISSION_KEYS,
  PERMISSIONS,
  type PermissionFeature,
  type PermissionKey,
} from "@/lib/constants/permissions";
import { ROLES, type RoleValue } from "@/lib/constants/roles";

function permissionKeysForFeatures(
  features: readonly PermissionFeature[]
): PermissionKey[] {
  const featureSet = new Set<PermissionFeature>(features);
  return PERMISSION_DEFINITIONS.filter((definition) =>
    featureSet.has(definition.feature)
  ).map((definition) => definition.key);
}

/**
 * Shared workshop access package seeded to admin (and historically other
 * non-manager roles). Sessions/documents CRUD + workshop/instructor/schedule
 * reads. Does not include workshops.payments.view.
 * Cross-role UI uses shared `/manager/workshops*` when
 * (`is_instructor` or `is_mentor`) + view permission.
 */
export const WORKSHOP_ACCESS_SEED_PERMISSIONS = [
  PERMISSIONS.WORKSHOPS_VIEW,
  PERMISSIONS.WORKSHOPS_SESSIONS_CREATE,
  PERMISSIONS.WORKSHOPS_SESSIONS_UPDATE,
  PERMISSIONS.WORKSHOPS_SESSIONS_DELETE,
  PERMISSIONS.WORKSHOPS_DOCUMENTS_CREATE,
  PERMISSIONS.WORKSHOPS_DOCUMENTS_UPDATE,
  PERMISSIONS.WORKSHOPS_DOCUMENTS_DELETE,
  PERMISSIONS.INSTRUCTORS_VIEW,
  PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW,
] as const satisfies readonly PermissionKey[];

/**
 * CEO workshop / instructor module: full instructors + schedules + workshops
 * (including payments) plus AI usage for Schedule assistant, income
 * statement analytics, academic analysis, and the full manage-guests flow.
 */
export const CEO_WORKSHOP_SEED_PERMISSIONS = [
  PERMISSIONS.INSTRUCTORS_VIEW,
  PERMISSIONS.INSTRUCTORS_CREATE,
  PERMISSIONS.INSTRUCTORS_DELETE,
  PERMISSIONS.INSTRUCTORS_CAPABILITIES_UPDATE,
  PERMISSIONS.INSTRUCTORS_SUBJECTS_CREATE,
  PERMISSIONS.INSTRUCTORS_SUBJECTS_UPDATE,
  PERMISSIONS.INSTRUCTORS_SUBJECTS_DELETE,
  PERMISSIONS.MENTORS_VIEW,
  PERMISSIONS.MENTORS_CREATE,
  PERMISSIONS.MENTORS_DELETE,
  PERMISSIONS.MENTORS_CAPABILITIES_UPDATE,
  PERMISSIONS.MENTORS_SUBJECTS_CREATE,
  PERMISSIONS.MENTORS_SUBJECTS_UPDATE,
  PERMISSIONS.MENTORS_SUBJECTS_DELETE,
  PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW,
  PERMISSIONS.INSTRUCTOR_SCHEDULES_DETAILS_VIEW,
  PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE,
  PERMISSIONS.INSTRUCTOR_SCHEDULES_UPDATE,
  PERMISSIONS.INSTRUCTOR_SCHEDULES_DELETE,
  PERMISSIONS.WORKSHOPS_VIEW,
  PERMISSIONS.WORKSHOPS_CREATE,
  PERMISSIONS.WORKSHOPS_UPDATE,
  PERMISSIONS.WORKSHOPS_DELETE,
  PERMISSIONS.WORKSHOPS_CHANGE_STATUS,
  PERMISSIONS.WORKSHOPS_INSTRUCTORS_CREATE,
  PERMISSIONS.WORKSHOPS_INSTRUCTORS_UPDATE,
  PERMISSIONS.WORKSHOPS_INSTRUCTORS_DELETE,
  PERMISSIONS.WORKSHOPS_DOCUMENTS_CREATE,
  PERMISSIONS.WORKSHOPS_DOCUMENTS_UPDATE,
  PERMISSIONS.WORKSHOPS_DOCUMENTS_DELETE,
  PERMISSIONS.WORKSHOPS_SESSIONS_CREATE,
  PERMISSIONS.WORKSHOPS_SESSIONS_UPDATE,
  PERMISSIONS.WORKSHOPS_SESSIONS_DELETE,
  PERMISSIONS.WORKSHOPS_PAYMENTS_VIEW,
  PERMISSIONS.WORKSHOPS_PAYMENTS_CREATE,
  PERMISSIONS.WORKSHOPS_PAYMENTS_UPDATE,
  PERMISSIONS.WORKSHOPS_PAYMENTS_DELETE,
  PERMISSIONS.CLOUDFLARE_AI_USAGE_VIEW,
  PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_ANALYTICS_VIEW,
  PERMISSIONS.ACADEMIC_ANALYSIS_VIEW,
  PERMISSIONS.GUESTS_VIEW,
  PERMISSIONS.GUESTS_CREATE,
  PERMISSIONS.GUESTS_UPDATE,
  PERMISSIONS.GUESTS_DELETE,
  PERMISSIONS.GUESTS_CHANGE_STATUS,
  PERMISSIONS.GUESTS_REGISTRATION_MANAGE,
  PERMISSIONS.GUESTS_CREATE_STUDENT,
  PERMISSIONS.REGISTRATIONS_VIEW,
] as const satisfies readonly PermissionKey[];

/**
 * Class tree nested under Manage classes (sessions → tasks, attendance,
 * grades, final exams). Used by teacher (own classes via service scope)
 * and supervisor (all classes).
 */
export const CLASS_TREE_SEED_FEATURES = [
  "classes",
  "sessions",
  "attendance",
  "tasks",
  "final_exams",
  "grades",
] as const satisfies readonly PermissionFeature[];

export const CLASS_TREE_SEED_PERMISSIONS = permissionKeysForFeatures(
  CLASS_TREE_SEED_FEATURES
);

/**
 * Teacher: full class-tree grants. List/detail scoping to assigned classes
 * is enforced in services (class_teacher), not by fewer keys.
 */
export const TEACHER_SEED_PERMISSIONS = CLASS_TREE_SEED_PERMISSIONS;

/**
 * Supervisor allow-list feature groups (narrow operational catalog).
 */
export const SUPERVISOR_SEED_FEATURES = [
  "workshops",
  "subjects",
  "students",
  ...CLASS_TREE_SEED_FEATURES,
  "instructor_schedules",
  "academic_analysis",
] as const satisfies readonly PermissionFeature[];

/**
 * Supervisor: workshops, subjects (categories/exercises), students, classes
 * tree, instructor schedules, academic analysis.
 */
export const SUPERVISOR_SEED_PERMISSIONS = permissionKeysForFeatures(
  SUPERVISOR_SEED_FEATURES
);

/**
 * CRM: full manage-guests flow (guests + teams on that page) plus full
 * registrations (view + update_status) for dossiers / details.
 */
export const CRM_SEED_PERMISSIONS = [
  PERMISSIONS.GUESTS_VIEW,
  PERMISSIONS.GUESTS_CREATE,
  PERMISSIONS.GUESTS_UPDATE,
  PERMISSIONS.GUESTS_DELETE,
  PERMISSIONS.GUESTS_CHANGE_STATUS,
  PERMISSIONS.GUESTS_REGISTRATION_MANAGE,
  PERMISSIONS.GUESTS_CREATE_STUDENT,
  PERMISSIONS.TEAMS_VIEW,
  PERMISSIONS.TEAMS_CREATE,
  PERMISSIONS.TEAMS_UPDATE,
  PERMISSIONS.TEAMS_DELETE,
  PERMISSIONS.TEAMS_ASSIGN_GUEST,
  PERMISSIONS.REGISTRATIONS_VIEW,
  PERMISSIONS.REGISTRATIONS_UPDATE_STATUS,
] as const satisfies readonly PermissionKey[];

/**
 * Student panel: own profile (name, birth date, phone, password), enrolled class tree reads
 * (classes → sessions → tasks + related views), own SPP / payments.
 */
export const STUDENT_SEED_PERMISSIONS = [
  PERMISSIONS.STUDENTS_VIEW_OWN,
  PERMISSIONS.STUDENTS_UPDATE_OWN,
  PERMISSIONS.CLASSES_VIEW,
  PERMISSIONS.SESSIONS_VIEW,
  PERMISSIONS.ATTENDANCE_VIEW,
  PERMISSIONS.TASKS_VIEW,
  PERMISSIONS.TASKS_MANAGE_OWN_UPLOADS,
  PERMISSIONS.GRADES_VIEW,
  PERMISSIONS.FINAL_EXAMS_VIEW,
  PERMISSIONS.ACCOUNTING_VIEW,
  PERMISSIONS.ACCOUNTING_CLEARANCES_VIEW,
  PERMISSIONS.PAYMENT_SCHEDULES_VIEW,
] as const satisfies readonly PermissionKey[];

/**
 * Default permission grants applied by `npm run seed:rbac`.
 * `replaceRolePermissions` clears prior grants before applying these.
 */
export const ROLE_SEED_PERMISSIONS: Record<
  RoleValue,
  readonly PermissionKey[]
> = {
  [ROLES.MANAGER]: PERMISSION_KEYS,
  [ROLES.CEO]: CEO_WORKSHOP_SEED_PERMISSIONS,
  [ROLES.SUPERVISOR]: SUPERVISOR_SEED_PERMISSIONS,
  [ROLES.CRM]: CRM_SEED_PERMISSIONS,
  [ROLES.TEACHER]: TEACHER_SEED_PERMISSIONS,
  [ROLES.STUDENT]: STUDENT_SEED_PERMISSIONS,
  [ROLES.CO_MANAGER]: [],
  [ROLES.ADMIN]: WORKSHOP_ACCESS_SEED_PERMISSIONS,
};
