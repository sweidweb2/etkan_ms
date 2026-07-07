"use client";

import { SessionIdleMonitor } from "@/components/auth/session-idle-monitor";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AdminPanelSearch } from "@/components/panels/admin-panel-search";
import { PanelSidebar } from "@/components/panels/panel-sidebar";
import { PanelUserMenu } from "@/components/panels/panel-user-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { flattenPanelNavItems } from "@/lib/panels/flatten-nav";
import type { PanelNavigation, PanelVariant } from "@/types/panel";

type PanelShellProps = {
  variant: PanelVariant;
  label: string;
  navigation: PanelNavigation;
  displayName: string;
  children: React.ReactNode;
};

export function PanelShell({
  variant,
  label,
  navigation,
  displayName,
  children,
}: PanelShellProps) {
  const navItems = flattenPanelNavItems(navigation);

  return (
    <SidebarProvider>
      <SessionIdleMonitor />
      <PanelSidebar variant={variant} label={label} navigation={navigation} />
      <SidebarInset className="relative">
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
            <ThemeToggle />
            <PanelUserMenu displayName={displayName} />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
