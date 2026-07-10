import { SCHEDULED_PAYMENT_STATUS_VALUES } from "@/lib/constants/manager-scheduled-payment-status";
import type { ScheduledPaymentStatusValue } from "@/lib/constants/manager-scheduled-payment-status";
import {
  SUBSCRIBED_SEMESTER_STATUSES,
  SUBSCRIBED_SEMESTER_STATUS_VALUES,
  type SubscribedSemesterStatusValue,
} from "@/lib/constants/manager-subscribed-semester-status";
import {
  STUDENT_SEMESTER_STATUSES,
  type StudentSemesterStatusValue,
} from "@/lib/constants/manager-student-semester-status";
import { ROLES, type RoleValue } from "@/lib/constants/roles";
import { createPaymentSchema } from "@/lib/validators/manager/add-payment";
import {
  createScheduledPaymentSchema,
  parseScheduledPaymentAmount,
  updateScheduledPaymentSchema,
} from "@/lib/validators/manager/scheduled-payment";
import { updatePaymentSchema } from "@/lib/validators/manager/update-payment";
import { updateSubscribedSemesterSchema } from "@/lib/validators/manager/update-subscribed-semester";
import * as accountRepository from "@/repositories/account.repository";
import * as paymentRepository from "@/repositories/payment.repository";
import type { PaymentRecord } from "@/repositories/payment.repository";
import * as scheduledPaymentRepository from "@/repositories/scheduled-payment.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import * as subscribedSemesterRepository from "@/repositories/subscribed-semester.repository";
import type { SubscribedSemesterRecord } from "@/repositories/subscribed-semester.repository";
import { listStudentsForManager } from "@/services/student.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerScheduledPaymentRow } from "@/types/manager-scheduled-payment";
import type {
  ManagerStudentAccountDetails,
  ManagerStudentAccountOverview,
  ManagerStudentPaymentRow,
  ManagerSubscribedSemesterRow,
} from "@/types/manager-student-account";
import type { ManagerAccountingStudentRow } from "@/types/manager-student-semester";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Supabase = SupabaseClient<Database>;

type ActionFailure = {
  success: false;
  error: string;
  fieldErrors?: FieldErrors;
};

type ActionSuccess = {
  success: true;
  message: string;
};

export type AccountingMutationResult = ActionSuccess | ActionFailure;

function assertManagerRole(actorRole: RoleValue | null): void {
  if (actorRole !== ROLES.MANAGER) {
    throw new Error("Unauthorized.");
  }
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function mapEnrollmentStatus(
  status: string | null
): StudentSemesterStatusValue | null {
  if (
    status === STUDENT_SEMESTER_STATUSES.PENDING ||
    status === STUDENT_SEMESTER_STATUSES.ACTIVE ||
    status === STUDENT_SEMESTER_STATUSES.INACTIVE ||
    status === STUDENT_SEMESTER_STATUSES.WITHDRAWN
  ) {
    return status;
  }

  return null;
}

function mapSubscribedStatus(status: string | null): SubscribedSemesterStatusValue {
  if (
    status &&
    SUBSCRIBED_SEMESTER_STATUS_VALUES.includes(
      status as SubscribedSemesterStatusValue
    )
  ) {
    return status as SubscribedSemesterStatusValue;
  }

  return SUBSCRIBED_SEMESTER_STATUSES.PENDING;
}

function mapScheduledStatus(status: string | null): ScheduledPaymentStatusValue {
  if (
    status &&
    SCHEDULED_PAYMENT_STATUS_VALUES.includes(status as ScheduledPaymentStatusValue)
  ) {
    return status as ScheduledPaymentStatusValue;
  }

  return "scheduled";
}

function sumPayments(
  payments: PaymentRecord[],
  subscribedSemesterId: string
): number {
  return roundCurrency(
    payments
      .filter((payment) => payment.subscribed_semester_id === subscribedSemesterId)
      .reduce((total, payment) => total + Number(payment.amount ?? 0), 0)
  );
}

async function buildBillingMaps(adminClient: Supabase, userIds: string[]) {
  const accountsResult = await accountRepository.listAccountsByUserIds(
    adminClient,
    userIds
  );

  if (accountsResult.error) {
    throw new Error(accountsResult.error.message);
  }

  const accounts = accountsResult.data ?? [];
  const accountIds = accounts.map((account) => account.id);

  const subscriptionsResult =
    await subscribedSemesterRepository.listSubscribedSemestersByAccountIds(
      adminClient,
      accountIds
    );

  if (subscriptionsResult.error) {
    throw new Error(subscriptionsResult.error.message);
  }

  const subscriptions = subscriptionsResult.data ?? [];
  const subscriptionIds = subscriptions.map((subscription) => subscription.id);

  const paymentsResult =
    await paymentRepository.listPaymentsBySubscribedSemesterIds(
      adminClient,
      subscriptionIds
    );

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  const payments = paymentsResult.data ?? [];
  const accountByUserId = new Map(
    accounts.map((account) => [account.user_id, account])
  );
  const subscriptionsByAccountId = new Map<string, SubscribedSemesterRecord[]>();

  for (const subscription of subscriptions) {
    const existing = subscriptionsByAccountId.get(subscription.account_id) ?? [];
    existing.push(subscription);
    subscriptionsByAccountId.set(subscription.account_id, existing);
  }

  return {
    accountByUserId,
    subscriptionsByAccountId,
    payments,
  };
}

function getSubscriptionBilling(
  subscription: SubscribedSemesterRecord | undefined,
  payments: PaymentRecord[]
) {
  if (!subscription) {
    return null;
  }

  const paid = sumPayments(payments, subscription.id);
  const amount = Number(subscription.amount ?? 0);

  return {
    total_amount: amount,
    total_paid: paid,
    balance_due: Math.max(amount - paid, 0),
  };
}

function getAccountBillingTotals(
  subscriptions: SubscribedSemesterRecord[],
  payments: PaymentRecord[]
) {
  const totalSubscribed = roundCurrency(
    subscriptions.reduce(
      (total, subscription) => total + Number(subscription.amount ?? 0),
      0
    )
  );
  const totalPaid = roundCurrency(
    payments.reduce((total, payment) => total + Number(payment.amount ?? 0), 0)
  );

  return {
    total_amount: totalSubscribed,
    total_paid: totalPaid,
    balance_due: Math.max(totalSubscribed - totalPaid, 0),
  };
}

async function ensureBillingSubscriptionsForStudent(
  adminClient: Supabase,
  accountId: string,
  studentProfileId: string
) {
  const [enrollmentsResult, subscriptionsResult, semestersResult] =
    await Promise.all([
      studentSemesterRepository.listEnrollmentsByStudentProfileId(
        adminClient,
        studentProfileId
      ),
      subscribedSemesterRepository.listSubscribedSemestersByAccountId(
        adminClient,
        accountId
      ),
      semesterRepository.listSemesters(adminClient),
    ]);

  if (enrollmentsResult.error) {
    throw new Error(enrollmentsResult.error.message);
  }

  if (subscriptionsResult.error) {
    throw new Error(subscriptionsResult.error.message);
  }

  if (semestersResult.error) {
    throw new Error(semestersResult.error.message);
  }

  const semesterAmountById = new Map(
    (semestersResult.data ?? []).map((semester) => [
      semester.id,
      Number(semester.amount ?? 0),
    ])
  );
  const existingSemesterIds = new Set(
    (subscriptionsResult.data ?? [])
      .map((subscription) => subscription.semester_id)
      .filter((semesterId): semesterId is string => Boolean(semesterId))
  );

  for (const enrollment of enrollmentsResult.data ?? []) {
    if (existingSemesterIds.has(enrollment.semester_id)) {
      continue;
    }

    const createResult = await subscribedSemesterRepository.createSubscribedSemester(
      adminClient,
      {
        account_id: accountId,
        semester_id: enrollment.semester_id,
        amount: semesterAmountById.get(enrollment.semester_id) ?? 0,
        status: SUBSCRIBED_SEMESTER_STATUSES.ACTIVE,
      }
    );

    if (createResult.error) {
      throw new Error(createResult.error.message);
    }

    existingSemesterIds.add(enrollment.semester_id);
  }
}

export async function listAccountingSemesterOptionsForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null
) {
  assertManagerRole(actorRole);

  const { data, error } = await semesterRepository.listSemesters(adminClient);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((semester) => ({
    id: semester.id,
    name: semester.name,
  }));
}

export async function listAccountingStudentsForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null
): Promise<ManagerAccountingStudentRow[]> {
  assertManagerRole(actorRole);

  const [students, enrollmentsResult, semestersResult] = await Promise.all([
    listStudentsForManager(adminClient, actorRole),
    studentSemesterRepository.listAllStudentSemesterEnrollments(adminClient),
    semesterRepository.listSemesters(adminClient),
  ]);

  if (enrollmentsResult.error) {
    throw new Error(enrollmentsResult.error.message);
  }

  if (semestersResult.error) {
    throw new Error(semestersResult.error.message);
  }

  const semesterNameById = new Map(
    (semestersResult.data ?? []).map((semester) => [semester.id, semester.name])
  );
  const studentsByProfileId = new Map(
    students.map((student) => [student.student_profile_id, student])
  );
  const { accountByUserId, subscriptionsByAccountId, payments } =
    await buildBillingMaps(
      adminClient,
      students.map((student) => student.user_id)
    );

  const rows: ManagerAccountingStudentRow[] = [];
  const enrolledStudentIds = new Set<string>();

  for (const enrollment of enrollmentsResult.data ?? []) {
    const student = studentsByProfileId.get(enrollment.student_profile_id);
    if (!student) {
      continue;
    }

    enrolledStudentIds.add(student.student_profile_id);
    const account = accountByUserId.get(student.user_id);
    const subscriptions = account
      ? (subscriptionsByAccountId.get(account.id) ?? [])
      : [];
    const subscription = subscriptions.find(
      (row) => row.semester_id === enrollment.semester_id
    );
    const billing = getSubscriptionBilling(subscription, payments);

    rows.push({
      student_profile_id: student.student_profile_id,
      user_id: student.user_id,
      full_name: student.full_name,
      email: student.email,
      phone: student.phone,
      semester_id: enrollment.semester_id,
      semester_name: semesterNameById.get(enrollment.semester_id) ?? "—",
      enrollment_status: mapEnrollmentStatus(enrollment.status),
      enrolled_at: enrollment.created_at,
      total_amount: billing?.total_amount ?? null,
      total_paid: billing?.total_paid ?? null,
      balance_due: billing?.balance_due ?? null,
    });
  }

  for (const student of students) {
    if (enrolledStudentIds.has(student.student_profile_id)) {
      continue;
    }

    const account = accountByUserId.get(student.user_id);
    const subscriptions = account
      ? (subscriptionsByAccountId.get(account.id) ?? [])
      : [];
    const billing = getAccountBillingTotals(subscriptions, payments);

    rows.push({
      student_profile_id: student.student_profile_id,
      user_id: student.user_id,
      full_name: student.full_name,
      email: student.email,
      phone: student.phone,
      semester_id: null,
      semester_name: null,
      enrollment_status: null,
      enrolled_at: null,
      total_amount: billing.total_amount,
      total_paid: billing.total_paid,
      balance_due: billing.balance_due,
    });
  }

  return rows.sort((left, right) => {
    const nameCompare = left.full_name.localeCompare(right.full_name);
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return (left.semester_name ?? "").localeCompare(right.semester_name ?? "");
  });
}

export async function getStudentAccountForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  studentProfileId: string
): Promise<ManagerStudentAccountDetails | null> {
  assertManagerRole(actorRole);

  const { data: studentProfile, error: profileError } =
    await studentProfileRepository.findStudentProfileById(
      adminClient,
      studentProfileId
    );

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!studentProfile) {
    return null;
  }

  const students = await listStudentsForManager(adminClient, actorRole);
  const student =
    students.find((row) => row.student_profile_id === studentProfileId) ?? null;

  if (!student) {
    return null;
  }

  const accountResult = await accountRepository.findAccountByUserId(
    adminClient,
    student.user_id
  );

  if (accountResult.error) {
    throw new Error(accountResult.error.message);
  }

  if (!accountResult.data) {
    return null;
  }

  await ensureBillingSubscriptionsForStudent(
    adminClient,
    accountResult.data.id,
    studentProfileId
  );

  const [subscriptionsResult, semestersResult] = await Promise.all([
    subscribedSemesterRepository.listSubscribedSemestersByAccountId(
      adminClient,
      accountResult.data.id
    ),
    semesterRepository.listSemesters(adminClient),
  ]);

  if (subscriptionsResult.error) {
    throw new Error(subscriptionsResult.error.message);
  }

  if (semestersResult.error) {
    throw new Error(semestersResult.error.message);
  }

  const semesterNameById = new Map(
    (semestersResult.data ?? []).map((semester) => [semester.id, semester.name])
  );
  const subscriptions = subscriptionsResult.data ?? [];
  const subscriptionIds = subscriptions.map((subscription) => subscription.id);

  const [paymentsResult, scheduledPaymentsResult] = await Promise.all([
    paymentRepository.listPaymentsBySubscribedSemesterIds(
      adminClient,
      subscriptionIds
    ),
    scheduledPaymentRepository.listScheduledPaymentsBySubscribedSemesterIds(
      adminClient,
      subscriptionIds
    ),
  ]);

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  if (scheduledPaymentsResult.error) {
    throw new Error(scheduledPaymentsResult.error.message);
  }

  const payments = paymentsResult.data ?? [];
  const subscriptionRows: ManagerSubscribedSemesterRow[] = subscriptions.map(
    (subscription) => ({
      id: subscription.id,
      account_id: subscription.account_id,
      semester_id: subscription.semester_id ?? "",
      semester_name:
        semesterNameById.get(subscription.semester_id ?? "") ?? "—",
      amount: Number(subscription.amount ?? 0),
      status: mapSubscribedStatus(subscription.status),
      created_at: subscription.created_at ?? "",
      paid_amount: sumPayments(payments, subscription.id),
    })
  );

  const paymentRows: ManagerStudentPaymentRow[] = payments.map((payment) => {
    const subscription = subscriptions.find(
      (row) => row.id === payment.subscribed_semester_id
    );

    return {
      id: payment.id,
      subscribed_semester_id: payment.subscribed_semester_id,
      semester_name:
        semesterNameById.get(subscription?.semester_id ?? "") ?? "—",
      amount: Number(payment.amount ?? 0),
      currency: payment.currency ?? "USD",
      method: payment.method,
      paid_at: payment.paid_at ?? "",
    };
  });

  const scheduledPaymentRows: ManagerScheduledPaymentRow[] = (
    scheduledPaymentsResult.data ?? []
  ).map((row) => ({
    id: row.id,
    subscribed_semester_id: row.subscribed_semester_id,
    payment_date: row.payment_date,
    amount: row.amount,
    status: mapScheduledStatus(row.status),
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  const totals = getAccountBillingTotals(subscriptions, payments);
  const overview: ManagerStudentAccountOverview = {
    account_id: accountResult.data.id,
    student_profile_id: student.student_profile_id,
    user_id: student.user_id,
    full_name: student.full_name,
    email: student.email,
    phone: student.phone,
    opened_at: accountResult.data.opened_at ?? "",
    total_subscribed: totals.total_amount,
    total_paid: totals.total_paid,
    balance_due: totals.balance_due,
    active_subscriptions: subscriptionRows.filter(
      (row) => row.status === SUBSCRIBED_SEMESTER_STATUSES.ACTIVE
    ).length,
  };

  return {
    overview,
    subscriptions: subscriptionRows,
    payments: paymentRows,
    scheduledPayments: scheduledPaymentRows,
  };
}

async function assertSubscribedSemesterExists(
  adminClient: Supabase,
  subscribedSemesterId: string
) {
  const { data, error } = await subscribedSemesterRepository.findSubscribedSemesterById(
    adminClient,
    subscribedSemesterId
  );

  if (error) {
    return { success: false as const, error: error.message };
  }

  if (!data) {
    return { success: false as const, error: "Subscription not found." };
  }

  return { success: true as const, data };
}

export async function createPaymentForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  input: {
    subscribed_semester_id: string;
    amount: number;
    currency: string;
    method: string;
    paid_at: string;
  }
): Promise<AccountingMutationResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = createPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const subscriptionCheck = await assertSubscribedSemesterExists(
    adminClient,
    parsed.data.subscribed_semester_id
  );

  if (!subscriptionCheck.success) {
    return { success: false, error: subscriptionCheck.error };
  }

  const { error } = await paymentRepository.createPayment(adminClient, {
    subscribed_semester_id: parsed.data.subscribed_semester_id,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    method: parsed.data.method,
    paid_at: new Date(parsed.data.paid_at).toISOString(),
  });

  if (error) {
    return { success: false, error: "Unable to record payment. Please try again." };
  }

  return { success: true, message: "Payment recorded." };
}

export async function updatePaymentForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  input: {
    id: string;
    amount: number;
    currency: string;
    method: string;
    paid_at: string;
  }
): Promise<AccountingMutationResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = updatePaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await paymentRepository.findPaymentById(
    adminClient,
    input.id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Payment not found." };
  }

  const { error } = await paymentRepository.updatePayment(adminClient, input.id, {
    subscribed_semester_id: existing.data.subscribed_semester_id,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    method: parsed.data.method,
    paid_at: new Date(parsed.data.paid_at).toISOString(),
  });

  if (error) {
    return { success: false, error: "Unable to update payment. Please try again." };
  }

  return { success: true, message: "Payment updated." };
}

export async function updateSubscribedSemesterForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  input: {
    id: string;
    amount: number;
    status: SubscribedSemesterStatusValue;
  }
): Promise<AccountingMutationResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = updateSubscribedSemesterSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const subscriptionCheck = await assertSubscribedSemesterExists(
    adminClient,
    input.id
  );

  if (!subscriptionCheck.success) {
    return { success: false, error: subscriptionCheck.error };
  }

  const { error } = await subscribedSemesterRepository.updateSubscribedSemester(
    adminClient,
    input.id,
    {
      amount: parsed.data.amount,
      status: parsed.data.status,
    }
  );

  if (error) {
    return {
      success: false,
      error: "Unable to update subscription. Please try again.",
    };
  }

  return { success: true, message: "Subscribed semester updated." };
}

export async function createScheduledPaymentForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  input: {
    subscribed_semester_id: string;
    payment_date: string;
    amount: string | number;
    status: ScheduledPaymentStatusValue;
    note?: string;
  }
): Promise<AccountingMutationResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = createScheduledPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const subscriptionCheck = await assertSubscribedSemesterExists(
    adminClient,
    parsed.data.subscribed_semester_id
  );

  if (!subscriptionCheck.success) {
    return { success: false, error: subscriptionCheck.error };
  }

  const { error } = await scheduledPaymentRepository.createScheduledPayment(
    adminClient,
    {
      subscribed_semester_id: parsed.data.subscribed_semester_id,
      payment_date: new Date(parsed.data.payment_date).toISOString(),
      amount: parseScheduledPaymentAmount(parsed.data.amount),
      status: parsed.data.status,
      note: parsed.data.note?.trim() || null,
    }
  );

  if (error) {
    return {
      success: false,
      error: "Unable to create scheduled payment. Please try again.",
    };
  }

  return { success: true, message: "Scheduled payment created." };
}

export async function updateScheduledPaymentForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  input: {
    id: string;
    payment_date: string;
    amount: string | number;
    status: ScheduledPaymentStatusValue;
    note?: string;
  }
): Promise<AccountingMutationResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = updateScheduledPaymentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await scheduledPaymentRepository.findScheduledPaymentById(
    adminClient,
    input.id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Scheduled payment not found." };
  }

  const { error } = await scheduledPaymentRepository.updateScheduledPayment(
    adminClient,
    input.id,
    {
      payment_date: new Date(parsed.data.payment_date).toISOString(),
      amount: parseScheduledPaymentAmount(parsed.data.amount),
      status: parsed.data.status,
      note: parsed.data.note?.trim() || null,
    }
  );

  if (error) {
    return {
      success: false,
      error: "Unable to update scheduled payment. Please try again.",
    };
  }

  return { success: true, message: "Scheduled payment updated." };
}
