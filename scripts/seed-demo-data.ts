/**
 * Full local demo graph for Etkan MS panels + public surfaces.
 *
 * Idempotent: safe to re-run. Prefer enroll / payment / task RPCs so sync
 * side-effects match production logic.
 *
 * Prerequisites: migrations applied, then usually:
 *   npm run seed:rbac && npm run seed:admin && npm run seed:manager
 */
import { pickClassCardGradientKey } from "@/lib/constants/class-card-gradients";
import {
  GUEST_CURRENT_STATUSES,
  GUEST_INTERESTED_SERVICES,
  GUEST_PIPELINE_STATUSES,
} from "@/lib/constants/guest";
import {
  PERMISSION_DEFINITIONS,
  type PermissionFeature,
  type PermissionKey,
} from "@/lib/constants/permissions";
import {
  CLASS_TREE_SEED_FEATURES,
  TEACHER_SEED_PERMISSIONS,
} from "@/lib/constants/role-seed-permissions";
import { WORKSHOP_OFFERING_TYPES, WORKSHOP_INSTRUCTOR_ROLES, WORKSHOP_SESSION_STATUSES, WORKSHOP_WAGE_TYPES } from "@/lib/constants/manager-workshop-display";
import { WORKSHOP_STATUSES } from "@/lib/constants/manager-workshop-status";
import {
  REGISTRATION_EDUCATION_LEVELS,
  REGISTRATION_REFERRAL_SOURCES,
} from "@/lib/constants/public-registration";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { TEAM_STATUSES } from "@/lib/constants/team";
import {
  FINANCIAL_ADJUSTMENT_TYPES,
  FINANCIAL_ADJUSTMENT_VALUE_TYPES,
  PAYMENT_METHODS,
  PAYMENT_SCHEDULE_STATUSES,
  TRANSACTION_TYPES,
} from "@/lib/manager/accounting/constants";
import { generateSemesterCode } from "@/lib/manager/generate-semester-code";
import {
  ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
  ENTITY_SCHEDULE_TYPE_WORKSHOP,
} from "@/lib/validators/manager/instructor-schedule-slot";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as authRepository from "@/repositories/auth.repository";
import * as blogRepository from "@/repositories/blog.repository";
import * as borrowEquipmentRepository from "@/repositories/borrow-equipment.repository";
import * as classRepository from "@/repositories/class.repository";
import * as classTaskRepository from "@/repositories/class-task.repository";
import * as classTeacherRepository from "@/repositories/class-teacher.repository";
import * as equipmentRepository from "@/repositories/equipment.repository";
import * as finalExamRepository from "@/repositories/final-exam.repository";
import * as guestRepository from "@/repositories/guest.repository";
import * as guestStatusEventRepository from "@/repositories/guest-status-event.repository";
import * as instructorScheduleSlotRepository from "@/repositories/instructor-schedule-slot.repository";
import * as instructorSubjectCapabilityRepository from "@/repositories/instructor-subject-capability.repository";
import * as instructorSubjectRepository from "@/repositories/instructor-subject.repository";
import * as paymentPhaseRepository from "@/repositories/payment-phase.repository";
import * as permissionRepository from "@/repositories/permission.repository";
import * as profileRepository from "@/repositories/profile.repository";
import * as publicProjectRepository from "@/repositories/public-project.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as sessionRepository from "@/repositories/session.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentFinancialAdjustmentRepository from "@/repositories/student-financial-adjustment.repository";
import * as studentPaymentRepository from "@/repositories/student-payment.repository";
import * as studentPaymentPhaseRepository from "@/repositories/student-payment-phase.repository";
import * as studentPaymentPhaseClearanceRepository from "@/repositories/student-payment-phase-clearance.repository";
import * as studentPaymentScheduleRepository from "@/repositories/student-payment-schedule.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import * as subjectRepository from "@/repositories/subject.repository";
import * as subjectTaskRepository from "@/repositories/subject-task.repository";
import * as teamRepository from "@/repositories/team.repository";
import * as transactionRepository from "@/repositories/transaction.repository";
import * as workshopRepository from "@/repositories/workshop.repository";
import * as workshopInstructorRepository from "@/repositories/workshop-instructor.repository";
import * as workshopPaymentRepository from "@/repositories/workshop-payment.repository";
import * as workshopSessionRepository from "@/repositories/workshop-session.repository";
import { createSeedAdminClient } from "@/scripts/lib/create-seed-admin-client";
import { ensureStudentRegistration } from "@/services/auth/profile.service";
import { syncAuthUserRole } from "@/services/auth/role.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

const DEMO_MARKER = "Demo Fall 2026";
const DEMO_SPRING = "Demo Spring 2027";
const DEMO_PHASE_NAME = "Demo Fall Tuition";
const DEMO_LAB_PHASE_NAME = "Demo Fall Lab Fee";
const DEMO_SPRING_PHASE_NAME = "Demo Spring Tuition";
const DEMO_WORKSHOP_NAME = "Demo Intro to Robotics";
const DEMO_TEAM_NAME = "Demo Cohort A";

const FALL_TUITION_AMOUNT = 1200;
const FALL_UPFRONT_AMOUNT = 300;
const FALL_LAB_FEE_AMOUNT = 50;
const SPRING_TUITION_AMOUNT = 1100;
const SPRING_UPFRONT_AMOUNT = 250;

function getDefaultPassword(): string {
  return process.env.SEED_DEMO_PASSWORD ?? "Demo123!";
}

function isoDate(daysFromToday: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString().slice(0, 10);
}

function isoDateTime(daysFromToday: number, hourUtc = 9): string {
  const d = new Date();
  d.setUTCHours(hourUtc, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + daysFromToday);
  return d.toISOString();
}

type SeedStaff = {
  username: string;
  email: string;
  fullName: string;
  role: RoleValue;
};

type SeedTeacher = {
  username: string;
  email: string;
  fullName: string;
  isInstructor?: boolean;
  isMentor?: boolean;
};

type SeedStudent = {
  username: string;
  email: string;
  fullName: string;
  phone?: string;
};

async function findOrCreateSemester(
  client: Supabase,
  input: { name: string }
): Promise<{ id: string; semester_code: string }> {
  const existing = await semesterRepository.findSemesterByName(client, input.name);
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) {
    const full = await semesterRepository.findSemesterById(
      client,
      existing.data.id
    );
    if (full.error) throw new Error(full.error.message);
    if (!full.data) {
      throw new Error(`Semester "${input.name}" vanished after lookup.`);
    }
    return { id: full.data.id, semester_code: full.data.semester_code };
  }

  let semesterCode = generateSemesterCode();
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const codeCheck = await semesterRepository.findSemesterByCode(
      client,
      semesterCode
    );
    if (codeCheck.error) throw new Error(codeCheck.error.message);
    if (!codeCheck.data) break;
    semesterCode = generateSemesterCode();
  }

  const { data, error } = await semesterRepository.createSemester(client, {
    name: input.name,
    semester_code: semesterCode,
  });

  if (error || !data) {
    throw new Error(error?.message ?? `Unable to create semester "${input.name}".`);
  }

  return { id: data.id, semester_code: data.semester_code };
}

async function findOrCreateSubject(
  client: Supabase,
  input: { name: string; nbSessions: number }
) {
  const existing = await subjectRepository.findSubjectByName(client, input.name);
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data.id;

  const { data, error } = await subjectRepository.createSubject(client, {
    name: input.name,
    nb_sessions: input.nbSessions,
  });

  if (error || !data) {
    throw new Error(error?.message ?? `Unable to create subject "${input.name}".`);
  }

  return data.id;
}

async function findOrCreateClass(
  client: Supabase,
  input: {
    name: string;
    subjectId: string;
    semesterId: string;
    status: string;
  }
) {
  const { data: classes, error } = await classRepository.listClassesBySemesterId(
    client,
    input.semesterId
  );

  if (error) throw new Error(error.message);

  const existing = (classes ?? []).find(
    (row) => row.name.toLowerCase() === input.name.toLowerCase()
  );
  if (existing) {
    if (existing.status !== input.status) {
      const updated = await classRepository.updateClassStatus(
        client,
        existing.id,
        input.status
      );
      if (updated.error) throw new Error(updated.error.message);
    }
    return existing.id;
  }

  const created = await classRepository.createClass(client, {
    name: input.name,
    subject_id: input.subjectId,
    semester_id: input.semesterId,
    status: input.status,
    card_gradient: pickClassCardGradientKey(
      `${input.name}:${input.subjectId}:${input.semesterId}`
    ),
  });

  if (created.error || !created.data) {
    throw new Error(created.error?.message ?? `Unable to create class "${input.name}".`);
  }

  return created.data.id;
}

async function findOrCreateStaff(
  client: Supabase,
  input: SeedStaff
): Promise<string> {
  const existingProfile = await profileRepository.findProfileByUsername(
    client,
    input.username
  );
  if (existingProfile.data) return existingProfile.data.id;

  const existingEmail = await authRepository.findAuthUserByEmail(
    client,
    input.email
  );
  if (existingEmail.error) throw new Error(existingEmail.error.message);
  if (existingEmail.data?.user) return existingEmail.data.user.id;

  const { data: authData, error: authError } = await authRepository.createAuthUser(
    client,
    {
      email: input.email,
      password: getDefaultPassword(),
      username: input.username,
      fullName: input.fullName,
      role: input.role,
    }
  );

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? `Unable to create staff ${input.username}.`);
  }

  const authUserId = authData.user.id;

  try {
    const { error: profileError } = await profileRepository.createProfile(client, {
      id: authUserId,
      username: input.username,
      role: input.role,
    });
    if (profileError) throw new Error(profileError.message);
    await syncAuthUserRole(client, authUserId, input.role);
    return authUserId;
  } catch (error) {
    await authRepository.deleteAuthUser(client, authUserId);
    throw error;
  }
}

/**
 * Ensure the teacher role has the full class-tree grants (sessions, tasks,
 * attendance, grades, final exams, classes.*). Demo seed is often run without
 * re-running seed:rbac; this keeps teachers able to manage assigned classes.
 */
async function ensureTeacherRolePermissions(client: Supabase): Promise<void> {
  const featureSet = new Set<PermissionFeature>(CLASS_TREE_SEED_FEATURES);
  const catalogRows = PERMISSION_DEFINITIONS.filter((definition) =>
    featureSet.has(definition.feature)
  ).map((definition) => ({
    key: definition.key as PermissionKey,
    label: definition.label,
    feature_group: definition.feature,
    access: definition.access,
  }));

  const { error: upsertError } = await permissionRepository.upsertPermissions(
    client,
    catalogRows
  );
  if (upsertError) {
    throw new Error(
      `Unable to upsert class-tree permissions: ${upsertError.message}`
    );
  }

  const { error } = await permissionRepository.replaceRolePermissions(
    client,
    ROLES.TEACHER,
    [...TEACHER_SEED_PERMISSIONS]
  );
  if (error) {
    throw new Error(
      `Unable to seed teacher role permissions: ${error.message}`
    );
  }
}

async function findOrCreateTeacher(
  client: Supabase,
  input: SeedTeacher
): Promise<string> {
  const existingProfile = await profileRepository.findProfileByUsername(
    client,
    input.username
  );

  if (existingProfile.data) {
    const flags = {
      is_instructor: input.isInstructor ?? false,
      is_mentor: input.isMentor ?? false,
    };
    await profileRepository.updateProfileById(client, existingProfile.data.id, {
      username: input.username,
      role: ROLES.TEACHER,
      ...flags,
    });
    await syncAuthUserRole(client, existingProfile.data.id, ROLES.TEACHER);
    return existingProfile.data.id;
  }

  const existingEmail = await authRepository.findAuthUserByEmail(
    client,
    input.email
  );
  if (existingEmail.error) throw new Error(existingEmail.error.message);
  if (existingEmail.data?.user) {
    return existingEmail.data.user.id;
  }

  const { data: authData, error: authError } = await authRepository.createAuthUser(
    client,
    {
      email: input.email,
      password: getDefaultPassword(),
      username: input.username,
      fullName: input.fullName,
      role: ROLES.TEACHER,
    }
  );

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? `Unable to create teacher ${input.username}.`);
  }

  const authUserId = authData.user.id;

  try {
    const { error: profileError } = await profileRepository.createProfile(client, {
      id: authUserId,
      username: input.username,
      role: ROLES.TEACHER,
      is_instructor: input.isInstructor ?? false,
      is_mentor: input.isMentor ?? false,
    });

    if (profileError) throw new Error(profileError.message);

    await syncAuthUserRole(client, authUserId, ROLES.TEACHER);
    return authUserId;
  } catch (error) {
    await authRepository.deleteAuthUser(client, authUserId);
    throw error;
  }
}

async function findOrCreateStudent(
  client: Supabase,
  input: SeedStudent
): Promise<{ userId: string; studentProfileId: string }> {
  const existingProfile = await profileRepository.findProfileByUsername(
    client,
    input.username
  );

  if (existingProfile.data) {
    const studentProfile =
      await studentProfileRepository.findStudentProfileByUserId(
        client,
        existingProfile.data.id
      );

    if (studentProfile.error) throw new Error(studentProfile.error.message);
    if (!studentProfile.data) {
      throw new Error(
        `Profile exists for ${input.username} but student_profiles row is missing.`
      );
    }

    return {
      userId: existingProfile.data.id,
      studentProfileId: studentProfile.data.id,
    };
  }

  const existingEmail = await authRepository.findAuthUserByEmail(
    client,
    input.email
  );
  if (existingEmail.error) throw new Error(existingEmail.error.message);

  if (existingEmail.data?.user) {
    const userId = existingEmail.data.user.id;
    const studentProfile =
      await studentProfileRepository.findStudentProfileByUserId(client, userId);

    if (!studentProfile.data) {
      throw new Error(
        `Auth user exists for ${input.email} but related rows are incomplete.`
      );
    }

    return {
      userId,
      studentProfileId: studentProfile.data.id,
    };
  }

  const { data: authData, error: authError } = await authRepository.createAuthUser(
    client,
    {
      email: input.email,
      password: getDefaultPassword(),
      username: input.username,
      fullName: input.fullName,
      role: ROLES.STUDENT,
    }
  );

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? `Unable to create student ${input.username}.`);
  }

  const authUserId = authData.user.id;

  try {
    await ensureStudentRegistration(client, {
      authId: authUserId,
      username: input.username,
      email: input.email,
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: ROLES.STUDENT,
    });

    await syncAuthUserRole(client, authUserId, ROLES.STUDENT);

    const studentProfile =
      await studentProfileRepository.findStudentProfileByUserId(client, authUserId);

    if (studentProfile.error) throw new Error(studentProfile.error.message);
    if (!studentProfile.data) {
      throw new Error(`Student registration incomplete for ${input.username}.`);
    }

    return {
      userId: authUserId,
      studentProfileId: studentProfile.data.id,
    };
  } catch (error) {
    await authRepository.deleteAuthUser(client, authUserId);
    throw error;
  }
}

async function ensureTeacherAssignedToClass(
  client: Supabase,
  teacherId: string,
  classId: string
) {
  const existing = await classTeacherRepository.findClassTeacherByTeacherAndClass(
    client,
    teacherId,
    classId
  );

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return;

  const { error } = await classTeacherRepository.createClassTeacher(client, {
    teacher_id: teacherId,
    class_id: classId,
    assigned_by: null,
  });

  if (error) throw new Error(error.message);
}

async function ensureStudentSemesterEnrollment(
  client: Supabase,
  studentProfileId: string,
  semesterId: string
) {
  const existing =
    await studentSemesterRepository.findEnrollmentByStudentAndSemester(
      client,
      studentProfileId,
      semesterId
    );

  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return;

  const { error } = await studentSemesterRepository.createStudentSemesterEnrollment(
    client,
    {
      student_profile_id: studentProfileId,
      semester_id: semesterId,
      status: "active",
    }
  );

  if (error) throw new Error(error.message);
}

async function ensureStudentsEnrolledInClass(
  client: Supabase,
  classId: string,
  userIds: string[]
) {
  const { error } = await studentClassRepository.enrollStudentsInClass(
    client,
    classId,
    userIds
  );
  if (error) throw new Error(error.message);
}

async function findOrCreateSubjectTask(
  client: Supabase,
  input: {
    subjectId: string;
    title: string;
    description: string;
    period: number;
    maxGrade: number;
    sortOrder: number;
  }
) {
  const listed = await subjectTaskRepository.listSubjectTasksBySubjectId(
    client,
    input.subjectId
  );
  if (listed.error) throw new Error(listed.error.message);
  const existing = (listed.data ?? []).find(
    (row) => row.title.toLowerCase() === input.title.toLowerCase()
  );
  if (existing) return existing;

  const created = await subjectTaskRepository.createSubjectTask(client, {
    subject_id: input.subjectId,
    title: input.title,
    description: input.description,
    period: input.period,
    max_grade: input.maxGrade,
    sort_order: input.sortOrder,
  });
  if (created.error || !created.data) {
    throw new Error(created.error?.message ?? `Unable to create subject task "${input.title}".`);
  }
  return created.data;
}

async function ensureClassTasksFromSubject(
  client: Supabase,
  classId: string,
  subjectTasks: Awaited<ReturnType<typeof findOrCreateSubjectTask>>[],
  options: { startFirst: boolean }
) {
  const existing = await classTaskRepository.listClassTasksByClassId(
    client,
    classId
  );
  if (existing.error) throw new Error(existing.error.message);
  const bySource = new Map(
    (existing.data ?? [])
      .filter((row) => row.source_subject_task_id)
      .map((row) => [row.source_subject_task_id as string, row])
  );

  const startedAt = isoDateTime(-3);
  const dueDate = isoDateTime(4);

  for (const [index, subjectTask] of subjectTasks.entries()) {
    let classTask = bySource.get(subjectTask.id);
    if (!classTask) {
      const start = options.startFirst && index === 0;
      const created = await classTaskRepository.createClassTask(client, {
        class_id: classId,
        source_subject_task_id: subjectTask.id,
        title: subjectTask.title,
        description: subjectTask.description,
        period: subjectTask.period,
        max_grade: subjectTask.max_grade,
        sort_order: subjectTask.sort_order,
        started: start,
        started_at: start ? startedAt : null,
        due_date: start ? dueDate : null,
      });
      if (created.error || !created.data) {
        throw new Error(
          created.error?.message ?? `Unable to clone class task "${subjectTask.title}".`
        );
      }
      classTask = created.data;
      if (start) {
        const seeded = await studentTaskRepository.seedStudentTasksForNewTask(
          client,
          classTask.id
        );
        if (seeded.error) throw new Error(seeded.error.message);
      }
    }
  }
}

async function ensureSessionsForClass(
  client: Supabase,
  classId: string,
  semesterId: string
) {
  const listed = await sessionRepository.listSessionsByClassId(client, classId);
  if (listed.error) throw new Error(listed.error.message);
  if ((listed.data ?? []).length > 0) {
    for (const session of listed.data ?? []) {
      const ensured = await attendeeRepository.ensureSessionAttendeesForMembers(
        client,
        session.id,
        classId
      );
      if (ensured.error) throw new Error(ensured.error.message);
    }
    return;
  }

  for (const [index, dayOffset] of [-7, 0].entries()) {
    const startsAt = isoDateTime(dayOffset, 14);
    const endsAt = isoDateTime(dayOffset, 16);
    const created = await sessionRepository.createSession(client, {
      class_id: classId,
      nb_order: index + 1,
      topic: `Demo session ${index + 1}`,
      session_report: null,
      starts_at: startsAt,
      ends_at: endsAt,
      semester_id: semesterId,
      group_grade_level: null,
    });
    if (created.error || !created.data) {
      throw new Error(created.error?.message ?? "Unable to create demo session.");
    }
    const ensured = await attendeeRepository.ensureSessionAttendeesForMembers(
      client,
      created.data.id,
      classId
    );
    if (ensured.error) throw new Error(ensured.error.message);
  }
}

async function ensureFinalExam(client: Supabase, classId: string) {
  const existing = await finalExamRepository.findFinalExamByClassId(
    client,
    classId
  );
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data.id;

  const created = await finalExamRepository.createFinalExam(client, {
    class_id: classId,
    title: "Demo Midterm / Final",
    description: "Demo exam for local testing.",
    due_date: isoDate(30),
    max_grade: 100,
  });
  if (created.error || !created.data) {
    throw new Error(created.error?.message ?? "Unable to create final exam.");
  }
  return created.data.id;
}

/**
 * Billing class for a semester is the in-progress class (oldest if several).
 * Demo seed needs a predictable OG: demote other in-progress classes first.
 */
async function ensureSoleInProgressBillingClass(
  client: Supabase,
  semesterId: string,
  billingClassId: string
) {
  const listed = await classRepository.listClassesBySemesterId(
    client,
    semesterId
  );
  if (listed.error) throw new Error(listed.error.message);

  const rows = listed.data ?? [];

  // Demote extras first — DB allows at most one in_progress class per semester.
  for (const row of rows) {
    if (row.id !== billingClassId && row.status === "in_progress") {
      const demoted = await classRepository.updateClassStatus(
        client,
        row.id,
        "scheduled"
      );
      if (demoted.error) throw new Error(demoted.error.message);
    }
  }

  const billing = rows.find((row) => row.id === billingClassId);
  if (!billing) {
    throw new Error(`Billing class ${billingClassId} not found on semester.`);
  }
  if (billing.status !== "in_progress") {
    const updated = await classRepository.updateClassStatus(
      client,
      billingClassId,
      "in_progress"
    );
    if (updated.error) throw new Error(updated.error.message);
  }
}

async function ensureSppsForStudentsOnPhase(
  client: Supabase,
  phaseId: string,
  studentUserIds: string[]
) {
  for (const studentId of studentUserIds) {
    const ensured =
      await studentPaymentPhaseRepository.ensureSppForStudentOnPhase(
        client,
        studentId,
        phaseId,
        isoDate(0)
      );
    if (ensured.error) throw new Error(ensured.error.message);
  }
}

async function ensurePaymentPhaseByName(
  client: Supabase,
  input: {
    name: string;
    semesterId: string;
    amount: number;
    upfrontAmount: number;
    durationMonths: number;
    startDate: string;
    endDate: string;
  }
) {
  const phases = await paymentPhaseRepository.listPaymentPhasesBySemesterId(
    client,
    input.semesterId
  );
  if (phases.error) throw new Error(phases.error.message);

  const existing = (phases.data ?? []).find(
    (row) => row.name.toLowerCase() === input.name.toLowerCase()
  );
  if (existing) return existing.id;

  const created = await paymentPhaseRepository.createPaymentPhaseWithSpps(
    client,
    {
      name: input.name,
      semester_id: input.semesterId,
      amount: input.amount,
      upfront_amount: input.upfrontAmount,
      duration_months: input.durationMonths,
      start_date: input.startDate,
      end_date: input.endDate,
    }
  );
  if (created.error || !created.data?.phase) {
    throw new Error(
      created.error?.message ??
        `Unable to create demo payment phase "${input.name}" with SPPs.`
    );
  }
  return created.data.phase.id;
}

/** Wipe money/overlay children so demo scenarios re-apply deterministically. */
async function resetSppDemoChildren(client: Supabase, sppId: string) {
  const payments = await client
    .from("student_payments")
    .delete()
    .eq("student_payment_phase_id", sppId);
  if (payments.error) throw new Error(payments.error.message);

  const adjustments = await client
    .from("student_financial_adjustments")
    .delete()
    .eq("student_payment_phase_id", sppId);
  if (adjustments.error) throw new Error(adjustments.error.message);

  const clearances = await client
    .from("student_payment_phase_clearances")
    .delete()
    .eq("student_payment_phase_id", sppId);
  if (clearances.error) throw new Error(clearances.error.message);

  const schedules = await client
    .from("student_payment_schedules")
    .delete()
    .eq("student_payment_phase_id", sppId);
  if (schedules.error) throw new Error(schedules.error.message);

  const recalc = await studentPaymentPhaseRepository.recalcSppAndPhaseStatus(
    client,
    sppId
  );
  if (recalc.error) throw new Error(recalc.error.message);
}

async function createPaymentOnSpp(
  client: Supabase,
  input: {
    sppId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    receivedByUserId: string;
    notes: string;
  }
) {
  const paid = await studentPaymentRepository.createStudentPaymentWithRecalc(
    client,
    {
      student_payment_phase_id: input.sppId,
      payment_date: input.paymentDate,
      amount: input.amount,
      payment_method: input.paymentMethod,
      received_by: input.receivedByUserId,
      received_by_management: true,
      notes: input.notes,
    }
  );
  if (paid.error) throw new Error(paid.error.message);
}

async function createScholarshipOnSpp(
  client: Supabase,
  input: {
    sppId: string;
    value: number;
    reason: string;
    effectiveDate: string;
  }
) {
  const adj =
    await studentFinancialAdjustmentRepository.createAdjustmentWithRecalc(
      client,
      {
        student_payment_phase_id: input.sppId,
        type: FINANCIAL_ADJUSTMENT_TYPES.SCHOLARSHIP,
        value_type: FINANCIAL_ADJUSTMENT_VALUE_TYPES.FIXED,
        value: input.value,
        reason: input.reason,
        effective_date: input.effectiveDate,
      }
    );
  if (adj.error) throw new Error(adj.error.message);
}

async function createClearanceOnSpp(
  client: Supabase,
  input: {
    sppId: string;
    durationDays: number;
    notes: string;
    createdBy: string;
  }
) {
  const clearance = await studentPaymentPhaseClearanceRepository.insertClearance(
    client,
    {
      student_payment_phase_id: input.sppId,
      duration_days: input.durationDays,
      notes: input.notes,
      created_by: input.createdBy,
    }
  );
  if (clearance.error) throw new Error(clearance.error.message);
}

async function createInstallmentScheduleOnSpp(
  client: Supabase,
  input: {
    sppId: string;
    createdBy: string;
    rows: Array<{
      dueDate: string;
      amount: number;
      label: string;
      status: string;
      notes: string | null;
    }>;
  }
) {
  for (const row of input.rows) {
    const created =
      await studentPaymentScheduleRepository.createStudentPaymentScheduleWithRpc(
        client,
        {
          student_payment_phase_id: input.sppId,
          due_date: row.dueDate,
          amount: row.amount,
          label: row.label,
          status: row.status,
          notes: row.notes,
          created_by: input.createdBy,
        }
      );
    if (created.error) throw new Error(created.error.message);
  }
}

function sppByStudentId(
  rows: Array<{ id: string; student_id: string }>,
  studentId: string
) {
  return rows.find((row) => row.student_id === studentId) ?? null;
}

/**
 * Fall tuition (opened): Alice partial/upfront, Bob scholarship+clearance,
 * Carol fully paid, David pending + installment schedule.
 * Fall lab fee: all SPPs paid → phase closes via recalc.
 */
async function ensureFallAccountingSeed(
  client: Supabase,
  input: {
    semesterId: string;
    billingClassId: string;
    studentUserIds: string[];
    receivedByUserId: string;
  }
) {
  const [aliceId, bobId, carolId, davidId] = input.studentUserIds;
  if (!aliceId || !bobId || !carolId || !davidId) {
    throw new Error("Fall accounting seed expects 4 math student user ids.");
  }

  await ensureSoleInProgressBillingClass(
    client,
    input.semesterId,
    input.billingClassId
  );

  const tuitionPhaseId = await ensurePaymentPhaseByName(client, {
    name: DEMO_PHASE_NAME,
    semesterId: input.semesterId,
    amount: FALL_TUITION_AMOUNT,
    upfrontAmount: FALL_UPFRONT_AMOUNT,
    durationMonths: 4,
    startDate: isoDate(-14),
    endDate: isoDate(100),
  });

  await ensureSppsForStudentsOnPhase(
    client,
    tuitionPhaseId,
    input.studentUserIds
  );

  const tuitionSpps =
    await studentPaymentPhaseRepository.listSppsByPaymentPhaseId(
      client,
      tuitionPhaseId
    );
  if (tuitionSpps.error) throw new Error(tuitionSpps.error.message);
  const tuitionRows = tuitionSpps.data ?? [];

  const aliceSpp = sppByStudentId(tuitionRows, aliceId);
  const bobSpp = sppByStudentId(tuitionRows, bobId);
  const carolSpp = sppByStudentId(tuitionRows, carolId);
  const davidSpp = sppByStudentId(tuitionRows, davidId);

  if (!aliceSpp || !bobSpp || !carolSpp || !davidSpp) {
    const found = tuitionRows.map((row) => row.student_id).join(", ");
    throw new Error(
      `Fall tuition SPPs missing expected Math students (got ${tuitionRows.length}: ${found}).`
    );
  }

  for (const spp of [aliceSpp, bobSpp, carolSpp, davidSpp]) {
    await resetSppDemoChildren(client, spp.id);
  }

  // Alice — upfront only → partially_paid (+ upfront-paid display in window)
  await createPaymentOnSpp(client, {
    sppId: aliceSpp.id,
    amount: FALL_UPFRONT_AMOUNT,
    paymentDate: isoDate(-7),
    paymentMethod: PAYMENT_METHODS.CASH,
    receivedByUserId: input.receivedByUserId,
    notes: "Demo upfront payment",
  });

  // Bob — scholarship + month clearance + partial
  await createScholarshipOnSpp(client, {
    sppId: bobSpp.id,
    value: 100,
    reason: "Demo scholarship",
    effectiveDate: isoDate(-5),
  });
  await createClearanceOnSpp(client, {
    sppId: bobSpp.id,
    durationDays: 30,
    notes: "Demo month clearance",
    createdBy: input.receivedByUserId,
  });
  await createPaymentOnSpp(client, {
    sppId: bobSpp.id,
    amount: 200,
    paymentDate: isoDate(-3),
    paymentMethod: PAYMENT_METHODS.OMT,
    receivedByUserId: input.receivedByUserId,
    notes: "Demo partial after scholarship",
  });

  // Carol — fully paid
  await createPaymentOnSpp(client, {
    sppId: carolSpp.id,
    amount: FALL_TUITION_AMOUNT,
    paymentDate: isoDate(-2),
    paymentMethod: PAYMENT_METHODS.BANK_TRANSFER,
    receivedByUserId: input.receivedByUserId,
    notes: "Demo full tuition payment",
  });

  // David — pending with informational installment plan
  await createInstallmentScheduleOnSpp(client, {
    sppId: davidSpp.id,
    createdBy: input.receivedByUserId,
    rows: [
      {
        dueDate: isoDate(7),
        amount: 400,
        label: "Installment 1",
        status: PAYMENT_SCHEDULE_STATUSES.PLANNED,
        notes: "Demo schedule",
      },
      {
        dueDate: isoDate(37),
        amount: 400,
        label: "Installment 2",
        status: PAYMENT_SCHEDULE_STATUSES.PLANNED,
        notes: null,
      },
      {
        dueDate: isoDate(67),
        amount: 400,
        label: "Installment 3",
        status: PAYMENT_SCHEDULE_STATUSES.PLANNED,
        notes: null,
      },
    ],
  });

  // Lab fee phase — pay demo Math SPPs so status derives to closed
  const labPhaseId = await ensurePaymentPhaseByName(client, {
    name: DEMO_LAB_PHASE_NAME,
    semesterId: input.semesterId,
    amount: FALL_LAB_FEE_AMOUNT,
    upfrontAmount: 0,
    durationMonths: 1,
    startDate: isoDate(-30),
    endDate: isoDate(-1),
  });

  await ensureSppsForStudentsOnPhase(client, labPhaseId, input.studentUserIds);

  const labSpps = await studentPaymentPhaseRepository.listSppsByPaymentPhaseId(
    client,
    labPhaseId
  );
  if (labSpps.error) throw new Error(labSpps.error.message);

  for (const studentId of input.studentUserIds) {
    const spp = sppByStudentId(labSpps.data ?? [], studentId);
    if (!spp) {
      throw new Error(`Lab fee SPP missing for student ${studentId}.`);
    }
    await resetSppDemoChildren(client, spp.id);
    await createPaymentOnSpp(client, {
      sppId: spp.id,
      amount: FALL_LAB_FEE_AMOUNT,
      paymentDate: isoDate(-10),
      paymentMethod: PAYMENT_METHODS.CASH,
      receivedByUserId: input.receivedByUserId,
      notes: "Demo lab fee paid in full",
    });
  }

  return { tuitionPhaseId, labPhaseId };
}

/**
 * Spring tuition on in-progress Physics class:
 * Eve partial, Frank paid, Grace pending.
 */
async function ensureSpringAccountingSeed(
  client: Supabase,
  input: {
    semesterId: string;
    billingClassId: string;
    studentUserIds: string[];
    receivedByUserId: string;
  }
) {
  const [eveId, frankId, graceId] = input.studentUserIds;
  if (!eveId || !frankId || !graceId) {
    throw new Error("Spring accounting seed expects 3 physics student user ids.");
  }

  await ensureSoleInProgressBillingClass(
    client,
    input.semesterId,
    input.billingClassId
  );

  const springPhaseId = await ensurePaymentPhaseByName(client, {
    name: DEMO_SPRING_PHASE_NAME,
    semesterId: input.semesterId,
    amount: SPRING_TUITION_AMOUNT,
    upfrontAmount: SPRING_UPFRONT_AMOUNT,
    durationMonths: 4,
    startDate: isoDate(0),
    endDate: isoDate(120),
  });

  await ensureSppsForStudentsOnPhase(
    client,
    springPhaseId,
    input.studentUserIds
  );

  const springSpps =
    await studentPaymentPhaseRepository.listSppsByPaymentPhaseId(
      client,
      springPhaseId
    );
  if (springSpps.error) throw new Error(springSpps.error.message);
  const springRows = springSpps.data ?? [];

  const eveSpp = sppByStudentId(springRows, eveId);
  const frankSpp = sppByStudentId(springRows, frankId);
  const graceSpp = sppByStudentId(springRows, graceId);

  if (!eveSpp || !frankSpp || !graceSpp) {
    const found = springRows.map((row) => row.student_id).join(", ");
    throw new Error(
      `Spring tuition SPPs missing expected Physics students (got ${springRows.length}: ${found}).`
    );
  }

  for (const spp of [eveSpp, frankSpp, graceSpp]) {
    await resetSppDemoChildren(client, spp.id);
  }

  await createPaymentOnSpp(client, {
    sppId: eveSpp.id,
    amount: SPRING_UPFRONT_AMOUNT,
    paymentDate: isoDate(0),
    paymentMethod: PAYMENT_METHODS.WHISH,
    receivedByUserId: input.receivedByUserId,
    notes: "Demo spring upfront",
  });

  await createPaymentOnSpp(client, {
    sppId: frankSpp.id,
    amount: SPRING_TUITION_AMOUNT,
    paymentDate: isoDate(1),
    paymentMethod: PAYMENT_METHODS.CARD,
    receivedByUserId: input.receivedByUserId,
    notes: "Demo spring paid in full",
  });

  return springPhaseId;
}

async function ensureWorkshopBundle(
  client: Supabase,
  input: { instructorId: string; createdBy: string | null }
) {
  const listed = await workshopRepository.listWorkshopsForScheduleTabs(client);
  if (listed.error) throw new Error(listed.error.message);
  let workshopId =
    (listed.data ?? []).find(
      (row) => row.name.toLowerCase() === DEMO_WORKSHOP_NAME.toLowerCase()
    )?.id ?? null;

  if (!workshopId) {
    const created = await workshopRepository.createWorkshop(client, {
      name: DEMO_WORKSHOP_NAME,
      subject: "Robotics",
      status: WORKSHOP_STATUSES.SCHEDULED,
      type: WORKSHOP_OFFERING_TYPES.WORKSHOP,
      phone: "+1-555-0200",
      target_audience: "High school",
      nb_participants: 12,
      proposal_notes: "Demo workshop for local seed.",
      number_of_sessions: 4,
      price: 150,
      start_date: isoDate(7),
      end_date: isoDate(35),
      delivery_place: "Etkan lab",
      created_by: input.createdBy,
    });
    if (created.error || !created.data) {
      throw new Error(created.error?.message ?? "Unable to create demo workshop.");
    }
    workshopId = created.data.id;
  }

  const instructors =
    await workshopInstructorRepository.listWorkshopInstructorsByWorkshopId(
      client,
      workshopId
    );
  if (instructors.error) throw new Error(instructors.error.message);
  const hasInstructor = (instructors.data ?? []).some(
    (row) => row.user_id === input.instructorId
  );
  if (!hasInstructor) {
    const createdWi = await workshopInstructorRepository.createWorkshopInstructor(
      client,
      {
        workshop_id: workshopId,
        user_id: input.instructorId,
        role: WORKSHOP_INSTRUCTOR_ROLES.LEAD,
        wage_type: WORKSHOP_WAGE_TYPES.FIXED,
        wage_amount: 400,
        notes: "Demo lead instructor",
      }
    );
    if (createdWi.error) throw new Error(createdWi.error.message);
  }

  const sessions = await client
    .from("workshop_sessions")
    .select("id")
    .eq("workshop_id", workshopId)
    .limit(1);
  if (sessions.error) throw new Error(sessions.error.message);
  if ((sessions.data ?? []).length === 0) {
    const createdSession = await workshopSessionRepository.createWorkshopSession(
      client,
      {
        workshop_id: workshopId,
        nb_order: 1,
        session_date: isoDate(7),
        start_time: "10:00:00",
        end_time: "12:00:00",
        nb_hours: 2,
        topic: "Intro & safety",
        notes: null,
        suggestions: null,
        status: WORKSHOP_SESSION_STATUSES.PLANNED,
        participants_eval: null,
        session_eval: null,
      }
    );
    if (createdSession.error) throw new Error(createdSession.error.message);
  }

  const payments = await client
    .from("workshop_payments")
    .select("id")
    .eq("workshop_id", workshopId)
    .limit(1);
  if (payments.error) throw new Error(payments.error.message);
  if ((payments.data ?? []).length === 0) {
    const createdPay = await workshopPaymentRepository.createWorkshopPayment(
      client,
      {
        workshop_id: workshopId,
        amount: 150,
        type: TRANSACTION_TYPES.CREDIT,
        payment_date: isoDate(-1),
        payment_method: PAYMENT_METHODS.CASH,
        notes: "Demo deposit",
        created_by: input.createdBy,
        transaction_id: null,
      }
    );
    if (createdPay.error) throw new Error(createdPay.error.message);
  }

  const slotExisting = await client
    .from("instructor_schedule_slots")
    .select("id")
    .eq("entity_type", ENTITY_SCHEDULE_TYPE_WORKSHOP)
    .eq("record_id", workshopId)
    .limit(1);
  if (slotExisting.error) throw new Error(slotExisting.error.message);
  if ((slotExisting.data ?? []).length === 0) {
    const slot =
      await instructorScheduleSlotRepository.createInstructorScheduleSlot(
        client,
        {
          entity_type: ENTITY_SCHEDULE_TYPE_WORKSHOP,
          record_id: workshopId,
          name: `${DEMO_WORKSHOP_NAME} block`,
          type: "busy",
          slot_date: isoDate(7),
          day_of_week: new Date(`${isoDate(7)}T12:00:00Z`).getUTCDay(),
          start_time: "10:00:00",
          end_time: "12:00:00",
          source_workshop_id: workshopId,
        }
      );
    if (slot.error) throw new Error(slot.error.message);
  }

  return workshopId;
}

async function ensureInstructorCatalog(
  client: Supabase,
  instructorId: string
) {
  let subjectId: string | null = null;
  const listed = await instructorSubjectRepository.findInstructorSubjectByName(
    client,
    "Demo Robotics"
  );
  if (listed.error) throw new Error(listed.error.message);

  if (listed.data) {
    subjectId = listed.data.id;
  } else {
    const maxOrder =
      await instructorSubjectRepository.getMaxInstructorSubjectSortOrder(client);
    if (maxOrder.error) throw new Error(maxOrder.error.message);
    const sortOrder =
      typeof maxOrder.data?.sort_order === "number"
        ? maxOrder.data.sort_order + 1
        : 1;
    const created = await instructorSubjectRepository.createInstructorSubject(
      client,
      { name: "Demo Robotics", sort_order: sortOrder }
    );
    if (created.error || !created.data) {
      throw new Error(created.error?.message ?? "Unable to create instructor subject.");
    }
    subjectId = created.data.id;
  }

  const cap = await client
    .from("instructor_subject_capability")
    .select("user_id")
    .eq("user_id", instructorId)
    .eq("instructor_subject_id", subjectId)
    .maybeSingle();
  if (cap.error) throw new Error(cap.error.message);
  if (!cap.data) {
    const inserted = await instructorSubjectCapabilityRepository.insertCapabilities(
      client,
      [{ user_id: instructorId, subject_id: subjectId }]
    );
    if (inserted.error) throw new Error(inserted.error.message);
  }

  const freeSlot = await client
    .from("instructor_schedule_slots")
    .select("id")
    .eq("entity_type", ENTITY_SCHEDULE_TYPE_INSTRUCTOR)
    .eq("record_id", instructorId)
    .limit(1);
  if (freeSlot.error) throw new Error(freeSlot.error.message);
  if ((freeSlot.data ?? []).length === 0) {
    const created =
      await instructorScheduleSlotRepository.createInstructorScheduleSlot(
        client,
        {
          entity_type: ENTITY_SCHEDULE_TYPE_INSTRUCTOR,
          record_id: instructorId,
          name: "Demo free window",
          type: "free",
          slot_date: isoDate(1),
          day_of_week: new Date(`${isoDate(1)}T12:00:00Z`).getUTCDay(),
          start_time: "09:00:00",
          end_time: "11:00:00",
        }
      );
    if (created.error) throw new Error(created.error.message);
  }
}

async function ensureGuestsAndTeam(
  client: Supabase,
  createdBy: string | null
) {
  const guests = await guestRepository.listGuests(client);
  if (guests.error) throw new Error(guests.error.message);

  const guestSpecs = [
    {
      full_name: "Demo Guest Nora",
      phone: "+1-555-0301",
      status: GUEST_CURRENT_STATUSES.PENDING,
      pipeline: [
        GUEST_PIPELINE_STATUSES.STARTED,
        GUEST_PIPELINE_STATUSES.FINISHED_MEETING,
      ] as const,
    },
    {
      full_name: "Demo Guest Omar",
      phone: "+1-555-0302",
      status: GUEST_CURRENT_STATUSES.SCHEDULED,
      pipeline: [] as const,
    },
  ];

  const guestIds: string[] = [];

  for (const spec of guestSpecs) {
    const existing = (guests.data ?? []).find((row) => row.phone === spec.phone);
    if (existing) {
      guestIds.push(existing.id);
      continue;
    }

    const created = await guestRepository.createGuest(client, {
      full_name: spec.full_name,
      phone: spec.phone,
      age: 17,
      school_or_university: "Demo High School",
      education_level: REGISTRATION_EDUCATION_LEVELS.SCHOOL,
      interested_service: GUEST_INTERESTED_SERVICES.ETKAN_ROADMAP,
      referred_from: REGISTRATION_REFERRAL_SOURCES.FRIEND,
      referred_from_other: null,
      status: spec.status,
      notes: "Demo CRM guest",
      created_by: createdBy,
    });
    if (created.error || !created.data) {
      throw new Error(created.error?.message ?? `Unable to create guest ${spec.full_name}.`);
    }
    guestIds.push(created.data.id);

    if (spec.pipeline.length > 0) {
      const events = await guestStatusEventRepository.createGuestStatusEvents(
        client,
        spec.pipeline.map((status) => ({
          guest_id: created.data!.id,
          status,
          note: null,
          created_by: createdBy,
        }))
      );
      if (events.error) throw new Error(events.error.message);
    }
  }

  const teams = await client
    .from("teams")
    .select("id, name")
    .ilike("name", DEMO_TEAM_NAME)
    .maybeSingle();
  if (teams.error) throw new Error(teams.error.message);

  let teamId = teams.data?.id ?? null;
  if (!teamId) {
    const created = await teamRepository.createTeam(client, {
      name: DEMO_TEAM_NAME,
      expected_start_date: isoDate(21),
      status: TEAM_STATUSES.SCHEDULED,
      created_by: createdBy,
    });
    if (created.error || !created.data) {
      throw new Error(created.error?.message ?? "Unable to create demo team.");
    }
    teamId = created.data.id;
  }

  if (guestIds[0]) {
    const assigned = await teamRepository.assignGuestToTeam(client, {
      teamId,
      guestId: guestIds[0],
      createdBy,
    });
    if (assigned.error) throw new Error(assigned.error.message);
  }
}

async function ensureEquipment(
  client: Supabase,
  borrowerUserId: string
) {
  const listed = await equipmentRepository.listEquipments(client);
  if (listed.error) throw new Error(listed.error.message);

  let equipment = (listed.data ?? []).find(
    (row) => row.name.toLowerCase() === "demo 3d printer"
  );

  if (!equipment) {
    const created = await equipmentRepository.createEquipment(client, {
      name: "Demo 3D Printer",
      description: "Shared lab printer for demos.",
      quantity: 2,
      unit_price: 800,
    });
    if (created.error || !created.data) {
      throw new Error(created.error?.message ?? "Unable to create equipment.");
    }
    equipment = created.data;
  }

  const borrows = await client
    .from("borrow_equipment")
    .select("id")
    .eq("equipment_id", equipment.id)
    .eq("user_id", borrowerUserId)
    .limit(1);
  if (borrows.error) throw new Error(borrows.error.message);
  if ((borrows.data ?? []).length === 0) {
    const created = await borrowEquipmentRepository.createBorrows(client, [
      {
        equipment_id: equipment.id,
        user_id: borrowerUserId,
        quantity: 1,
      },
    ]);
    if (created.error) throw new Error(created.error.message);
  }
}

async function ensurePublicContent(client: Supabase) {
  const blogSlug = "demo-welcome-to-etkan";
  const existingBlog = await blogRepository.findBlogBySlug(client, blogSlug);
  if (existingBlog.error) throw new Error(existingBlog.error.message);
  if (!existingBlog.data) {
    const created = await blogRepository.createBlog(client, {
      slug: blogSlug,
      title: "Welcome to Etkan (demo)",
      summary: "A short demo post so the public Life / blogs surface has content.",
      body_html:
        "<p>This is seed content for local development. Edit or delete freely.</p>",
      categories: ["community", "students"],
      thumbnail_url:
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=900&auto=format&fit=crop",
      author_name: "Etkan Demo",
      author_avatar_url: null,
      status: "published",
      is_featured: true,
      reading_time_minutes: 2,
      published_at: isoDateTime(-2),
      sources: [],
      meta_title: "Welcome to Etkan (demo)",
      meta_description: "Demo blog post for local seed data.",
    });
    if (created.error) throw new Error(created.error.message);
  }

  const projects = await publicProjectRepository.listPublicProjects(client);
  if (projects.error) throw new Error(projects.error.message);
  const titles = new Set(
    (projects.data ?? []).map((row) => row.title.trim().toLowerCase())
  );

  const seedProjects = [
    {
      classification: "students" as const,
      category: "Hardware",
      title: "Demo Student Robot Arm",
      body: "A classroom robotics project seeded for the public projects page.",
      author: "Demo Math 101",
      image_url:
        "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=900&auto=format&fit=crop",
      href: "/",
    },
    {
      classification: "teachers" as const,
      category: "Web app",
      title: "Demo Teacher Toolkit",
      body: "Internal tooling showcase entry for the projects directory.",
      author: "Demo Math Teacher",
      image_url:
        "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=900&auto=format&fit=crop",
      href: "/",
    },
  ];

  for (const project of seedProjects) {
    if (titles.has(project.title.trim().toLowerCase())) continue;
    const { error } = await publicProjectRepository.createPublicProject(
      client,
      project
    );
    if (error) throw new Error(error.message);
  }
}

async function ensureTransactions(
  client: Supabase,
  recordedBy: string
) {
  const existing = await client
    .from("transactions")
    .select("id")
    .eq("description", "Demo office supplies")
    .limit(1);
  if (existing.error) throw new Error(existing.error.message);
  if ((existing.data ?? []).length > 0) return;

  const created = await transactionRepository.createTransaction(client, {
    transaction_date: isoDate(-3),
    type: TRANSACTION_TYPES.DEBIT,
    amount: 75,
    description: "Demo office supplies",
    category: "operations",
    payment_method: PAYMENT_METHODS.CASH,
    recorded_by: recordedBy,
    notes: "Seed expense",
  });
  if (created.error) throw new Error(created.error.message);
}

async function resolveReceiverUserId(client: Supabase): Promise<string> {
  const managerUsername = process.env.SEED_MANAGER_USERNAME ?? "asweid";
  const manager = await profileRepository.findProfileByUsername(
    client,
    managerUsername
  );
  if (manager.data) return manager.data.id;

  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? "admin";
  const admin = await profileRepository.findProfileByUsername(
    client,
    adminUsername
  );
  if (admin.data) return admin.data.id;

  throw new Error(
    "No manager/admin profile found. Run seed:admin and seed:manager first."
  );
}

async function seedDemoData(): Promise<void> {
  const client = createSeedAdminClient();
  const receiverId = await resolveReceiverUserId(client);

  // Class-tree RBAC for teachers (idempotent; safe if seed:rbac already ran).
  await ensureTeacherRolePermissions(client);

  // --- Panel staff (beyond admin/manager scripts) ---
  await findOrCreateStaff(client, {
    username: "demo.ceo",
    email: "demo.ceo@example.com",
    fullName: "Demo CEO",
    role: ROLES.CEO,
  });
  await findOrCreateStaff(client, {
    username: "demo.supervisor",
    email: "demo.supervisor@example.com",
    fullName: "Demo Supervisor",
    role: ROLES.SUPERVISOR,
  });
  await findOrCreateStaff(client, {
    username: "demo.crm",
    email: "demo.crm@example.com",
    fullName: "Demo CRM",
    role: ROLES.CRM,
  });
  await findOrCreateStaff(client, {
    username: "demo.comanager",
    email: "demo.comanager@example.com",
    fullName: "Demo Co-Manager",
    role: ROLES.CO_MANAGER,
  });

  // --- Academic core ---
  const fall = await findOrCreateSemester(client, { name: DEMO_MARKER });
  const spring = await findOrCreateSemester(client, { name: DEMO_SPRING });

  const mathSubjectId = await findOrCreateSubject(client, {
    name: "Demo Mathematics",
    nbSessions: 12,
  });
  const physicsSubjectId = await findOrCreateSubject(client, {
    name: "Demo Physics",
    nbSessions: 10,
  });

  const mathHomework = await findOrCreateSubjectTask(client, {
    subjectId: mathSubjectId,
    title: "Demo Algebra worksheet",
    description: "Practice linear equations.",
    period: 7,
    maxGrade: 20,
    sortOrder: 0,
  });
  const mathProject = await findOrCreateSubjectTask(client, {
    subjectId: mathSubjectId,
    title: "Demo Math project",
    description: "Short applied project.",
    period: 14,
    maxGrade: 30,
    sortOrder: 1,
  });

  const mathClassId = await findOrCreateClass(client, {
    name: "Demo Math 101",
    subjectId: mathSubjectId,
    semesterId: fall.id,
    status: "in_progress",
  });
  const physicsClassId = await findOrCreateClass(client, {
    name: "Demo Physics 101",
    subjectId: physicsSubjectId,
    semesterId: spring.id,
    // Billing class for Spring payment phases (SPPs attach to in-progress members).
    status: "in_progress",
  });

  const mathTeacherId = await findOrCreateTeacher(client, {
    username: "demo.teacher.math",
    email: "demo.teacher.math@example.com",
    fullName: "Demo Math Teacher",
    isInstructor: true,
    isMentor: true,
  });
  const physicsTeacherId = await findOrCreateTeacher(client, {
    username: "demo.teacher.physics",
    email: "demo.teacher.physics@example.com",
    fullName: "Demo Physics Teacher",
    isInstructor: true,
  });

  await ensureTeacherAssignedToClass(client, mathTeacherId, mathClassId);
  await ensureTeacherAssignedToClass(client, physicsTeacherId, physicsClassId);

  const mathStudents: SeedStudent[] = [
    {
      username: "demo.student.alice",
      email: "demo.student.alice@example.com",
      fullName: "Alice Anderson",
      phone: "+1-555-0101",
    },
    {
      username: "demo.student.bob",
      email: "demo.student.bob@example.com",
      fullName: "Bob Baker",
      phone: "+1-555-0102",
    },
    {
      username: "demo.student.carol",
      email: "demo.student.carol@example.com",
      fullName: "Carol Clark",
      phone: "+1-555-0103",
    },
    {
      username: "demo.student.david",
      email: "demo.student.david@example.com",
      fullName: "David Davis",
      phone: "+1-555-0104",
    },
  ];

  const physicsStudents: SeedStudent[] = [
    {
      username: "demo.student.eve",
      email: "demo.student.eve@example.com",
      fullName: "Eve Edwards",
      phone: "+1-555-0105",
    },
    {
      username: "demo.student.frank",
      email: "demo.student.frank@example.com",
      fullName: "Frank Foster",
      phone: "+1-555-0106",
    },
    {
      username: "demo.student.grace",
      email: "demo.student.grace@example.com",
      fullName: "Grace Green",
      phone: "+1-555-0107",
    },
  ];

  const mathUserIds: string[] = [];
  for (const student of mathStudents) {
    const created = await findOrCreateStudent(client, student);
    await ensureStudentSemesterEnrollment(
      client,
      created.studentProfileId,
      fall.id
    );
    mathUserIds.push(created.userId);
  }
  await ensureStudentsEnrolledInClass(client, mathClassId, mathUserIds);

  const physicsUserIds: string[] = [];
  for (const student of physicsStudents) {
    const created = await findOrCreateStudent(client, student);
    await ensureStudentSemesterEnrollment(
      client,
      created.studentProfileId,
      spring.id
    );
    physicsUserIds.push(created.userId);
  }
  await ensureStudentsEnrolledInClass(client, physicsClassId, physicsUserIds);

  // --- Tasks / sessions / exam (math = live class) ---
  await ensureClassTasksFromSubject(
    client,
    mathClassId,
    [mathHomework, mathProject],
    { startFirst: true }
  );
  await ensureSessionsForClass(client, mathClassId, fall.id);
  await ensureFinalExam(client, mathClassId);

  // --- Accounting (after enroll; OG = sole in-progress billing class per semester) ---
  await ensureFallAccountingSeed(client, {
    semesterId: fall.id,
    billingClassId: mathClassId,
    studentUserIds: mathUserIds,
    receivedByUserId: receiverId,
  });
  await ensureSpringAccountingSeed(client, {
    semesterId: spring.id,
    billingClassId: physicsClassId,
    studentUserIds: physicsUserIds,
    receivedByUserId: receiverId,
  });

  // --- Workshops / instructor schedule ---
  await ensureInstructorCatalog(client, mathTeacherId);
  await ensureWorkshopBundle(client, {
    instructorId: mathTeacherId,
    createdBy: receiverId,
  });

  // --- Guests / teams / equipment / CMS / ledger ---
  await ensureGuestsAndTeam(client, receiverId);
  await ensureEquipment(client, mathTeacherId);
  await ensurePublicContent(client);
  await ensureTransactions(client, receiverId);

  console.log("Full demo seed ready.");
  console.log("");
  console.log("Staff (password Demo123! unless overridden):");
  console.log("  demo.ceo / demo.supervisor / demo.crm / demo.comanager");
  console.log("  demo.teacher.math (instructor+mentor), demo.teacher.physics");
  console.log(
    `  Teacher role permissions: ${TEACHER_SEED_PERMISSIONS.length} class-tree keys`
  );
  console.log("");
  console.log("Academic:");
  console.log(`  Semesters: ${DEMO_MARKER}, ${DEMO_SPRING}`);
  console.log(
    "  Classes: Demo Math 101 (in_progress, 4), Demo Physics 101 (in_progress, 3)"
  );
  console.log("  Math: subject_tasks → class_tasks (1 started), sessions+attendees, final exam");
  console.log("");
  console.log("Accounting (statuses via payment/adjustment RPCs + recalc):");
  console.log(
    `  "${DEMO_PHASE_NAME}" (opened): Alice partial/upfront, Bob scholarship+clearance+partial,`
  );
  console.log("    Carol paid, David pending + 3 installment schedule rows");
  console.log(
    `  "${DEMO_LAB_PHASE_NAME}" (closed): all 4 SPPs paid @ $${FALL_LAB_FEE_AMOUNT}`
  );
  console.log(
    `  "${DEMO_SPRING_PHASE_NAME}" (opened): Eve partial, Frank paid, Grace pending`
  );
  console.log("");
  console.log("Also seeded: workshop, instructor schedule, guests/team, equipment borrow,");
  console.log("  blog + public projects, sample expense transaction.");
  console.log("");
  console.log(`Default password for demo.* users: ${getDefaultPassword()}`);
  console.log("Also run seed:projects if you want the three branded showcase projects.");
}

seedDemoData().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Demo seed failed.";
  console.error(message);
  process.exit(1);
});
