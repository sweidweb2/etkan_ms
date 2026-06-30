"use client";

import { Suspense } from "react";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AdminPanelSearch } from "@/components/panels/admin-panel-search";
import { PanelSidebar } from "@/components/panels/panel-sidebar";
import { PanelTopLoader } from "@/components/loaders/panel-top-loader";
import { ThemeToggle } from "@/components/theme-toggle";
import type { PanelNavItem, PanelVariant } from "@/types/panel";

type PanelShellProps = {
  variant: PanelVariant;
  label: string;
  navItems: PanelNavItem[];
  children: React.ReactNode;
};

export function PanelShell({
  variant,
  label,
  navItems,
  children,
}: PanelShellProps) {
  return (
    <SidebarProvider>
      <PanelSidebar variant={variant} label={label} navItems={navItems} />
      <SidebarInset className="relative">
        <Suspense fallback={null}>
          <PanelTopLoader />
        </Suspense>
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
          <div className="justify-self-end">
            <ThemeToggle />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
