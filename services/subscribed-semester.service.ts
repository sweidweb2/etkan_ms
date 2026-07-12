import { SUBSCRIBED_SEMESTER_STATUSES } from "@/lib/constants/manager-subscribed-semester-status";
import * as accountRepository from "@/repositories/account.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentClassRepository from "@/repositories/student-class.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as subscribedSemesterRepository from "@/repositories/subscribed-semester.repository";
import type { SubscribedSemesterRecord } from "@/repositories/subscribed-semester.repository";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

function isUniqueViolation(message: string | undefined): boolean {
  const normalized = (message ?? "").toLowerCase();
  return normalized.includes("unique") || normalized.includes("duplicate");
}

/**
 * Idempotent: returns existing (account_id, semester_id) row or creates pending.
 */
export async function ensureSubscribedSemesterForAccount(
  adminClient: Supabase,
  accountId: string,
  semesterId: string
): Promise<SubscribedSemesterRecord | null> {
  const existing =
    await subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester(
      adminClient,
      accountId,
      semesterId
    );

  if (existing.error) {
    throw new Error(existing.error.message);
  }

  if (existing.data) {
    return existing.data as SubscribedSemesterRecord;
  }

  const semesterResult = await semesterRepository.findSemesterById(
    adminClient,
    semesterId
  );

  if (semesterResult.error) {
    throw new Error(semesterResult.error.message);
  }

  if (!semesterResult.data) {
    return null;
  }

  const createResult =
    await subscribedSemesterRepository.createSubscribedSemester(adminClient, {
      account_id: accountId,
      semester_id: semesterId,
      amount: Number(semesterResult.data.amount ?? 0),
      status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
    });

  if (createResult.error) {
    if (isUniqueViolation(createResult.error.message)) {
      const raced =
        await subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester(
          adminClient,
          accountId,
          semesterId
        );

      if (raced.error) {
        throw new Error(raced.error.message);
      }

      return (raced.data as SubscribedSemesterRecord | null) ?? null;
    }

    throw new Error(createResult.error.message);
  }

  return createResult.data as SubscribedSemesterRecord;
}

/**
 * Resolves student → account, then ensures a subscribed_semesters row.
 * Returns null when the student or account is missing.
 */
export async function ensureSubscribedSemesterForStudent(
  adminClient: Supabase,
  studentProfileId: string,
  semesterId: string
): Promise<SubscribedSemesterRecord | null> {
  const profileResult = await studentProfileRepository.findStudentProfileById(
    adminClient,
    studentProfileId
  );

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (!profileResult.data) {
    return null;
  }

  const accountResult = await accountRepository.findAccountByUserId(
    adminClient,
    profileResult.data.user_id
  );

  if (accountResult.error) {
    throw new Error(accountResult.error.message);
  }

  if (!accountResult.data) {
    return null;
  }

  return ensureSubscribedSemesterForAccount(
    adminClient,
    accountResult.data.id,
    semesterId
  );
}

/**
 * Mark the account+semester subscription as paid (idempotent ensure first).
 */
export async function markSubscribedSemesterPaidForAccount(
  adminClient: Supabase,
  accountId: string,
  semesterId: string
): Promise<void> {
  const subscription = await ensureSubscribedSemesterForAccount(
    adminClient,
    accountId,
    semesterId
  );

  if (!subscription) {
    return;
  }

  if (subscription.status === SUBSCRIBED_SEMESTER_STATUSES.PAID) {
    return;
  }

  const { error } = await subscribedSemesterRepository.updateSubscribedSemester(
    adminClient,
    subscription.id,
    {
      amount: Number(subscription.amount ?? 0),
      status: SUBSCRIBED_SEMESTER_STATUSES.PAID,
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function reassignAccountSubscribedSemester(
  adminClient: Supabase,
  accountId: string,
  previousSemesterId: string | null,
  nextSemesterId: string,
  nextAmount: number
): Promise<void> {
  const existingNext =
    await subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester(
      adminClient,
      accountId,
      nextSemesterId
    );

  if (existingNext.error) {
    throw new Error(existingNext.error.message);
  }

  if (existingNext.data) {
    if (Number(existingNext.data.amount ?? 0) !== nextAmount) {
      const { error } =
        await subscribedSemesterRepository.updateSubscribedSemester(
          adminClient,
          existingNext.data.id,
          {
            amount: nextAmount,
            status: existingNext.data.status,
          }
        );

      if (error) {
        throw new Error(error.message);
      }
    }
    return;
  }

  if (previousSemesterId) {
    const existingPrevious =
      await subscribedSemesterRepository.findSubscribedSemesterByAccountAndSemester(
        adminClient,
        accountId,
        previousSemesterId
      );

    if (existingPrevious.error) {
      throw new Error(existingPrevious.error.message);
    }

    if (existingPrevious.data) {
      const { error } =
        await subscribedSemesterRepository.updateSubscribedSemesterSemesterAndAmount(
          adminClient,
          existingPrevious.data.id,
          {
            semester_id: nextSemesterId,
            amount: nextAmount,
          }
        );

      if (error) {
        if (isUniqueViolation(error.message)) {
          await ensureSubscribedSemesterForAccount(
            adminClient,
            accountId,
            nextSemesterId
          );
          return;
        }
        throw new Error(error.message);
      }
      return;
    }
  }

  await ensureSubscribedSemesterForAccount(
    adminClient,
    accountId,
    nextSemesterId
  );
}

/**
 * When a class moves to a new semester, re-point each student’s billing row
 * to that semester and set amount from the new semester price.
 */
export async function reassignClassStudentsSubscribedSemesters(
  adminClient: Supabase,
  classId: string,
  previousSemesterId: string | null,
  nextSemesterId: string
): Promise<void> {
  const [semesterResult, classStudentsResult] = await Promise.all([
    semesterRepository.findSemesterById(adminClient, nextSemesterId),
    studentClassRepository.listStudentClassesByClassId(adminClient, classId),
  ]);

  if (semesterResult.error) {
    throw new Error(semesterResult.error.message);
  }

  if (!semesterResult.data) {
    return;
  }

  if (classStudentsResult.error) {
    throw new Error(classStudentsResult.error.message);
  }

  const userIds = (classStudentsResult.data ?? []).map((row) => row.user_id);
  if (userIds.length === 0) {
    return;
  }

  const accountsResult = await accountRepository.listAccountsByUserIds(
    adminClient,
    userIds
  );

  if (accountsResult.error) {
    throw new Error(accountsResult.error.message);
  }

  const nextAmount = Number(semesterResult.data.amount ?? 0);

  for (const account of accountsResult.data ?? []) {
    await reassignAccountSubscribedSemester(
      adminClient,
      account.id,
      previousSemesterId,
      nextSemesterId,
      nextAmount
    );
  }
}
