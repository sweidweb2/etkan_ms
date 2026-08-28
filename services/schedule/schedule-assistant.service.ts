import {
  SCHEDULE_ASSISTANT_MAX_INSTRUCTORS,
  SCHEDULE_ASSISTANT_MAX_SLOTS,
  SCHEDULE_ASSISTANT_WEEKDAYS,
  type ScheduleAssistantWeekday,
} from "@/lib/constants/schedule-assistant";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getSundayWeekBounds,
  projectInstructorSlotDate,
} from "@/lib/manager/instructor-schedule-calendar";
import { ENTITY_SCHEDULE_TYPE_INSTRUCTOR } from "@/lib/validators/manager/instructor-schedule-slot";
import * as instructorSubjectCapabilityRepository from "@/repositories/instructor-subject-capability.repository";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as instructorSubjectRepository from "@/repositories/instructor-subject.repository";
import { assertPermission } from "@/services/auth/authorization.service";
import type {
  ScheduleAssistantCompactInstructor,
  ScheduleAssistantCompactMatrixRow,
  ScheduleAssistantCompactSlot,
  ScheduleAssistantInstructorsCatalog,
  ScheduleAssistantMatrixCatalog,
  ScheduleAssistantSlotsCatalog,
  ScheduleAssistantSubjectsCatalog,
} from "@/types/schedule-assistant";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const SUBJECTS_CATALOG_MAX = 200;

function normalizeUsername(value: string | null | undefined): string {
  return (value ?? "Unknown").trim() || "Unknown";
}

function sliceWithMeta<T>(
  rows: T[],
  max: number
): { rows: T[]; truncated: boolean; total: number } {
  const total = rows.length;
  return {
    rows: rows.slice(0, max),
    truncated: total > max,
    total,
  };
}

export async function listInstructorsCatalog(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ScheduleAssistantInstructorsCatalog> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  const result = await profileRepository.listInstructorProfiles(adminClient);
  if (result.error) {
    throw new Error(result.error.message);
  }

  const instructors: ScheduleAssistantCompactInstructor[] = (result.data ?? [])
    .map((profile) => ({
      i: profile.id,
      u: normalizeUsername(profile.username),
    }))
    .sort((a, b) => a.u.localeCompare(b.u));

  const capped = sliceWithMeta(instructors, SCHEDULE_ASSISTANT_MAX_INSTRUCTORS);
  return {
    instructors: capped.rows,
    truncated: capped.truncated,
    total: capped.total,
  };
}

export async function listSubjectsCatalog(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ScheduleAssistantSubjectsCatalog> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  const result =
    await instructorSubjectRepository.listInstructorSubjects(adminClient);
  if (result.error) {
    throw new Error(result.error.message);
  }

  const subjects = (result.data ?? [])
    .map((subject) => subject.name.trim())
    .filter(Boolean);

  const capped = sliceWithMeta(subjects, SUBJECTS_CATALOG_MAX);
  return {
    subjects: capped.rows,
    truncated: capped.truncated,
    total: capped.total,
  };
}

export async function listCapabilityMatrixCatalog(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ScheduleAssistantMatrixCatalog> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  const [subjectsResult, instructorsResult] = await Promise.all([
    instructorSubjectRepository.listInstructorSubjects(adminClient),
    profileRepository.listInstructorProfiles(adminClient),
  ]);

  if (subjectsResult.error) {
    throw new Error(subjectsResult.error.message);
  }
  if (instructorsResult.error) {
    throw new Error(instructorsResult.error.message);
  }

  const instructorRows = instructorsResult.data ?? [];
  const cappedInstructors = sliceWithMeta(
    instructorRows,
    SCHEDULE_ASSISTANT_MAX_INSTRUCTORS
  );
  const capabilitiesResult =
    await instructorSubjectCapabilityRepository.listCapabilitiesByUserIds(
      adminClient,
      cappedInstructors.rows.map((profile) => profile.id)
    );

  if (capabilitiesResult.error) {
    throw new Error(capabilitiesResult.error.message);
  }

  const subjectNameById = new Map(
    (subjectsResult.data ?? []).map((s) => [s.id, s.name] as const)
  );
  const usernameById = new Map(
    cappedInstructors.rows.map(
      (profile) =>
        [profile.id, normalizeUsername(profile.username)] as const
    )
  );

  const subjectsByUsername = new Map<string, Set<string>>();
  for (const pair of capabilitiesResult.data ?? []) {
    const username = usernameById.get(pair.user_id);
    const subjectName = subjectNameById.get(pair.subject_id);
    if (!username || !subjectName) {
      continue;
    }
    const set = subjectsByUsername.get(username) ?? new Set<string>();
    set.add(subjectName);
    subjectsByUsername.set(username, set);
  }

  const matrix: ScheduleAssistantCompactMatrixRow[] = [
    ...subjectsByUsername.entries(),
  ]
    .map(([u, sub]) => ({
      u,
      sub: [...sub].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => a.u.localeCompare(b.u));

  const capped = sliceWithMeta(matrix, SCHEDULE_ASSISTANT_MAX_INSTRUCTORS);
  return {
    matrix: capped.rows,
    truncated: cappedInstructors.truncated || capped.truncated,
    total: cappedInstructors.total,
  };
}

export async function listSlotsThisWeekCatalog(
  adminClient: Supabase,
  actorUserId: string | null
): Promise<ScheduleAssistantSlotsCatalog> {
  await assertPermission(
    adminClient,
    actorUserId,
    PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW
  );

  const today = new Date().toISOString().slice(0, 10);
  const { weekStart } = getSundayWeekBounds(today);

  const [slotsResult, instructorsResult] = await Promise.all([
    instructorScheduleSlotRepository.listInstructorScheduleSlotsByEntity(
      adminClient,
      ENTITY_SCHEDULE_TYPE_INSTRUCTOR
    ),
    profileRepository.listInstructorProfiles(adminClient),
  ]);

  if (slotsResult.error) {
    throw new Error(slotsResult.error.message);
  }
  if (instructorsResult.error) {
    throw new Error(instructorsResult.error.message);
  }

  const usernameById = new Map(
    (instructorsResult.data ?? []).map(
      (profile) =>
        [profile.id, normalizeUsername(profile.username)] as const
    )
  );

  const slots: ScheduleAssistantCompactSlot[] = [];

  for (const slot of slotsResult.data ?? []) {
    if (slot.type !== "free") {
      continue;
    }
    if (
      typeof slot.day_of_week !== "number" ||
      slot.day_of_week < 0 ||
      slot.day_of_week > 6
    ) {
      continue;
    }
    if (!usernameById.has(slot.record_id)) {
      continue;
    }

    const weekday = SCHEDULE_ASSISTANT_WEEKDAYS[
      slot.day_of_week
    ] as ScheduleAssistantWeekday;
    const projectedDate = projectInstructorSlotDate(
      weekStart,
      slot.day_of_week
    );

    slots.push({
      i: slot.record_id,
      u: usernameById.get(slot.record_id)!,
      d: projectedDate,
      w: weekday,
      s: slot.start_time.slice(0, 5),
      e: slot.end_time.slice(0, 5),
    });
  }

  slots.sort((a, b) => {
    const byDate = a.d.localeCompare(b.d);
    if (byDate !== 0) {
      return byDate;
    }
    const byStart = a.s.localeCompare(b.s);
    if (byStart !== 0) {
      return byStart;
    }
    return a.u.localeCompare(b.u);
  });

  const capped = sliceWithMeta(slots, SCHEDULE_ASSISTANT_MAX_SLOTS);
  return {
    slots: capped.rows,
    truncated: capped.truncated,
    total: capped.total,
  };
}
