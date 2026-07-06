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
import { SITE } from "@/lib/config/site";
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
      <SidebarHeader className="group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col gap-0.5 px-2 py-1">
          <span className="text-xs font-medium uppercase tracking-wide text-sidebar-foreground/70">
            {SITE.name}
          </span>
          <span className="text-sm font-semibold text-sidebar-foreground">
            {label}
          </span>
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
