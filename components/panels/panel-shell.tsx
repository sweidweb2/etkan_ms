"use client";

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
import { PanelSidebar } from "@/components/panels/panel-sidebar";
import { PanelUserMenu } from "@/components/panels/panel-user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { PERMISSIONS, type PermissionKey } from "@/lib/constants/permissions";
import { flattenPanelNavItems } from "@/lib/panels/flatten-nav";
import type { PanelNavigation, PanelVariant } from "@/types/panel";

type PanelShellProps = {
  variant: PanelVariant;
  label: string;
  navigation: PanelNavigation;
  displayName: string;
  permissions?: readonly PermissionKey[];
  children: React.ReactNode;
};

export function PanelShell({
  variant,
  label,
  navigation,
  displayName,
  permissions = [],
  children,
}: PanelShellProps) {
  const navItems = flattenPanelNavItems(navigation);
  const canViewNotifications = permissions.includes(
    PERMISSIONS.NOTIFICATIONS_VIEW
  );

  return (
    <PermissionsProvider permissions={permissions}>
      <SidebarProvider>
        <SessionIdleMonitor />
        <PanelSidebar variant={variant} label={label} navigation={navigation} />
        <SidebarInset className="relative min-w-0 overflow-x-hidden">
          <header className="grid h-14 shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-border px-4">
            <div className="flex items-center gap-2 justify-self-start">
              <SidebarTrigger />
              <Separator orientation="vertical" className="mr-2 h-4" />
              <span className="text-sm font-medium">{label}</span>
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
          <div className="flex min-w-0 max-w-full flex-1 flex-col gap-4 overflow-x-hidden p-4 md:p-6">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </PermissionsProvider>
  );
}
