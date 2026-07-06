"use client";

import {
  Bell,
  BookOpen,
  Calculator,
  CalendarDays,
  ChartColumn,
  DatabaseBackup,
  FileText,
  Layers,
  LayoutDashboard,
  Library,
  Package,
  School,
  Server,
  Settings,
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
  library: Library,
  calculator: Calculator,
  bell: Bell,
  school: School,
  package: Package,
  layers: Layers,
  settings: Settings,
  reports: FileText,
  analytics: ChartColumn,
  backup: DatabaseBackup,
};
