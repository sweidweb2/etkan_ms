import { describe, expect, it } from "vitest";
import { filterPanelNavigation } from "@/lib/auth/filter-panel-navigation";
import { PERMISSIONS, type PermissionKey } from "@/lib/constants/permissions";
import { MANAGER_PANEL_NAVIGATION } from "@/lib/constants/panel-nav";
import { ROUTES } from "@/lib/constants/routes";
import type { PanelNavigation } from "@/types/panel";

function hrefs(nav: PanelNavigation): string[] {
  const top = (nav.items ?? []).map((i) => i.href);
  const nested = (nav.groups ?? []).flatMap((g) => g.items.map((i) => i.href));
  return [...top, ...nested];
}

describe("filterPanelNavigation", () => {
  it("keeps only features with matching view permissions", () => {
    const permissions = new Set<PermissionKey>([
      PERMISSIONS.SUBJECTS_VIEW,
      PERMISSIONS.DASHBOARD_VIEW,
    ]);

    const filtered = filterPanelNavigation(
      MANAGER_PANEL_NAVIGATION,
      permissions
    );
    const paths = hrefs(filtered);

    expect(paths).toContain(ROUTES.MANAGER_DASHBOARD);
    expect(paths).toContain(ROUTES.MANAGER_SUBJECTS);
    expect(paths).not.toContain(ROUTES.MANAGER_USERS);
    expect(paths).not.toContain(ROUTES.MANAGER_CLASSES);
  });

  it("drops groups that have no remaining items", () => {
    const permissions = new Set<PermissionKey>([PERMISSIONS.SUBJECTS_VIEW]);

    const filtered = filterPanelNavigation(
      MANAGER_PANEL_NAVIGATION,
      permissions
    );

    expect(filtered.groups?.some((g) => g.id === "people")).toBe(false);
    expect(filtered.groups?.some((g) => g.id === "academics")).toBe(true);
    expect(filtered.groups?.find((g) => g.id === "academics")?.items).toEqual([
      expect.objectContaining({ href: ROUTES.MANAGER_SUBJECTS }),
    ]);
  });

  it("keeps full manager nav when all view permissions are present", () => {
    const allViews = new Set<PermissionKey>([
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.USERS_VIEW,
      PERMISSIONS.STUDENTS_VIEW,
      PERMISSIONS.RELATIONSHIPS_VIEW,
      PERMISSIONS.SUBJECTS_VIEW,
      PERMISSIONS.INSTRUCTORS_VIEW,
      PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW,
      PERMISSIONS.WORKSHOPS_VIEW,
      PERMISSIONS.CLOUDFLARE_AI_USAGE_VIEW,
      PERMISSIONS.CLASSES_VIEW,
      PERMISSIONS.SEMESTERS_VIEW,
      PERMISSIONS.EQUIPMENT_VIEW,
      PERMISSIONS.GALLERY_VIEW,
      PERMISSIONS.ACCOUNTING_VIEW,
      PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_VIEW,
      PERMISSIONS.SCHEDULE_VIEW,
      PERMISSIONS.NOTIFICATIONS_VIEW,
      PERMISSIONS.EMAILING_VIEW,
      PERMISSIONS.REPORTS_VIEW,
      PERMISSIONS.ANALYTICS_VIEW,
      PERMISSIONS.BACKUP_VIEW,
      PERMISSIONS.LOGS_VIEW,
      PERMISSIONS.SETTINGS_VIEW,
      PERMISSIONS.RBAC_MANAGE,
    ]);

    const filtered = filterPanelNavigation(
      MANAGER_PANEL_NAVIGATION,
      allViews,
      { isInstructor: true }
    );

    expect(hrefs(filtered).length).toBe(hrefs(MANAGER_PANEL_NAVIGATION).length);
  });

  it("hides manage workshops without isInstructor even with workshops.view", () => {
    const permissions = new Set<PermissionKey>([
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.WORKSHOPS_VIEW,
    ]);

    const filtered = filterPanelNavigation(
      MANAGER_PANEL_NAVIGATION,
      permissions,
      { isInstructor: false }
    );
    const paths = hrefs(filtered);

    expect(paths).toContain(ROUTES.MANAGER_DASHBOARD);
    expect(paths).not.toContain(ROUTES.MANAGER_WORKSHOPS);
  });

  it("keeps role-native links and workshops when instructor + workshops.view", () => {
    const permissions = new Set<PermissionKey>([PERMISSIONS.WORKSHOPS_VIEW]);
    const trainerNav: PanelNavigation = {
      items: [
        {
          title: "Dashboard",
          href: ROUTES.TRAINER_DASHBOARD,
          icon: "layout-dashboard",
        },
        {
          title: "Manage workshops",
          href: ROUTES.MANAGER_WORKSHOPS,
          icon: "presentation",
        },
      ],
    };

    const filtered = filterPanelNavigation(trainerNav, permissions, {
      isInstructor: true,
    });
    const paths = hrefs(filtered);

    expect(paths).toContain(ROUTES.TRAINER_DASHBOARD);
    expect(paths).toContain(ROUTES.MANAGER_WORKSHOPS);
  });
});
