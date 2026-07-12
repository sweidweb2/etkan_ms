export type ManagerDashboardScheduleStatus =
  | "upcoming"
  | "in_progress"
  | "completed";

export type ManagerDashboardStat = {
  label: string;
  value: number | string;
  accentClassName: string;
  change: string;
};

export type ManagerDashboardQuickAction = {
  label: string;
  description: string;
  href: string;
};

export type ManagerDashboardScheduleItem = {
  id: string;
  title: string;
  time: string;
  meta: string;
  status: ManagerDashboardScheduleStatus;
};

export type ManagerDashboardActivityItem = {
  id: string;
  title: string;
  description: string;
  time: string;
};

export type ManagerDashboardAlertItem = {
  id: string;
  title: string;
  value: string;
  description: string;
};

export type ManagerDashboardGlanceItem = {
  id: string;
  title: string;
  description: string;
  tone: "sky" | "violet" | "emerald" | "amber";
};

export type ManagerDashboardData = {
  stats: ManagerDashboardStat[];
  alerts: ManagerDashboardAlertItem[];
  schedule: ManagerDashboardScheduleItem[];
  glance: ManagerDashboardGlanceItem[];
  activity: ManagerDashboardActivityItem[];
};
