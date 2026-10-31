import "server-only";

import { createNavStepTimer } from "@/lib/debug/nav-timing";
import * as attendeeRepository from "@/repositories/attendee.repository";
import * as studentTaskRepository from "@/repositories/student-task.repository";
import type { Supabase } from "@/services/classes/session-shared";

/**
 * Ensure attendee rows exist for current class members only.
 * Binary membership: any student_class row counts. Does not remove rows for
 * former members — historical attendance remains.
 */
export async function ensureSessionAttendeesForMembers(
  adminClient: Supabase,
  sessionId: string,
  classId: string
): Promise<void> {
  const timer = createNavStepTimer("ensureSessionAttendees");
  try {
    const { error } = await timer.step("rpc", () =>
      attendeeRepository.ensureSessionAttendeesForMembers(
        adminClient,
        sessionId,
        classId
      )
    );

    if (error) {
      throw new Error(error.message);
    }
  } finally {
    timer.end();
  }
}

/**
 * When a student joins a class late, create absent attendee rows for every
 * existing session they do not already have.
 */
export async function seedLateJoinAttendeesForStudent(
  adminClient: Supabase,
  classId: string,
  studentUserId: string
): Promise<void> {
  const timer = createNavStepTimer("seedAttendees");
  try {
    const { error } = await timer.step("rpc", () =>
      attendeeRepository.seedLateJoinAttendees(
        adminClient,
        classId,
        studentUserId
      )
    );

    if (error) {
      throw new Error(error.message);
    }
  } finally {
    timer.end();
  }
}

/**
 * When a student joins a class late, create student_task rows for every
 * existing class task they do not already have.
 * Past-due tasks → missing + grade 0 + late note (mirrors final-exam late join).
 */
export async function seedLateJoinStudentTasksForStudent(
  adminClient: Supabase,
  classId: string,
  studentUserId: string
): Promise<void> {
  const timer = createNavStepTimer("seedTasks");
  try {
    const { error } = await timer.step("rpc", () =>
      studentTaskRepository.seedLateJoinStudentTasks(
        adminClient,
        classId,
        studentUserId
      )
    );

    if (error) {
      throw new Error(error.message);
    }
  } finally {
    timer.end();
  }
}

export async function seedLateJoinAttendeesForStudents(
  adminClient: Supabase,
  classId: string,
  studentUserIds: string[]
): Promise<void> {
  if (studentUserIds.length === 0) {
    return;
  }

  const timer = createNavStepTimer("seedAttendeesBatch");
  try {
    const { error } = await timer.step("rpc", () =>
      attendeeRepository.seedLateJoinAttendeesForStudents(
        adminClient,
        classId,
        studentUserIds
      )
    );

    if (error) {
      throw new Error(error.message);
    }
  } finally {
    timer.end();
  }
}

export async function seedLateJoinStudentTasksForStudents(
  adminClient: Supabase,
  classId: string,
  studentUserIds: string[]
): Promise<void> {
  if (studentUserIds.length === 0) {
    return;
  }

  const timer = createNavStepTimer("seedTasksBatch");
  try {
    const { error } = await timer.step("rpc", () =>
      studentTaskRepository.seedLateJoinStudentTasksForStudents(
        adminClient,
        classId,
        studentUserIds
      )
    );

    if (error) {
      throw new Error(error.message);
    }
  } finally {
    timer.end();
  }
}
