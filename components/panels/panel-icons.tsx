"use client";

import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  Server,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { PanelNavIconKey } from "@/types/panel";

export const PANEL_ICONS: Record<PanelNavIconKey, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  users: Users,
  "book-open": BookOpen,
  "calendar-days": CalendarDays,
  server: Server,
};
