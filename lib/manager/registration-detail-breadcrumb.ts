import { type RegistrationDetailFrom } from "@/lib/constants/registration-detail-from";
import {
  getManagerGuestDetailRoute,
  getManagerStudentDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";

export type RegistrationDetailBreadcrumbItem = {
  href?: string;
  label: string;
};

export function buildRegistrationDetailBreadcrumb(input: {
  from: RegistrationDetailFrom;
  applicationName: string;
  guest: { id: string; full_name: string } | null;
  student: { id: string; full_name: string } | null;
}): RegistrationDetailBreadcrumbItem[] {
  if (input.from === "guest" && input.guest) {
    return [
      { href: ROUTES.MANAGER_GUESTS, label: "Guests" },
      {
        href: getManagerGuestDetailRoute(input.guest.id),
        label: input.guest.full_name,
      },
      { label: "Registration" },
    ];
  }

  if (input.from === "student" && input.student) {
    return [
      { href: ROUTES.MANAGER_STUDENTS, label: "Manage students" },
      {
        href: getManagerStudentDetailRoute(input.student.id),
        label: input.student.full_name,
      },
      { label: "Registration" },
    ];
  }

  return [
    { href: ROUTES.MANAGER_REGISTRATIONS, label: "Registrations" },
    { label: input.applicationName },
  ];
}
