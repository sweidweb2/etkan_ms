"use client";

import { usePathname } from "next/navigation";
import { PermissionsProvider } from "@/components/auth/permissions-provider";
import { SessionIdleMonitor } from "@/components/auth/session-idle-monitor";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AdminPanelSearch } from "@/components/panels/admin-panel-search";
import { PanelNotificationsBell } from "@/components/panels/panel-notifications-bell";
import {
  PanelHeaderHeading,
  PanelPageHeaderProvider,
} from "@/components/panels/panel-page-header";
import { PanelSessionAvatarProvider } from "@/components/panels/panel-session-avatar";
import { PanelSidebar } from "@/components/panels/panel-sidebar";
import { PanelUserMenu } from "@/components/panels/panel-user-menu";
import { StudentPanelNavbar } from "@/components/panels/student-panel-navbar";
import { ThemeToggle } from "@/components/theme-toggle";
import { PERMISSIONS, type PermissionKey } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { resolveActivePanelNavItem } from "@/lib/panels/active-nav";
import { flattenPanelNavItems } from "@/lib/panels/flatten-nav";
import { cn } from "@/lib/utils";
import type { PanelNavigation, PanelVariant } from "@/types/panel";

type PanelShellProps = {
  variant: PanelVariant;
  label: string;
  navigation: PanelNavigation;
  displayName: string;
  avatarUrl?: string | null;
  permissions?: readonly PermissionKey[];
  children: React.ReactNode;
};

export function PanelShell({
  variant,
  label,
  navigation,
  displayName,
  avatarUrl = null,
  permissions = [],
  children,
}: PanelShellProps) {
  const pathname = usePathname();
  const navItems = flattenPanelNavItems(navigation);
  const activeNavItem = resolveActivePanelNavItem(pathname, navItems);
  const canViewNotifications = permissions.includes(
    PERMISSIONS.NOTIFICATIONS_VIEW
  );

  if (variant === "student" || variant === "teacher") {
    const isTeacher = variant === "teacher";
    const isStudent = variant === "student";

    return (
      <PermissionsProvider permissions={permissions}>
        <PanelSessionAvatarProvider avatarUrl={avatarUrl}>
          <div className="flex h-svh w-full flex-col overflow-hidden bg-background">
            <SessionIdleMonitor />
            <StudentPanelNavbar
              navigation={navigation}
              displayName={displayName}
              permissions={permissions}
              homeHref={
                isTeacher ? ROUTES.TEACHER_CLASSES : ROUTES.STUDENT_ROOT
              }
              homeLabel={isTeacher ? "Teacher home" : "Student home"}
              navLabel={isTeacher ? "Teacher" : "Student"}
              menuId={isTeacher ? "teacher-panel-menu" : "student-panel-menu"}
              settingsHref={isTeacher ? ROUTES.TEACHER_SETTINGS : undefined}
              showTeacherSearch={isTeacher}
              mobileNavMode={isStudent ? "bottom" : "hamburger"}
            />
            <div
              className={cn(
                "flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto",
                isStudent &&
                  "max-md:pb-[calc(4rem+max(0.5rem,env(safe-area-inset-bottom)))]"
              )}
            >
              <div className="@container/panel flex w-full min-w-0 max-w-full flex-1 flex-col gap-4 p-4 md:p-6">
                {children}
              </div>
            </div>
          </div>
        </PanelSessionAvatarProvider>
      </PermissionsProvider>
    );
  }

  return (
    <PermissionsProvider permissions={permissions}>
      <PanelSessionAvatarProvider avatarUrl={avatarUrl}>
        <SidebarProvider>
          <SessionIdleMonitor />
          <PanelSidebar
            variant={variant}
            label={label}
            navigation={navigation}
          />
          <SidebarInset className="relative min-w-0 overflow-x-hidden">
            <PanelPageHeaderProvider>
              <header className="grid h-14 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-border px-4">
                <div className="flex min-w-0 items-center gap-2">
                  <SidebarTrigger />
                  <Separator orientation="vertical" className="mr-2 h-4" />
                  <PanelHeaderHeading
                    fallbackTitle={activeNavItem?.title ?? label}
                  />
                </div>
                <AdminPanelSearch
                  pages={navItems}
                  className="w-full max-w-md justify-self-center"
                />
                <div className="flex items-center gap-2 justify-self-end">
                  {canViewNotifications ? <PanelNotificationsBell /> : null}
                  <ThemeToggle />
                  <PanelUserMenu displayName={displayName} />
                </div>
              </header>
              <div className="@container/panel flex min-w-0 max-w-full flex-1 flex-col gap-4 overflow-x-hidden p-4 md:p-6">
                {children}
              </div>
            </PanelPageHeaderProvider>
          </SidebarInset>
        </SidebarProvider>
      </PanelSessionAvatarProvider>
    </PermissionsProvider>
  );
}
