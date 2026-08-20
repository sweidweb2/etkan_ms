import { describe, expect, it } from "vitest";
import { ROUTES } from "@/lib/constants/routes";
import { buildRegistrationDetailBreadcrumb } from "@/lib/manager/registration-detail-breadcrumb";

describe("buildRegistrationDetailBreadcrumb", () => {
  it("uses the registrations list as the default trail", () => {
    expect(
      buildRegistrationDetailBreadcrumb({
        from: "registrations",
        applicationName: "Ada Lovelace",
        guest: { id: "guest-1", full_name: "Ada Guest" },
        student: { id: "student-1", full_name: "Ada Student" },
      })
    ).toEqual([
      { href: ROUTES.MANAGER_REGISTRATIONS, label: "Registrations" },
      { label: "Ada Lovelace" },
    ]);
  });

  it("uses the guest details trail when opened from a guest", () => {
    expect(
      buildRegistrationDetailBreadcrumb({
        from: "guest",
        applicationName: "Ada Lovelace",
        guest: { id: "guest-1", full_name: "Ada Guest" },
        student: null,
      })
    ).toEqual([
      { href: ROUTES.MANAGER_GUESTS, label: "Guests" },
      { href: "/manager/guests/guest-1", label: "Ada Guest" },
      { label: "Registration" },
    ]);
  });

  it("uses the student details trail when opened from a student", () => {
    expect(
      buildRegistrationDetailBreadcrumb({
        from: "student",
        applicationName: "Ada Lovelace",
        guest: null,
        student: { id: "student-1", full_name: "Ada Student" },
      })
    ).toEqual([
      { href: ROUTES.MANAGER_STUDENTS, label: "Manage students" },
      { href: "/manager/students/student-1", label: "Ada Student" },
      { label: "Registration" },
    ]);
  });

  it("falls back to registrations when the origin entity is missing", () => {
    expect(
      buildRegistrationDetailBreadcrumb({
        from: "guest",
        applicationName: "Ada Lovelace",
        guest: null,
        student: null,
      })
    ).toEqual([
      { href: ROUTES.MANAGER_REGISTRATIONS, label: "Registrations" },
      { label: "Ada Lovelace" },
    ]);
  });
});
