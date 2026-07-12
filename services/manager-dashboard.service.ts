import { formatDistanceToNow } from "date-fns";
import { AUDIT_LOG_ACTION_LABELS } from "@/lib/constants/manager-audit-log-display";
import { BORROW_EQUIPMENT_STATUSES } from "@/lib/constants/manager-borrow-equipment-status";
import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { listAccountingStudentsForManager } from "@/services/accounting.service";
import { listAuditLogsForManager } from "@/services/audit-log.service";
import { listAllBorrowsForManager } from "@/services/borrow-equipment.service";
import { listClassesForManager } from "@/services/class.service";
import { listStudentsForManager } from "@/services/student.service";
import { listSubjectsForManager } from "@/services/subject.service";
import { listWeeklyScheduleSlotsForManager } from "@/services/weekly-schedule-slot.service";
import type { ManagerAuditLogRow } from "@/types/manager-audit-log";
import type {
  ManagerDashboardActivityItem,
  ManagerDashboardAlertItem,
  ManagerDashboardData,
  ManagerDashboardGlanceItem,
  ManagerDashboardScheduleItem,
  ManagerDashboardScheduleStatus,
  ManagerDashboardStat,
} from "@/types/manager-dashboard";
import type { ManagerWeeklyScheduleSession } from "@/types/manager-weekly-schedule";
import type { Database } from "@/types/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient<Database>;

const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function assertManagerRole(actorRole: RoleValue | null): void {
  if (actorRole !== ROLES.MANAGER) {
    throw new Error("Unauthorized.");
  }
}

function toMinutes(timeHhMm: string): number {
  const [hours, minutes] = timeHhMm.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function getScheduleStatus(
  startTime: string,
  endTime: string,
  now: Date
): ManagerDashboardScheduleStatus {
  const current =
    now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(startTime);
  const end = toMinutes(endTime);

  if (current < start) {
    return "upcoming";
  }

  if (current >= end) {
    return "completed";
  }

  return "in_progress";
}

function slotsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return toMinutes(startA) < toMinutes(endB) && toMinutes(startB) < toMinutes(endA);
}

function countTodayRoomConflicts(
  todaySlots: ManagerWeeklyScheduleSession[]
): number {
  let conflicts = 0;

  for (let i = 0; i < todaySlots.length; i += 1) {
    for (let j = i + 1; j < todaySlots.length; j += 1) {
      const left = todaySlots[i]!;
      const right = todaySlots[j]!;

      if (
        left.room.trim().toLowerCase() === right.room.trim().toLowerCase() &&
        slotsOverlap(left.startTime, left.endTime, right.startTime, right.endTime)
      ) {
        conflicts += 1;
      }
    }
  }

  return conflicts;
}

function buildStats(input: {
  activeStudents: number;
  studentsThisMonth: number;
  activeClasses: number;
  classesStartingThisWeek: number;
  subjectsCount: number;
  subjectsNeedingLinks: number;
  pendingDueTotal: number;
  overdueAccounts: number;
}): ManagerDashboardStat[] {
  return [
    {
      label: "Active students",
      value: input.activeStudents,
      accentClassName: "border-l-sky-500",
      change:
        input.studentsThisMonth > 0
          ? `+${input.studentsThisMonth} this month`
          : "No new students this month",
    },
    {
      label: "Active classes",
      value: input.activeClasses,
      accentClassName: "border-l-emerald-500",
      change:
        input.classesStartingThisWeek > 0
          ? `${input.classesStartingThisWeek} scheduled`
          : "No scheduled classes",
    },
    {
      label: "Subjects tracked",
      value: input.subjectsCount,
      accentClassName: "border-l-violet-500",
      change:
        input.subjectsNeedingLinks > 0
          ? `${input.subjectsNeedingLinks} need link updates`
          : "All subjects have links",
    },
    {
      label: "Pending dues",
      value: formatAccountCurrency(input.pendingDueTotal),
      accentClassName: "border-l-amber-500",
      change:
        input.overdueAccounts > 0
          ? `${input.overdueAccounts} accounts with balance due`
          : "No outstanding balances",
    },
  ];
}

function buildAlerts(input: {
  paymentAlerts: number;
  overdueAccounts: number;
  openBorrows: number;
}): ManagerDashboardAlertItem[] {
  return [
    {
      id: "payment-alerts",
      title: "Payment follow-up",
      value: `${input.paymentAlerts}`,
      description:
        input.paymentAlerts === 1
          ? "Account with an open payment alert."
          : "Accounts with open payment alerts.",
    },
    {
      id: "balance-due",
      title: "Balance due",
      value: `${input.overdueAccounts}`,
      description:
        input.overdueAccounts === 1
          ? "Student account still has an unpaid balance."
          : "Student accounts still have unpaid balances.",
    },
    {
      id: "open-borrows",
      title: "Equipment on loan",
      value: `${input.openBorrows}`,
      description:
        input.openBorrows === 1
          ? "Borrow record still marked as borrowed."
          : "Borrow records still marked as borrowed.",
    },
  ];
}

function buildTodaySchedule(
  slots: ManagerWeeklyScheduleSession[],
  now: Date
): ManagerDashboardScheduleItem[] {
  const todayName = WEEKDAY_NAMES[now.getDay()];

  return slots
    .filter((slot) => slot.day === todayName)
    .sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime))
    .map((slot) => ({
      id: slot.id,
      title: slot.className,
      time: `${slot.startTime} - ${slot.endTime}`,
      meta: `Room ${slot.room} · Teacher: ${slot.teacherName}`,
      status: getScheduleStatus(slot.startTime, slot.endTime, now),
    }));
}

function buildGlance(input: {
  newStudentsLast7Days: number;
  subjectsWithActiveClasses: number;
  roomConflictsToday: number;
}): ManagerDashboardGlanceItem[] {
  return [
    {
      id: "enrollment-trend",
      title: "Enrollment trend",
      description:
        input.newStudentsLast7Days === 1
          ? "1 new student registered in the last 7 days."
          : `${input.newStudentsLast7Days} new students registered in the last 7 days.`,
      tone: "sky",
    },
    {
      id: "academic-coverage",
      title: "Academic coverage",
      description:
        input.subjectsWithActiveClasses === 1
          ? "1 subject has at least one active or scheduled class."
          : `${input.subjectsWithActiveClasses} subjects have at least one active or scheduled class.`,
      tone: "violet",
    },
    {
      id: "schedule-health",
      title: "Schedule health",
      description:
        input.roomConflictsToday === 0
          ? "No room conflicts detected for today's classes."
          : `${input.roomConflictsToday} room conflict${input.roomConflictsToday === 1 ? "" : "s"} detected for today.`,
      tone: input.roomConflictsToday === 0 ? "emerald" : "amber",
    },
  ];
}

function formatActivityTime(createdAt: string): string {
  return formatDistanceToNow(new Date(createdAt), { addSuffix: true });
}

function buildActivity(logs: ManagerAuditLogRow[]): ManagerDashboardActivityItem[] {
  return logs.slice(0, 4).map((log) => {
    const actionLabel = AUDIT_LOG_ACTION_LABELS[log.action] ?? "Update";
    const tableLabel = log.table_name?.replaceAll("_", " ") ?? "record";
    const note =
      typeof log.metadata?.note === "string" ? log.metadata.note : null;

    return {
      id: log.id,
      title: `${actionLabel} · ${tableLabel}`,
      description:
        note ??
        `${log.user_label} recorded a ${actionLabel.toLowerCase()} on ${tableLabel}.`,
      time: formatActivityTime(log.created_at),
    };
  });
}

export async function getManagerDashboardForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  now: Date = new Date()
): Promise<ManagerDashboardData> {
  assertManagerRole(actorRole);

  const [
    students,
    classes,
    subjects,
    accountingStudents,
    scheduleSlots,
    borrows,
    auditLogs,
  ] = await Promise.all([
    listStudentsForManager(adminClient, actorRole),
    listClassesForManager(adminClient, actorRole),
    listSubjectsForManager(adminClient, actorRole),
    listAccountingStudentsForManager(adminClient, actorRole),
    listWeeklyScheduleSlotsForManager(adminClient, actorRole),
    listAllBorrowsForManager(adminClient, actorRole),
    listAuditLogsForManager(adminClient, actorRole),
  ]);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const activeStudents = students.filter(
    (student) => student.status === STUDENT_STATUSES.ACTIVE
  ).length;
  const studentsThisMonth = students.filter(
    (student) => new Date(student.created_at) >= monthStart
  ).length;
  const newStudentsLast7Days = students.filter(
    (student) => new Date(student.created_at) >= weekAgo
  ).length;

  const activeClasses = classes.filter(
    (row) =>
      row.status === CLASS_STATUSES.IN_PROGRESS ||
      row.status === CLASS_STATUSES.SCHEDULED
  ).length;
  const classesStartingThisWeek = classes.filter(
    (row) => row.status === CLASS_STATUSES.SCHEDULED
  ).length;

  const subjectsNeedingLinks = subjects.filter(
    (subject) =>
      !subject.syllabus_link || !subject.reference_link || !subject.handout_link
  ).length;

  const activeClassSubjectIds = new Set(
    classes
      .filter(
        (row) =>
          row.status === CLASS_STATUSES.IN_PROGRESS ||
          row.status === CLASS_STATUSES.SCHEDULED
      )
      .map((row) => row.subject_id)
      .filter(Boolean)
  );

  const pendingDueTotal = accountingStudents.reduce(
    (sum, row) => sum + Math.max(Number(row.balance_due ?? 0), 0),
    0
  );
  const overdueAccounts = accountingStudents.filter(
    (row) => Number(row.balance_due ?? 0) > 0
  ).length;
  const paymentAlerts = accountingStudents.filter((row) => row.payment_alert)
    .length;

  const openBorrows = borrows.filter(
    (row) => row.status === BORROW_EQUIPMENT_STATUSES.BORROWED
  ).length;

  const schedule = buildTodaySchedule(scheduleSlots, now);
  const roomConflictsToday = countTodayRoomConflicts(
    scheduleSlots.filter((slot) => slot.day === WEEKDAY_NAMES[now.getDay()])
  );

  return {
    stats: buildStats({
      activeStudents,
      studentsThisMonth,
      activeClasses,
      classesStartingThisWeek,
      subjectsCount: subjects.length,
      subjectsNeedingLinks,
      pendingDueTotal,
      overdueAccounts,
    }),
    alerts: buildAlerts({
      paymentAlerts,
      overdueAccounts,
      openBorrows,
    }),
    schedule,
    glance: buildGlance({
      newStudentsLast7Days,
      subjectsWithActiveClasses: activeClassSubjectIds.size,
      roomConflictsToday,
    }),
    activity: buildActivity(auditLogs),
  };
}
