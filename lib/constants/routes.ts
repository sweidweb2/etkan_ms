import { ROLES, type RoleValue } from "@/lib/constants/roles";

export const ROUTES = {
  HOME: "/",
  ABOUT: "/about",
  CAREERS: "/careers",
  PROJECTS: "/projects",
  LIFE: "/life",
  LOGIN: "/auth/login",
  SIGNUP: "/auth/signup",
  CALLBACK: "/auth/callback",
  ADMIN_ROOT: "/admin",
  ADMIN_DASHBOARD: "/admin/dashboard",
  MANAGER_ROOT: "/manager",
  MANAGER_DASHBOARD: "/manager/dashboard",
  MANAGER_USERS: "/manager/users",
  MANAGER_USER_DETAIL: "/manager/users/[id]",
  MANAGER_STUDENTS: "/manager/students",
  MANAGER_STUDENT_DETAIL: "/manager/students/[id]",
  MANAGER_SUBJECTS: "/manager/subjects",
  MANAGER_SUBJECT_DETAIL: "/manager/subjects/[id]",
  MANAGER_ACCOUNTING: "/manager/accounting",
  MANAGER_ACCOUNTING_ANALYSIS: "/manager/accounting/analysis",
  MANAGER_STUDENT_ACCOUNT_DETAIL: "/manager/accounting/students/[id]",
  MANAGER_SCHEDULE: "/manager/schedule",
  MANAGER_NOTIFICATIONS: "/manager/notifications",
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
  MANAGER_RELATIONSHIPS: "/manager/relationships",
  MANAGER_SEMESTERS: "/manager/semesters",
  MANAGER_SEMESTERS_PROGRESS: "/manager/semesters/progress",
  MANAGER_SETTINGS: "/manager/settings",
  MANAGER_REPORTS: "/manager/reports",
  MANAGER_ANALYTICS: "/manager/analytics",
  MANAGER_BACKUP: "/manager/backup",
  MANAGER_LOGS: "/manager/logs",
  MANAGER_CRON_JOBS: "/manager/cron-jobs",
  CEO_ROOT: "/ceo",
  CEO_DASHBOARD: "/ceo/dashboard",
  CEO_USERS_ANALYSIS: "/ceo/users-analysis",
  CEO_TEACHERS_ANALYSIS: "/ceo/teachers-analysis",
  CEO_CLASSES_ANALYSIS: "/ceo/classes-analysis",
  CEO_SUBJECTS_ANALYSIS: "/ceo/subjects-analysis",
  CEO_ACCOUNTING_ANALYSIS: "/ceo/accounting-analysis",
  CEO_NOTIFICATIONS: "/ceo/notifications",
  CEO_TASKS_ANALYSIS: "/ceo/tasks-analysis",
  TEACHER_ROOT: "/teacher",
  TEACHER_DASHBOARD: "/teacher/dashboard",
  TEACHER_SCHEDULE: "/teacher/schedule",
  TEACHER_CLASSES: "/teacher/classes",
  TEACHER_SUBJECTS: "/teacher/subjects",
  TEACHER_STUDENTS: "/teacher/students",
  TEACHER_NOTIFICATIONS: "/teacher/notifications",
  TEACHER_ANALYTICS: "/teacher/analytics",
  STUDENT_ROOT: "/student",
  STUDENT_DASHBOARD: "/student/dashboard",
  STUDENT_CLASSES: "/student/classes",
  STUDENT_FINANCE: "/student/finance",
  STUDENT_ANALYTICS: "/student/analytics",
  STUDENT_NOTIFICATIONS: "/student/notifications",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];

const ROLE_DASHBOARD_ROUTES: Record<RoleValue, string> = {
  [ROLES.ADMIN]: ROUTES.ADMIN_DASHBOARD,
  [ROLES.MANAGER]: ROUTES.MANAGER_DASHBOARD,
  [ROLES.CEO]: ROUTES.CEO_DASHBOARD,
  [ROLES.TEACHER]: ROUTES.TEACHER_DASHBOARD,
  [ROLES.STUDENT]: ROUTES.STUDENT_DASHBOARD,
};

const ROLE_PANEL_ROOTS: Record<RoleValue, string> = {
  [ROLES.ADMIN]: ROUTES.ADMIN_ROOT,
  [ROLES.MANAGER]: ROUTES.MANAGER_ROOT,
  [ROLES.CEO]: ROUTES.CEO_ROOT,
  [ROLES.TEACHER]: ROUTES.TEACHER_ROOT,
  [ROLES.STUDENT]: ROUTES.STUDENT_ROOT,
};

export function getDashboardRouteForRole(role: RoleValue): string {
  return ROLE_DASHBOARD_ROUTES[role];
}

export function getPanelRootForRole(role: RoleValue): string {
  return ROLE_PANEL_ROOTS[role];
}

export function getManagerUserDetailRoute(userId: string): string {
  return `/manager/users/${userId}`;
}

export function getManagerStudentDetailRoute(studentProfileId: string): string {
  return `/manager/students/${studentProfileId}`;
}

export function getManagerStudentAccountDetailRoute(studentProfileId: string): string {
  return `/manager/accounting/students/${studentProfileId}`;
}

export function getManagerSubjectDetailRoute(subjectId: string): string {
  return `/manager/subjects/${subjectId}`;
}

export function getManagerEquipmentDetailRoute(equipmentId: string): string {
  return `/manager/equipments/${equipmentId}`;
}

export function getManagerSemesterDetailRoute(semesterId: string): string {
  return `/manager/semesters/${semesterId}`;
}

export function getManagerClassDetailRoute(classId: string): string {
  return `/manager/classes/${classId}`;
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

export const PANEL_ROOTS = Object.values(ROLE_PANEL_ROOTS);
