import { ROUTES } from "@/lib/constants/routes";

export interface ManagerDashboardStat {
  label: string;
  value: number | string;
  accentClassName: string;
  change: string;
}

export interface ManagerDashboardQuickAction {
  label: string;
  description: string;
  href: string;
}

export interface ManagerDashboardScheduleItem {
  id: string;
  title: string;
  time: string;
  meta: string;
  status: "upcoming" | "in_progress" | "completed";
}

export interface ManagerDashboardActivityItem {
  id: string;
  title: string;
  description: string;
  time: string;
}

export interface ManagerDashboardAlertItem {
  id: string;
  title: string;
  value: string;
  description: string;
}

export const MANAGER_DASHBOARD_STATS_MOCK: ManagerDashboardStat[] = [
  {
    label: "Active students",
    value: 248,
    accentClassName: "border-l-sky-500",
    change: "+12 this month",
  },
  {
    label: "Active classes",
    value: 34,
    accentClassName: "border-l-emerald-500",
    change: "6 starting this week",
  },
  {
    label: "Subjects tracked",
    value: 15,
    accentClassName: "border-l-violet-500",
    change: "3 need updates",
  },
  {
    label: "Pending dues",
    value: "$4,350",
    accentClassName: "border-l-amber-500",
    change: "14 accounts overdue",
  },
];

export const MANAGER_DASHBOARD_QUICK_ACTIONS_MOCK: ManagerDashboardQuickAction[] = [
  {
    label: "Manage students",
    description: "Review enrollments, attendance, and performance.",
    href: ROUTES.MANAGER_STUDENTS,
  },
  {
    label: "Manage subjects",
    description: "Open subject details, classes, and grade summaries.",
    href: ROUTES.MANAGER_SUBJECTS,
  },
  {
    label: "Manage relationships",
    description: "Keep parent and guardian records up to date.",
    href: ROUTES.MANAGER_RELATIONSHIPS,
  },
  {
    label: "Open schedule",
    description: "Check today's classes, rooms, and teacher assignments.",
    href: ROUTES.MANAGER_SCHEDULE,
  },
];

export const MANAGER_DASHBOARD_SCHEDULE_MOCK: ManagerDashboardScheduleItem[] = [
  {
    id: "sched-1",
    title: "Advanced Algebra II",
    time: "09:00 - 10:30",
    meta: "Room B12 · Teacher: Omar Khaled",
    status: "completed",
  },
  {
    id: "sched-2",
    title: "Physics Lab",
    time: "11:00 - 12:30",
    meta: "Lab 3 · Teacher: Sara Nabil",
    status: "in_progress",
  },
  {
    id: "sched-3",
    title: "English Literature B",
    time: "14:00 - 15:30",
    meta: "Room A07 · Teacher: Dina Hossam",
    status: "upcoming",
  },
  {
    id: "sched-4",
    title: "Robotics Lab A",
    time: "16:00 - 17:30",
    meta: "Innovation Hall · Teacher: Ahmed Tariq",
    status: "upcoming",
  },
];

export const MANAGER_DASHBOARD_ACTIVITY_MOCK: ManagerDashboardActivityItem[] = [
  {
    id: "activity-1",
    title: "New student registered",
    description: "Mariam Salah was added and assigned to Biology Lab.",
    time: "12 min ago",
  },
  {
    id: "activity-2",
    title: "Relationship record updated",
    description: "Phone number changed for guardian of Yusuf Adel.",
    time: "45 min ago",
  },
  {
    id: "activity-3",
    title: "Subject links revised",
    description: "Reference links were updated for Computer Science.",
    time: "1 hr ago",
  },
  {
    id: "activity-4",
    title: "Payment posted",
    description: "Three overdue installments were marked as paid.",
    time: "2 hr ago",
  },
];

export const MANAGER_DASHBOARD_ALERTS_MOCK: ManagerDashboardAlertItem[] = [
  {
    id: "alert-1",
    title: "Attendance follow-up",
    value: "9 students",
    description: "Students below 70% attendance this week.",
  },
  {
    id: "alert-2",
    title: "Class capacity risk",
    value: "4 classes",
    description: "Classes that are close to full enrollment.",
  },
  {
    id: "alert-3",
    title: "Equipment requests",
    value: "7 open",
    description: "Borrow requests still waiting for approval.",
  },
];
