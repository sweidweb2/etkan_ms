import { formatDistanceToNow, format } from "date-fns";
import { AUDIT_LOG_ACTION_LABELS } from "@/lib/constants/manager-audit-log-display";
import { BORROW_EQUIPMENT_STATUSES } from "@/lib/constants/manager-borrow-equipment-status";
import { CLASS_STATUSES } from "@/lib/constants/manager-class-status";
import { STUDENT_STATUSES } from "@/lib/constants/manager-student-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { WEEKLY_SCHEDULE_SLOT_TYPE_LABELS } from "@/lib/validators/manager/weekly-schedule-slot";
import * as borrowEquipmentRepository from "@/repositories/borrow-equipment.repository";
import * as classRepository from "@/repositories/class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import * as weeklyScheduleSlotRepository from "@/repositories/weekly-schedule-slot.repository";
import {
  assertPermission,
  hasPermission,
} from "@/services/authorization.service";
import { listAuditLogsForManager } from "@/services/audit-log.service";
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

function toMinutes(timeHhMm: string): number {
  const [hours, minutes] = timeHhMm.split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function getScheduleStatus(
  startTime: string,
  endTime: string,
  now: Date
): ManagerDashboardScheduleStatus {
  const current = now.getHours() * 60 + now.getMinutes();
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

function countTodayOverlappingSlots(
  todaySlots: ManagerWeeklyScheduleSession[]
): number {
  let overlaps = 0;

  for (let i = 0; i < todaySlots.length; i += 1) {
    for (let j = i + 1; j < todaySlots.length; j += 1) {
      const left = todaySlots[i]!;
      const right = todaySlots[j]!;

      if (
        slotsOverlap(left.startTime, left.endTime, right.startTime, right.endTime)
      ) {
        overlaps += 1;
      }
    }
  }

  return overlaps;
}

function buildStats(input: {
  activeStudents: number;
  studentsThisMonth: number;
  activeClasses: number;
  classesStartingThisWeek: number;
  subjectsCount: number;
  subjectsNeedingLinks: number;
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
  ];
}

function buildAlerts(input: {
  openBorrows: number;
}): ManagerDashboardAlertItem[] {
  return [
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
  return slots
    .sort((left, right) => toMinutes(left.startTime) - toMinutes(right.startTime))
    .map((slot) => ({
      id: slot.id,
      title: slot.name,
      time: `${slot.startTime} - ${slot.endTime}`,
      meta: WEEKLY_SCHEDULE_SLOT_TYPE_LABELS[slot.type],
      status: getScheduleStatus(slot.startTime, slot.endTime, now),
    }));
}

function buildGlance(input: {
  newStudentsLast7Days: number;
  subjectsWithActiveClasses: number;
  overlappingSlotsToday: number;
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
        input.overlappingSlotsToday === 0
          ? "No overlapping slots detected for today."
          : `${input.overlappingSlotsToday} overlapping slot pair${input.overlappingSlotsToday === 1 ? "" : "s"} detected for today.`,
      tone: input.overlappingSlotsToday === 0 ? "emerald" : "amber",
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

function mapSlotRecordToSession(record: {
  id: string;
  name: string;
  type: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  color: string;
}): ManagerWeeklyScheduleSession {
  return {
    id: record.id,
    name: record.name,
    type: record.type as ManagerWeeklyScheduleSession["type"],
    slotDate: record.slot_date,
    startTime: record.start_time.slice(0, 5),
    endTime: record.end_time.slice(0, 5),
    color: record.color,
  };
}

export async function getManagerDashboardForManager(
  adminClient: Supabase,
  actorUserId: string | null,
  now: Date = new Date()
): Promise<ManagerDashboardData> {
  await assertPermission(adminClient, actorUserId, PERMISSIONS.DASHBOARD_VIEW);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const todayIso = format(now, "yyyy-MM-dd");

  const [
    canStudents,
    canClasses,
    canSubjects,
    canSchedule,
    canBorrows,
    canLogs,
  ] = await Promise.all([
    hasPermission(adminClient, actorUserId ?? "", PERMISSIONS.STUDENTS_VIEW),
    hasPermission(adminClient, actorUserId ?? "", PERMISSIONS.CLASSES_VIEW),
    hasPermission(adminClient, actorUserId ?? "", PERMISSIONS.SUBJECTS_VIEW),
    hasPermission(adminClient, actorUserId ?? "", PERMISSIONS.SCHEDULE_VIEW),
    hasPermission(
      adminClient,
      actorUserId ?? "",
      PERMISSIONS.EQUIPMENT_VIEW_BORROWS
    ),
    hasPermission(adminClient, actorUserId ?? "", PERMISSIONS.LOGS_VIEW),
  ]);

  const [
    studentStatsResult,
    classStatsResult,
    subjectStatsResult,
    scheduleSlotsResult,
    openBorrowsResult,
    auditLogs,
  ] = await Promise.all([
    canStudents
      ? studentProfileRepository.countStudentDashboardStats(adminClient, {
          activeStatus: STUDENT_STATUSES.ACTIVE,
          monthStartIso: monthStart.toISOString(),
          weekAgoIso: weekAgo.toISOString(),
        })
      : Promise.resolve({
          data: {
            activeCount: 0,
            createdThisMonth: 0,
            createdLast7Days: 0,
          },
          error: null,
        }),
    canClasses
      ? classRepository.countClassDashboardStats(adminClient, {
          inProgressStatus: CLASS_STATUSES.IN_PROGRESS,
          scheduledStatus: CLASS_STATUSES.SCHEDULED,
        })
      : Promise.resolve({
          data: {
            inProgressCount: 0,
            scheduledCount: 0,
            activeOrScheduledSubjectCount: 0,
          },
          error: null,
        }),
    canSubjects
      ? subjectRepository.countSubjectDashboardStats(adminClient)
      : Promise.resolve({
          data: { total: 0, needingLinks: 0 },
          error: null,
        }),
    canSchedule
      ? weeklyScheduleSlotRepository.listWeeklyScheduleSlotsInDateRange(
          adminClient,
          todayIso,
          todayIso
        )
      : Promise.resolve({ data: [], error: null }),
    canBorrows
      ? borrowEquipmentRepository.countBorrowsByStatus(
          adminClient,
          BORROW_EQUIPMENT_STATUSES.BORROWED
        )
      : Promise.resolve({ count: 0, error: null }),
    canLogs
      ? listAuditLogsForManager(adminClient, actorUserId, { limit: 4 })
      : Promise.resolve([] as ManagerAuditLogRow[]),
  ]);

  if (studentStatsResult.error) {
    throw new Error(studentStatsResult.error.message);
  }
  if (classStatsResult.error) {
    throw new Error(classStatsResult.error.message);
  }
  if (subjectStatsResult.error) {
    throw new Error(subjectStatsResult.error.message);
  }
  if (scheduleSlotsResult.error) {
    throw new Error(scheduleSlotsResult.error.message);
  }
  if (openBorrowsResult.error) {
    throw new Error(openBorrowsResult.error.message);
  }

  const studentStats = studentStatsResult.data!;
  const classStats = classStatsResult.data!;
  const subjectStats = subjectStatsResult.data!;

  const scheduleSlots = (scheduleSlotsResult.data ?? []).map((record) => {
    const row = record as {
      id: string;
      name: string;
      type: string;
      slot_date: string;
      start_time: string;
      end_time: string;
      color: string;
    };
    return mapSlotRecordToSession(row);
  });

  const schedule = buildTodaySchedule(scheduleSlots, now);
  const overlappingSlotsToday = countTodayOverlappingSlots(scheduleSlots);

  return {
    stats: buildStats({
      activeStudents: studentStats.activeCount,
      studentsThisMonth: studentStats.createdThisMonth,
      activeClasses: classStats.inProgressCount + classStats.scheduledCount,
      classesStartingThisWeek: classStats.scheduledCount,
      subjectsCount: subjectStats.total,
      subjectsNeedingLinks: subjectStats.needingLinks,
    }),
    alerts: buildAlerts({
      openBorrows: openBorrowsResult.count ?? 0,
    }),
    schedule,
    glance: buildGlance({
      newStudentsLast7Days: studentStats.createdLast7Days,
      subjectsWithActiveClasses: classStats.activeOrScheduledSubjectCount,
      overlappingSlotsToday,
    }),
    activity: buildActivity(auditLogs),
  };
}
