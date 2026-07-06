import { ROLES, type RoleValue } from "@/lib/constants/roles";

export const ROUTES = {
  HOME: "/",
  LOGIN: "/auth/login",
  SIGNUP: "/auth/signup",
  CALLBACK: "/auth/callback",
  ADMIN_ROOT: "/admin",
  ADMIN_DASHBOARD: "/admin/dashboard",
  MANAGER_ROOT: "/manager",
  MANAGER_DASHBOARD: "/manager/dashboard",
  CEO_ROOT: "/ceo",
  CEO_DASHBOARD: "/ceo/dashboard",
  TEACHER_ROOT: "/teacher",
  TEACHER_DASHBOARD: "/teacher/dashboard",
  STUDENT_ROOT: "/student",
  STUDENT_DASHBOARD: "/student/dashboard",
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

export const PANEL_ROOTS = Object.values(ROLE_PANEL_ROOTS);
