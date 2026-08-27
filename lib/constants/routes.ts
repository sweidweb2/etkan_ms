import { ROLES, type RoleValue } from "@/lib/constants/roles";
import {
  REGISTRATION_DETAIL_FROM_QUERY,
  type RegistrationDetailFrom,
} from "@/lib/constants/registration-detail-from";
import { appendQueryParam } from "@/lib/url/append-query-param";

export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  CAREERS: "/careers",
  CAREERS_ROADMAP_DETAIL: "/careers/roadmap/[id]",
  PROJECTS: "/projects",
  GALLERY: "/gallery",
  LIFE: "/life",
  LIFE_BLOG_DETAIL: "/life/[id]",
  REGISTER: "/register",
  REGISTER_GUEST: "/register/guest/[token]",
  FINANCIAL_FORM_INVITE: "/f/[token]",
  LOGIN: "/auth/login",
  SIGNUP: "/auth/signup",
  CALLBACK: "/auth/callback",
  ADMIN_ROOT: "/admin",
  ADMIN_DASHBOARD: "/admin/dashboard",
  MANAGER_ROOT: "/manager",
  CO_MANAGER_ROOT: "/co-manager",
  CO_MANAGER_DASHBOARD: "/co-manager/dashboard",
  MANAGER_USERS: "/manager/users",
  MANAGER_USER_DETAIL: "/manager/users/[id]",
  MANAGER_STUDENTS: "/manager/students",
  MANAGER_STUDENT_DETAIL: "/manager/students/[id]",
  MANAGER_SUBJECTS: "/manager/subjects",
  MANAGER_SUBJECT_DETAIL: "/manager/subjects/[id]",
  MANAGER_INSTRUCTORS: "/manager/instructors",
  MANAGER_INSTRUCTOR_SCHEDULES: "/manager/instructor-schedules",
  MANAGER_INSTRUCTOR_SCHEDULES_DETAILS: "/manager/instructor-schedules/details",
  MANAGER_WORKSHOPS: "/manager/workshops",
  MANAGER_WORKSHOPS_PAYMENTS: "/manager/workshops/payments",
  MANAGER_WORKSHOP_DETAIL: "/manager/workshops/[id]",
  MANAGER_ACCOUNTING: "/manager/accounting",
  MANAGER_INCOME_STATEMENT: "/manager/income-statement",
  MANAGER_INCOME_STATEMENT_ANALYTICS: "/manager/income-statement/analytics",
  MANAGER_INCOME_STATEMENT_HISTORY: "/manager/income-statement/history",
  MANAGER_ACCOUNTING_PHASE_DETAIL: "/manager/accounting/phases/[id]",
  MANAGER_ACCOUNTING_SPP_DETAIL:
    "/manager/accounting/phases/[id]/students/[sppId]",
  MANAGER_SCHEDULE: "/manager/schedule",
  MANAGER_NOTIFICATIONS: "/manager/notifications",
  MANAGER_EMAILING: "/manager/emailing",
  MANAGER_EMAILING_COMPOSE: "/manager/emailing/compose",
  MANAGER_SENT: "/manager/sent",
  MANAGER_SENT_DETAIL: "/manager/sent/[id]",
  MANAGER_CLASSES: "/manager/classes",
  MANAGER_CLASS_DETAIL: "/manager/classes/[id]",
  MANAGER_CLASS_GRADES: "/manager/classes/[id]/grades",
  MANAGER_CLASS_STUDENT_GRADES_DETAIL:
    "/manager/classes/[id]/grades/students/[studentId]",
  MANAGER_CLASS_SESSION_DETAIL: "/manager/classes/[id]/sessions/[sessionId]",
  MANAGER_CLASS_SESSION_TASK_DETAIL:
    "/manager/classes/[id]/sessions/[sessionId]/tasks/[taskId]",
  MANAGER_EQUIPMENTS: "/manager/equipments",
  MANAGER_EQUIPMENT_DETAIL: "/manager/equipments/[id]",
  MANAGER_EQUIPMENT_BORROW: "/manager/equipments/borrow",
  MANAGER_GALLERY: "/manager/gallery",
  MANAGER_PROJECTS: "/manager/projects",
  MANAGER_PROJECT_DETAIL: "/manager/projects/[id]",
  MANAGER_RELATIONSHIPS: "/manager/relationships",
  MANAGER_SEMESTERS: "/manager/semesters",
  MANAGER_SEMESTERS_PROGRESS: "/manager/semesters/progress",
  MANAGER_SETTINGS: "/manager/settings",
  MANAGER_REPORTS: "/manager/reports",
  MANAGER_ANALYTICS: "/manager/analytics",
  MANAGER_BACKUP: "/manager/backup",
  MANAGER_LOGS: "/manager/logs",
  MANAGER_CLOUDFLARE_AI_USAGE: "/manager/cloudflare-ai-usage",
  MANAGER_REGISTRATIONS: "/manager/registrations",
  MANAGER_GUESTS: "/manager/guests",
  MANAGER_GUEST_DETAIL: "/manager/guests/[id]",
  MANAGER_CRON_JOBS: "/manager/cron-jobs",
  MANAGER_RBAC: "/manager/rbac",
  CEO_ROOT: "/ceo",
  TEACHER_ROOT: "/teacher",
  TEACHER_DASHBOARD: "/teacher/dashboard",
  TEACHER_SCHEDULE: "/teacher/schedule",
  TEACHER_CLASSES: "/teacher/classes",
  TEACHER_SUBJECTS: "/teacher/subjects",
  TEACHER_STUDENTS: "/teacher/students",
  TEACHER_NOTIFICATIONS: "/teacher/notifications",
  TEACHER_ANALYTICS: "/teacher/analytics",
  TRAINER_ROOT: "/trainer",
  TRAINER_DASHBOARD: "/trainer/dashboard",
  STUDENT_ROOT: "/student",
  STUDENT_DASHBOARD: "/student/dashboard",
  STUDENT_CLASSES: "/student/classes",
  STUDENT_FINANCE: "/student/finance",
  STUDENT_ACTIVITY: "/student/activity",
  STUDENT_ANALYTICS: "/student/analytics",
  STUDENT_NOTIFICATIONS: "/student/notifications",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

const ROLE_DASHBOARD_ROUTES: Record<RoleValue, string> = {
  [ROLES.ADMIN]: ROUTES.ADMIN_DASHBOARD,
  [ROLES.MANAGER]: ROUTES.MANAGER_STUDENTS,
  [ROLES.CO_MANAGER]: ROUTES.CO_MANAGER_DASHBOARD,
  [ROLES.CEO]: ROUTES.MANAGER_WORKSHOPS,
  [ROLES.TEACHER]: ROUTES.TEACHER_DASHBOARD,
  [ROLES.TRAINER]: ROUTES.TRAINER_DASHBOARD,
  [ROLES.STUDENT]: ROUTES.STUDENT_DASHBOARD,
};

const ROLE_PANEL_ROOTS: Record<RoleValue, string> = {
  [ROLES.ADMIN]: ROUTES.ADMIN_ROOT,
  [ROLES.MANAGER]: ROUTES.MANAGER_ROOT,
  [ROLES.CO_MANAGER]: ROUTES.CO_MANAGER_ROOT,
  [ROLES.CEO]: ROUTES.CEO_ROOT,
  [ROLES.TEACHER]: ROUTES.TEACHER_ROOT,
  [ROLES.TRAINER]: ROUTES.TRAINER_ROOT,
  [ROLES.STUDENT]: ROUTES.STUDENT_ROOT,
};

export function getDashboardRouteForRole(role: RoleValue): string {
  return ROLE_DASHBOARD_ROUTES[role];
}

export function getPanelRootForRole(role: RoleValue): string {
  return ROLE_PANEL_ROOTS[role];
}

export function getCareersRoadmapDetailRoute(stageId: string): string {
  return `/careers/roadmap/${stageId}`;
}

export function getLifeBlogDetailRoute(blogId: string): string {
  return `/life/${blogId}`;
}

export function getFinancialFormInviteRoute(token: string): string {
  return `/f/${token}`;
}

export function getRegisterGuestRoute(token: string): string {
  return `/register/guest/${token}`;
}

/** Invite-only public forms: no site navbar or footer. */
export function hidesPublicSiteChrome(pathname: string): boolean {
  return (
    pathname.startsWith("/f/") ||
    pathname.startsWith(`${ROUTES.REGISTER}/guest/`)
  );
}

export function getManagerUserDetailRoute(userId: string): string {
  return `/manager/users/${userId}`;
}

export function getManagerStudentDetailRoute(studentProfileId: string): string {
  return `/manager/students/${studentProfileId}`;
}

export function getManagerSubjectDetailRoute(subjectId: string): string {
  return `/manager/subjects/${subjectId}`;
}

export function getManagerWorkshopDetailRoute(workshopId: string): string {
  return `/manager/workshops/${workshopId}`;
}

export function getManagerRegistrationDetailRoute(
  applicationId: string,
  from: RegistrationDetailFrom = "registrations"
): string {
  const path = `/manager/registrations/${applicationId}`;
  if (from === "registrations") {
    return path;
  }
  return appendQueryParam(path, REGISTRATION_DETAIL_FROM_QUERY, from);
}

export function getManagerEquipmentDetailRoute(equipmentId: string): string {
  return `/manager/equipments/${equipmentId}`;
}

export function getManagerProjectDetailRoute(projectId: string): string {
  return `/manager/projects/${projectId}`;
}

export function getManagerGuestDetailRoute(guestId: string): string {
  return `/manager/guests/${guestId}`;
}

export function getManagerAccountingPhaseDetailRoute(phaseId: string): string {
  return `/manager/accounting/phases/${phaseId}`;
}

export function getManagerAccountingSppDetailRoute(
  phaseId: string,
  sppId: string
): string {
  return `/manager/accounting/phases/${phaseId}/students/${sppId}`;
}

export function getManagerSemesterDetailRoute(semesterId: string): string {
  return `/manager/semesters/${semesterId}`;
}

export function getManagerClassDetailRoute(classId: string): string {
  return `/manager/classes/${classId}`;
}

export function getManagerEmailSentDetailRoute(emailSentId: string): string {
  return `/manager/sent/${emailSentId}`;
}

export function getManagerClassGradesRoute(classId: string): string {
  return `/manager/classes/${classId}/grades`;
}

export function getManagerClassStudentGradesDetailRoute(
  classId: string,
  studentId: string
): string {
  return `/manager/classes/${classId}/grades/students/${studentId}`;
}

export function getManagerClassSessionDetailRoute(
  classId: string,
  sessionId: string
): string {
  return `/manager/classes/${classId}/sessions/${sessionId}`;
}

export function getManagerClassSessionTaskDetailRoute(
  classId: string,
  sessionId: string,
  taskId: string
): string {
  return `/manager/classes/${classId}/sessions/${sessionId}/tasks/${taskId}`;
}

export const PANEL_ROOTS = [...Object.values(ROLE_PANEL_ROOTS)] as const;
