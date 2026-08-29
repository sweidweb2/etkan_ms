"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {
  PanelCollapsibleNavGroup,
  PanelNavMenu,
} from "@/components/panels/panel-collapsible-nav-group";
import { AppLogo } from "@/components/brand/app-logo";
import type { PanelNavigation, PanelVariant } from "@/types/panel";

type PanelSidebarProps = {
  variant: PanelVariant;
  label: string;
  navigation: PanelNavigation;
};

export function PanelSidebar({ variant, label, navigation }: PanelSidebarProps) {
  const topLevelItems = navigation.items ?? [];
  const groups = navigation.groups ?? [];

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <div className="flex items-center px-2 py-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <AppLogo
            shape="mark"
            tone="auto"
            height={24}
            className="hidden group-data-[collapsible=icon]:inline-flex"
          />
          <div className="flex min-w-0 flex-col gap-1 group-data-[collapsible=icon]:hidden">
            <AppLogo tone="auto" height={20} />
            <span className="truncate text-sm font-semibold text-sidebar-foreground">
              {label}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {topLevelItems.length > 0 ? (
          <SidebarGroup>
            {groups.length === 0 ? (
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <PanelNavMenu items={topLevelItems} />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
        {groups.map((group) => (
          <PanelCollapsibleNavGroup
            key={group.id}
            group={group}
            panelVariant={variant}
          />
        ))}
      </SidebarContent>
      <p className="px-2 pb-4 text-center text-xs capitalize text-sidebar-foreground/60 group-data-[collapsible=icon]:hidden">
        {variant} panel
      </p>
    </Sidebar>
  );
}
