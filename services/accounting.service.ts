import {
  isSubscriptionOpenForPaymentAlerts,
  resolveManageAccountingAlert,
} from "@/lib/constants/manager-accounting-payment-alert";
import {
  ACCOUNT_SPECIAL_CASE_STATUSES,
  ACCOUNT_SPECIAL_CASE_STATUS_VALUES,
  ACCOUNT_SPECIAL_CASE_TYPES,
  ACCOUNT_SPECIAL_CASE_TYPE_VALUES,
  computeSpecialCasePercentageDiscount,
  type AccountSpecialCaseStatusValue,
  type AccountSpecialCaseTypeValue,
} from "@/lib/constants/manager-account-special-case";
import {
  SCHEDULED_PAYMENT_STATUSES,
  SCHEDULED_PAYMENT_STATUS_VALUES,
  type ScheduledPaymentStatusValue,
} from "@/lib/constants/manager-scheduled-payment-status";
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
  createAccountSpecialCaseSchema,
  updateAccountSpecialCaseSchema,
} from "@/lib/validators/manager/account-special-case";
import {
  createScheduledPaymentSchema,
  parseScheduledPaymentAmount,
  updateScheduledPaymentSchema,
} from "@/lib/validators/manager/scheduled-payment";
import { updatePaymentSchema } from "@/lib/validators/manager/update-payment";
import { updateSubscribedSemesterSchema } from "@/lib/validators/manager/update-subscribed-semester";
import {
  getBillingMutationLockMessage,
  getSubscriptionBillingGate,
  resolveActiveSpecialCaseOwedAmount,
} from "@/lib/manager/subscribed-semester-billing";
import * as accountRepository from "@/repositories/account.repository";
import * as accountSpecialCaseRepository from "@/repositories/account-special-case.repository";
import * as paymentRepository from "@/repositories/payment.repository";
import type { PaymentRecord } from "@/repositories/payment.repository";
import * as scheduledPaymentRepository from "@/repositories/scheduled-payment.repository";
import * as semesterRepository from "@/repositories/semester.repository";
import * as studentProfileRepository from "@/repositories/student-profile.repository";
import * as studentSemesterRepository from "@/repositories/student-semester.repository";
import * as subscribedSemesterRepository from "@/repositories/subscribed-semester.repository";
import type { SubscribedSemesterRecord } from "@/repositories/subscribed-semester.repository";
import {
  recordManagerAuditLog,
  type AuditActor,
} from "@/services/audit-log.service";
import { listStudentsForManager } from "@/services/student.service";
import {
  ensureSubscribedSemesterForAccount,
} from "@/services/subscribed-semester.service";
import type { FieldErrors } from "@/types/auth";
import type { ManagerAccountSpecialCaseRow } from "@/types/manager-account-special-case";
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

function mapSpecialCaseType(value: string): AccountSpecialCaseTypeValue | null {
  if (
    ACCOUNT_SPECIAL_CASE_TYPE_VALUES.includes(
      value as AccountSpecialCaseTypeValue
    )
  ) {
    return value as AccountSpecialCaseTypeValue;
  }

  return null;
}

function mapSpecialCaseStatus(
  value: string
): AccountSpecialCaseStatusValue | null {
  if (
    ACCOUNT_SPECIAL_CASE_STATUS_VALUES.includes(
      value as AccountSpecialCaseStatusValue
    )
  ) {
    return value as AccountSpecialCaseStatusValue;
  }

  return null;
}

function specialCaseKey(accountId: string, semesterId: string) {
  return `${accountId}:${semesterId}`;
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

function listPaidAtsForSubscription(
  payments: PaymentRecord[],
  subscribedSemesterId: string
): Array<string | null> {
  return payments
    .filter((payment) => payment.subscribed_semester_id === subscribedSemesterId)
    .map((payment) => payment.paid_at);
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

  const scheduledPaymentsResult =
    await scheduledPaymentRepository.listScheduledPaymentsBySubscribedSemesterIds(
      adminClient,
      subscriptionIds
    );

  if (scheduledPaymentsResult.error) {
    throw new Error(scheduledPaymentsResult.error.message);
  }

  const payments = paymentsResult.data ?? [];
  const scheduledPayments = scheduledPaymentsResult.data ?? [];
  const subscriptionIdsWithMissedSchedule = new Set(
    scheduledPayments
      .filter((row) => row.status === SCHEDULED_PAYMENT_STATUSES.MISSED)
      .map((row) => row.subscribed_semester_id)
  );
  const subscriptionIdsWithSchedule = new Set(
    scheduledPayments.map((row) => row.subscribed_semester_id)
  );
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
    subscriptionIdsWithMissedSchedule,
    subscriptionIdsWithSchedule,
  };
}

function getSubscriptionBilling(
  subscription: SubscribedSemesterRecord | undefined,
  payments: PaymentRecord[],
  activeSpecialCaseTotalAmount?: number | null
) {
  if (!subscription) {
    return null;
  }

  const paid = sumPayments(payments, subscription.id);
  const gate = getSubscriptionBillingGate({
    status: subscription.status,
    subscriptionAmount: Number(subscription.amount ?? 0),
    totalPaid: paid,
    activeSpecialCaseTotalAmount,
  });

  return {
    total_amount: gate.owedAmount,
    total_paid: paid,
    balance_due: gate.remainingDue,
  };
}

function listOpenBillingSubscriptions(
  subscriptions: SubscribedSemesterRecord[],
  payments: PaymentRecord[],
  accountId: string | undefined,
  specialCaseByAccountSemester?: Map<
    string,
    { status: string; total_amount: number | null }
  >
) {
  return subscriptions.filter((subscription) => {
    const special =
      accountId && subscription.semester_id && specialCaseByAccountSemester
        ? specialCaseByAccountSemester.get(
            specialCaseKey(accountId, subscription.semester_id)
          )
        : undefined;

    return isSubscriptionOpenForPaymentAlerts({
      status: subscription.status,
      subscriptionAmount: Number(subscription.amount ?? 0),
      totalPaid: sumPayments(payments, subscription.id),
      activeSpecialCaseTotalAmount: getActiveSpecialCaseTotal(special),
    });
  });
}

function getActiveSpecialCaseTotal(
  specialCase: { status: string; total_amount: number | null } | null | undefined
): number | null {
  return resolveActiveSpecialCaseOwedAmount(
    specialCase
      ? {
          status: specialCase.status,
          total_amount: Number(specialCase.total_amount ?? 0),
        }
      : null
  );
}

function getAccountBillingTotals(
  subscriptions: SubscribedSemesterRecord[],
  payments: PaymentRecord[],
  specialCaseByAccountSemester?: Map<
    string,
    { status: string; total_amount: number | null }
  >
) {
  let totalOwed = 0;
  let totalPaid = 0;
  let totalDue = 0;

  for (const subscription of subscriptions) {
    const special =
      subscription.semester_id && specialCaseByAccountSemester
        ? specialCaseByAccountSemester.get(
            specialCaseKey(subscription.account_id, subscription.semester_id)
          )
        : undefined;
    const billing = getSubscriptionBilling(
      subscription,
      payments,
      getActiveSpecialCaseTotal(special)
    );

    if (!billing) {
      continue;
    }

    totalOwed += billing.total_amount;
    totalPaid += billing.total_paid;
    totalDue += billing.balance_due;
  }

  return {
    total_amount: roundCurrency(totalOwed),
    total_paid: roundCurrency(totalPaid),
    balance_due: roundCurrency(totalDue),
  };
}

async function ensureBillingSubscriptionsForStudent(
  adminClient: Supabase,
  accountId: string,
  studentProfileId: string
) {
  const enrollmentsResult =
    await studentSemesterRepository.listEnrollmentsByStudentProfileId(
      adminClient,
      studentProfileId
    );

  if (enrollmentsResult.error) {
    throw new Error(enrollmentsResult.error.message);
  }

  for (const enrollment of enrollmentsResult.data ?? []) {
    await ensureSubscribedSemesterForAccount(
      adminClient,
      accountId,
      enrollment.semester_id
    );
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
  let {
    accountByUserId,
    subscriptionsByAccountId,
    payments,
    subscriptionIdsWithMissedSchedule,
    subscriptionIdsWithSchedule,
  } = await buildBillingMaps(
    adminClient,
    students.map((student) => student.user_id)
  );

  let createdMissingSubscriptions = false;
  for (const enrollment of enrollmentsResult.data ?? []) {
    const student = studentsByProfileId.get(enrollment.student_profile_id);
    if (!student) {
      continue;
    }

    const account = accountByUserId.get(student.user_id);
    if (!account) {
      continue;
    }

    const hasSubscription = (subscriptionsByAccountId.get(account.id) ?? []).some(
      (row) => row.semester_id === enrollment.semester_id
    );
    if (hasSubscription) {
      continue;
    }

    const created = await ensureSubscribedSemesterForAccount(
      adminClient,
      account.id,
      enrollment.semester_id
    );
    if (created) {
      createdMissingSubscriptions = true;
    }
  }

  if (createdMissingSubscriptions) {
    ({
      accountByUserId,
      subscriptionsByAccountId,
      payments,
      subscriptionIdsWithMissedSchedule,
      subscriptionIdsWithSchedule,
    } = await buildBillingMaps(
      adminClient,
      students.map((student) => student.user_id)
    ));
  }

  const accountIds = Array.from(accountByUserId.values()).map(
    (account) => account.id
  );
  const specialCasesResult =
    await accountSpecialCaseRepository.listSpecialCasesByAccountIds(
      adminClient,
      accountIds
    );

  if (specialCasesResult.error) {
    throw new Error(specialCasesResult.error.message);
  }

  const specialCaseByAccountSemester = new Map(
    (specialCasesResult.data ?? []).map((row) => [
      specialCaseKey(row.account_id, row.semester_id),
      row,
    ])
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
    const openBillingSubscriptions = listOpenBillingSubscriptions(
      subscriptions,
      payments,
      account?.id,
      specialCaseByAccountSemester
    );
    const subscription = subscriptions.find(
      (row) => row.semester_id === enrollment.semester_id
    );
    const singleOpenSubscription =
      openBillingSubscriptions.length === 1
        ? openBillingSubscriptions[0]
        : undefined;
    const isFocusOpenSubscription =
      openBillingSubscriptions.length !== 1 ||
      singleOpenSubscription?.semester_id === enrollment.semester_id;
    const specialCase = account
      ? specialCaseByAccountSemester.get(
          specialCaseKey(account.id, enrollment.semester_id)
        )
      : undefined;
    const specialCaseStatus = specialCase
      ? mapSpecialCaseStatus(specialCase.status)
      : null;
    const isActiveSpecialCase =
      specialCaseStatus === ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE;
    const specialCaseType =
      isActiveSpecialCase && specialCase
        ? mapSpecialCaseType(specialCase.case_type)
        : null;
    const billing = getSubscriptionBilling(
      subscription,
      payments,
      isActiveSpecialCase && specialCase
        ? Number(specialCase.total_amount ?? 0)
        : null
    );
    const totalPaid = billing?.total_paid ?? 0;

    const focusSubscription = singleOpenSubscription;
    const focusSpecial =
      account && focusSubscription?.semester_id
        ? specialCaseByAccountSemester.get(
            specialCaseKey(account.id, focusSubscription.semester_id)
          )
        : undefined;
    const focusSpecialActive =
      mapSpecialCaseStatus(focusSpecial?.status ?? "") ===
      ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE;

    const paymentAlert = resolveManageAccountingAlert({
      openBillingCount: openBillingSubscriptions.length,
      isFocusOpenSubscription,
      totalPaid: focusSubscription
        ? (getSubscriptionBilling(
            focusSubscription,
            payments,
            focusSpecialActive && focusSpecial
              ? Number(focusSpecial.total_amount ?? 0)
              : null
          )?.total_paid ?? 0)
        : totalPaid,
      paidAts: focusSubscription
        ? listPaidAtsForSubscription(payments, focusSubscription.id)
        : [],
      semesterAmount: focusSubscription
        ? Number(focusSubscription.amount ?? 0)
        : null,
      activeSpecialCaseTotalAmount:
        focusSpecialActive && focusSpecial
          ? Number(focusSpecial.total_amount ?? 0)
          : null,
      hasScheduledPayments: focusSubscription
        ? subscriptionIdsWithSchedule.has(focusSubscription.id)
        : false,
      hasMissedScheduledPayment: focusSubscription
        ? subscriptionIdsWithMissedSchedule.has(focusSubscription.id)
        : false,
    });

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
      payment_alert: paymentAlert.payment_alert,
      low_payment: paymentAlert.low_payment,
      payment_missed_months: paymentAlert.payment_missed_months,
      payment_alert_reasons: paymentAlert.payment_alert_reasons,
      special_case_type: specialCaseType,
      special_case_no_money:
        specialCaseType === ACCOUNT_SPECIAL_CASE_TYPES.SCHOLARSHIP &&
        totalPaid === 0 &&
        Number(specialCase?.total_amount ?? 0) > 0,
      has_missed_scheduled_payment: subscription
        ? subscriptionIdsWithMissedSchedule.has(subscription.id)
        : false,
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
    const openBillingSubscriptions = listOpenBillingSubscriptions(
      subscriptions,
      payments,
      account?.id,
      specialCaseByAccountSemester
    );
    const billing = getAccountBillingTotals(
      subscriptions,
      payments,
      specialCaseByAccountSemester
    );
    const focusSubscription =
      openBillingSubscriptions.length === 1
        ? openBillingSubscriptions[0]
        : undefined;
    const focusSpecial =
      account && focusSubscription?.semester_id
        ? specialCaseByAccountSemester.get(
            specialCaseKey(account.id, focusSubscription.semester_id)
          )
        : undefined;
    const focusSpecialStatus = focusSpecial
      ? mapSpecialCaseStatus(focusSpecial.status)
      : null;
    const isActiveFocusSpecial =
      focusSpecialStatus === ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE;
    const paymentAlert = resolveManageAccountingAlert({
      openBillingCount: openBillingSubscriptions.length,
      isFocusOpenSubscription: true,
      totalPaid: focusSubscription
        ? (getSubscriptionBilling(
            focusSubscription,
            payments,
            isActiveFocusSpecial && focusSpecial
              ? Number(focusSpecial.total_amount ?? 0)
              : null
          )?.total_paid ?? 0)
        : billing.total_paid,
      paidAts: focusSubscription
        ? listPaidAtsForSubscription(payments, focusSubscription.id)
        : [],
      semesterAmount: focusSubscription
        ? Number(focusSubscription.amount ?? 0)
        : null,
      activeSpecialCaseTotalAmount:
        isActiveFocusSpecial && focusSpecial
          ? Number(focusSpecial.total_amount ?? 0)
          : null,
      hasScheduledPayments: focusSubscription
        ? subscriptionIdsWithSchedule.has(focusSubscription.id)
        : false,
      hasMissedScheduledPayment: focusSubscription
        ? subscriptionIdsWithMissedSchedule.has(focusSubscription.id)
        : false,
    });

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
      payment_alert: paymentAlert.payment_alert,
      low_payment: paymentAlert.low_payment,
      payment_missed_months: paymentAlert.payment_missed_months,
      payment_alert_reasons: paymentAlert.payment_alert_reasons,
      special_case_type: null,
      special_case_no_money: false,
      has_missed_scheduled_payment: subscriptions.some((subscription) =>
        subscriptionIdsWithMissedSchedule.has(subscription.id)
      ),
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

  const [paymentsResult, scheduledPaymentsResult, specialCasesResult] =
    await Promise.all([
      paymentRepository.listPaymentsBySubscribedSemesterIds(
        adminClient,
        subscriptionIds
      ),
      scheduledPaymentRepository.listScheduledPaymentsBySubscribedSemesterIds(
        adminClient,
        subscriptionIds
      ),
      accountSpecialCaseRepository.listSpecialCasesByAccountId(
        adminClient,
        accountResult.data.id
      ),
    ]);

  if (paymentsResult.error) {
    throw new Error(paymentsResult.error.message);
  }

  if (scheduledPaymentsResult.error) {
    throw new Error(scheduledPaymentsResult.error.message);
  }

  if (specialCasesResult.error) {
    throw new Error(specialCasesResult.error.message);
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

  const specialCaseRows: ManagerAccountSpecialCaseRow[] = (
    specialCasesResult.data ?? []
  ).flatMap((row) => {
    const caseType = mapSpecialCaseType(row.case_type);
    const status = mapSpecialCaseStatus(row.status);
    if (!caseType || !status) {
      return [];
    }

    return [
      {
        id: row.id,
        account_id: row.account_id,
        semester_id: row.semester_id,
        semester_name: semesterNameById.get(row.semester_id) ?? "—",
        total_amount: Number(row.total_amount ?? 0),
        percentage_discount: Number(row.percentage_discount ?? 0),
        explanation: row.explanation,
        approved_by: row.approved_by,
        case_type: caseType,
        status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
    ];
  });

  const specialCaseByAccountSemester = new Map(
    (specialCasesResult.data ?? []).map((row) => [
      specialCaseKey(row.account_id, row.semester_id),
      row,
    ])
  );
  const totals = getAccountBillingTotals(
    subscriptions,
    payments,
    specialCaseByAccountSemester
  );
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
      (row) =>
        row.status === SUBSCRIBED_SEMESTER_STATUSES.PENDING ||
        row.status === SUBSCRIBED_SEMESTER_STATUSES.PAUSED
    ).length,
  };

  return {
    overview,
    subscriptions: subscriptionRows,
    payments: paymentRows,
    scheduledPayments: scheduledPaymentRows,
    specialCases: specialCaseRows,
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

async function loadSubscriptionBillingContext(
  adminClient: Supabase,
  subscription: SubscribedSemesterRecord,
  options?: { excludePaymentId?: string }
) {
  const [paymentsResult, specialCaseResult] = await Promise.all([
    paymentRepository.listPaymentsBySubscribedSemesterIds(adminClient, [
      subscription.id,
    ]),
    subscription.semester_id
      ? accountSpecialCaseRepository.findSpecialCaseByAccountAndSemester(
          adminClient,
          subscription.account_id,
          subscription.semester_id
        )
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (paymentsResult.error) {
    return { success: false as const, error: paymentsResult.error.message };
  }

  if (specialCaseResult.error) {
    return { success: false as const, error: specialCaseResult.error.message };
  }

  const payments = (paymentsResult.data ?? []).filter(
    (payment) => payment.id !== options?.excludePaymentId
  );
  const totalPaid = roundCurrency(
    payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0)
  );
  const gate = getSubscriptionBillingGate({
    status: subscription.status,
    subscriptionAmount: Number(subscription.amount ?? 0),
    totalPaid,
    activeSpecialCaseTotalAmount: resolveActiveSpecialCaseOwedAmount(
      specialCaseResult.data
        ? {
            status: specialCaseResult.data.status,
            total_amount: Number(specialCaseResult.data.total_amount ?? 0),
          }
        : null
    ),
  });

  return { success: true as const, payments, gate };
}

async function syncSubscriptionPaidStatus(
  adminClient: Supabase,
  subscription: SubscribedSemesterRecord,
  totalPaidAfter: number,
  owedAmount: number
) {
  if (totalPaidAfter >= owedAmount) {
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

    return;
  }

  if (subscription.status !== SUBSCRIBED_SEMESTER_STATUSES.PAID) {
    return;
  }

  const { error } = await subscribedSemesterRepository.updateSubscribedSemester(
    adminClient,
    subscription.id,
    {
      amount: Number(subscription.amount ?? 0),
      status: SUBSCRIBED_SEMESTER_STATUSES.PENDING,
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

async function syncSubscriptionStatusForAccountSemester(
  adminClient: Supabase,
  accountId: string,
  semesterId: string
) {
  const subscription = await ensureSubscribedSemesterForAccount(
    adminClient,
    accountId,
    semesterId
  );

  if (!subscription) {
    return;
  }

  const billingContext = await loadSubscriptionBillingContext(
    adminClient,
    subscription
  );

  if (!billingContext.success) {
    throw new Error(billingContext.error);
  }

  await syncSubscriptionPaidStatus(
    adminClient,
    subscription,
    billingContext.gate.totalPaid,
    billingContext.gate.owedAmount
  );
}

export async function createPaymentForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
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

  const billingContext = await loadSubscriptionBillingContext(
    adminClient,
    subscriptionCheck.data
  );

  if (!billingContext.success) {
    return { success: false, error: billingContext.error };
  }

  if (!billingContext.gate.canCreatePayments) {
    return {
      success: false,
      error: getBillingMutationLockMessage(
        billingContext.gate.createLockReason,
        "create_payment"
      ),
    };
  }

  if (parsed.data.amount > billingContext.gate.remainingDue) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: [
          `Amount cannot exceed the remaining due (${billingContext.gate.remainingDue}).`,
        ],
      },
    };
  }

  const { data, error } = await paymentRepository.createPayment(adminClient, {
    subscribed_semester_id: parsed.data.subscribed_semester_id,
    amount: parsed.data.amount,
    currency: parsed.data.currency,
    method: parsed.data.method,
    paid_at: new Date(parsed.data.paid_at).toISOString(),
  });

  if (error || !data) {
    return { success: false, error: "Unable to record payment. Please try again." };
  }

  const paymentsAfterResult =
    await paymentRepository.listPaymentsBySubscribedSemesterIds(adminClient, [
      parsed.data.subscribed_semester_id,
    ]);

  if (paymentsAfterResult.error) {
    await paymentRepository.deletePayment(adminClient, data.id);
    return {
      success: false,
      error: paymentsAfterResult.error.message,
    };
  }

  const totalPaidAfter = roundCurrency(
    (paymentsAfterResult.data ?? []).reduce(
      (sum, payment) => sum + Number(payment.amount ?? 0),
      0
    )
  );

  if (totalPaidAfter > billingContext.gate.owedAmount) {
    await paymentRepository.deletePayment(adminClient, data.id);
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: [
          `Amount exceeds the remaining due after a concurrent update (${billingContext.gate.remainingDue}).`,
        ],
      },
    };
  }

  try {
    await syncSubscriptionPaidStatus(
      adminClient,
      subscriptionCheck.data,
      totalPaidAfter,
      billingContext.gate.owedAmount
    );
  } catch (err) {
    await paymentRepository.deletePayment(adminClient, data.id);
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unable to update subscription status. Payment was not kept.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "warning",
    table_name: "payments",
    record_id: data.id,
    new_data: {
      subscribed_semester_id: data.subscribed_semester_id,
      amount: data.amount,
      currency: data.currency,
      method: data.method,
      paid_at: data.paid_at,
    },
    metadata: { note: "Payment recorded." },
  });

  return { success: true, message: "Payment recorded." };
}

export async function updatePaymentForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
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

  const subscriptionCheck = await assertSubscribedSemesterExists(
    adminClient,
    existing.data.subscribed_semester_id
  );

  if (!subscriptionCheck.success) {
    return { success: false, error: subscriptionCheck.error };
  }

  const lockContext = await loadSubscriptionBillingContext(
    adminClient,
    subscriptionCheck.data
  );

  if (!lockContext.success) {
    return { success: false, error: lockContext.error };
  }

  if (!lockContext.gate.canEditPayments) {
    return {
      success: false,
      error: getBillingMutationLockMessage(
        lockContext.gate.editLockReason,
        "edit_payment"
      ),
    };
  }

  const billingContext = await loadSubscriptionBillingContext(
    adminClient,
    subscriptionCheck.data,
    { excludePaymentId: existing.data.id }
  );

  if (!billingContext.success) {
    return { success: false, error: billingContext.error };
  }

  if (parsed.data.amount > billingContext.gate.remainingDue) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: [
          `Amount cannot exceed the remaining due (${billingContext.gate.remainingDue}).`,
        ],
      },
    };
  }

  const { data, error } = await paymentRepository.updatePayment(
    adminClient,
    input.id,
    {
      subscribed_semester_id: existing.data.subscribed_semester_id,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      method: parsed.data.method,
      paid_at: new Date(parsed.data.paid_at).toISOString(),
    }
  );

  if (error || !data) {
    return { success: false, error: "Unable to update payment. Please try again." };
  }

  const totalPaidAfter = roundCurrency(
    billingContext.gate.totalPaid + Number(data.amount ?? 0)
  );

  try {
    await syncSubscriptionPaidStatus(
      adminClient,
      subscriptionCheck.data,
      totalPaidAfter,
      billingContext.gate.owedAmount
    );
  } catch (err) {
    await paymentRepository.updatePayment(adminClient, input.id, {
      subscribed_semester_id: existing.data.subscribed_semester_id,
      amount: Number(existing.data.amount ?? 0),
      currency: existing.data.currency ?? "USD",
      method: existing.data.method ?? "bank_transfer",
      paid_at: existing.data.paid_at ?? new Date().toISOString(),
    });
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unable to update subscription status. Payment changes were reverted.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "payments",
    record_id: data.id,
    old_data: {
      amount: existing.data.amount,
      currency: existing.data.currency,
      method: existing.data.method,
      paid_at: existing.data.paid_at,
    },
    new_data: {
      amount: data.amount,
      currency: data.currency,
      method: data.method,
      paid_at: data.paid_at,
    },
    metadata: {
      note: "Payment updated.",
      changed_fields: ["amount", "currency", "method", "paid_at"],
    },
  });

  return { success: true, message: "Payment updated." };
}

export async function deletePaymentForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: { id: string }
): Promise<AccountingMutationResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const paymentId = typeof input.id === "string" ? input.id.trim() : "";

  if (!paymentId) {
    return { success: false, error: "Payment is required." };
  }

  const existing = await paymentRepository.findPaymentById(adminClient, paymentId);

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Payment not found." };
  }

  const subscriptionCheck = await assertSubscribedSemesterExists(
    adminClient,
    existing.data.subscribed_semester_id
  );

  if (!subscriptionCheck.success) {
    return { success: false, error: subscriptionCheck.error };
  }

  const billingContext = await loadSubscriptionBillingContext(
    adminClient,
    subscriptionCheck.data
  );

  if (!billingContext.success) {
    return { success: false, error: billingContext.error };
  }

  if (!billingContext.gate.canDeletePayments) {
    return {
      success: false,
      error: getBillingMutationLockMessage(
        billingContext.gate.editLockReason,
        "delete_payment"
      ),
    };
  }

  const { data, error } = await paymentRepository.deletePayment(
    adminClient,
    paymentId
  );

  if (error || !data) {
    return { success: false, error: "Unable to delete payment. Please try again." };
  }

  const totalPaidAfter = roundCurrency(
    billingContext.gate.totalPaid - Number(existing.data.amount ?? 0)
  );

  try {
    await syncSubscriptionPaidStatus(
      adminClient,
      subscriptionCheck.data,
      Math.max(totalPaidAfter, 0),
      billingContext.gate.owedAmount
    );
  } catch (err) {
    await paymentRepository.createPayment(adminClient, {
      subscribed_semester_id: existing.data.subscribed_semester_id,
      amount: Number(existing.data.amount ?? 0),
      currency: existing.data.currency ?? "USD",
      method: existing.data.method ?? "bank_transfer",
      paid_at: existing.data.paid_at ?? new Date().toISOString(),
    });
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Unable to update subscription status. Payment deletion was reverted.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "delete",
    severity: "critical",
    table_name: "payments",
    record_id: data.id,
    old_data: {
      subscribed_semester_id: existing.data.subscribed_semester_id,
      amount: existing.data.amount,
      currency: existing.data.currency,
      method: existing.data.method,
      paid_at: existing.data.paid_at,
    },
    metadata: { note: "Payment deleted." },
  });

  return { success: true, message: "Payment deleted." };
}

export async function updateSubscribedSemesterForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
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

  const existingStatus = subscriptionCheck.data.status;
  const nextStatus = parsed.data.status;

  if (
    existingStatus === SUBSCRIBED_SEMESTER_STATUSES.PAID &&
    nextStatus !== SUBSCRIBED_SEMESTER_STATUSES.PAID
  ) {
    return {
      success: false,
      error: "Paid subscriptions cannot change status.",
    };
  }

  if (
    existingStatus !== SUBSCRIBED_SEMESTER_STATUSES.PAID &&
    nextStatus === SUBSCRIBED_SEMESTER_STATUSES.PAID
  ) {
    return {
      success: false,
      error:
        "Paid status is set automatically when payments cover the amount owed.",
    };
  }

  const { data, error } = await subscribedSemesterRepository.updateSubscribedSemester(
    adminClient,
    input.id,
    {
      amount: parsed.data.amount,
      status: parsed.data.status,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: "Unable to update subscription. Please try again.",
    };
  }

  const billingContext = await loadSubscriptionBillingContext(adminClient, data);

  if (!billingContext.success) {
    return { success: false, error: billingContext.error };
  }

  try {
    await syncSubscriptionPaidStatus(
      adminClient,
      data,
      billingContext.gate.totalPaid,
      billingContext.gate.owedAmount
    );
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Subscription updated, but paid status could not be synced.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "subscribed_semesters",
    record_id: data.id,
    old_data: {
      amount: subscriptionCheck.data.amount,
      status: subscriptionCheck.data.status,
    },
    new_data: {
      amount: data.amount,
      status: data.status,
    },
    metadata: {
      note: "Subscribed semester updated.",
      changed_fields: ["amount", "status"],
    },
  });

  return { success: true, message: "Subscribed semester updated." };
}

export async function createScheduledPaymentForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
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

  const billingContext = await loadSubscriptionBillingContext(
    adminClient,
    subscriptionCheck.data
  );

  if (!billingContext.success) {
    return { success: false, error: billingContext.error };
  }

  if (!billingContext.gate.canMutateSchedules) {
    return {
      success: false,
      error: getBillingMutationLockMessage(
        billingContext.gate.lockReason,
        "schedules"
      ),
    };
  }

  const scheduleAmount = parseScheduledPaymentAmount(parsed.data.amount);

  if (
    scheduleAmount !== null &&
    scheduleAmount > billingContext.gate.remainingDue
  ) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: [
          `Amount cannot exceed the remaining due (${billingContext.gate.remainingDue}).`,
        ],
      },
    };
  }

  const { data, error } = await scheduledPaymentRepository.createScheduledPayment(
    adminClient,
    {
      subscribed_semester_id: parsed.data.subscribed_semester_id,
      payment_date: new Date(parsed.data.payment_date).toISOString(),
      amount: scheduleAmount,
      status: parsed.data.status,
      note: parsed.data.note?.trim() || null,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: "Unable to create scheduled payment. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "warning",
    table_name: "scheduled_payments",
    record_id: data.id,
    new_data: {
      subscribed_semester_id: data.subscribed_semester_id,
      payment_date: data.payment_date,
      amount: data.amount,
      status: data.status,
      note: data.note,
    },
    metadata: { note: "Scheduled payment created." },
  });

  return { success: true, message: "Scheduled payment created." };
}

export async function updateScheduledPaymentForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
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

  const subscriptionCheck = await assertSubscribedSemesterExists(
    adminClient,
    existing.data.subscribed_semester_id
  );

  if (!subscriptionCheck.success) {
    return { success: false, error: subscriptionCheck.error };
  }

  const billingContext = await loadSubscriptionBillingContext(
    adminClient,
    subscriptionCheck.data
  );

  if (!billingContext.success) {
    return { success: false, error: billingContext.error };
  }

  if (!billingContext.gate.canMutateSchedules) {
    return {
      success: false,
      error: getBillingMutationLockMessage(
        billingContext.gate.lockReason,
        "schedules"
      ),
    };
  }

  const scheduleAmount = parseScheduledPaymentAmount(parsed.data.amount);

  if (
    scheduleAmount !== null &&
    scheduleAmount > billingContext.gate.remainingDue
  ) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: {
        amount: [
          `Amount cannot exceed the remaining due (${billingContext.gate.remainingDue}).`,
        ],
      },
    };
  }

  const { data, error } = await scheduledPaymentRepository.updateScheduledPayment(
    adminClient,
    input.id,
    {
      payment_date: new Date(parsed.data.payment_date).toISOString(),
      amount: scheduleAmount,
      status: parsed.data.status,
      note: parsed.data.note?.trim() || null,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: "Unable to update scheduled payment. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "scheduled_payments",
    record_id: data.id,
    old_data: {
      payment_date: existing.data.payment_date,
      amount: existing.data.amount,
      status: existing.data.status,
      note: existing.data.note,
    },
    new_data: {
      payment_date: data.payment_date,
      amount: data.amount,
      status: data.status,
      note: data.note,
    },
    metadata: {
      note: "Scheduled payment updated.",
      changed_fields: ["payment_date", "amount", "status", "note"],
    },
  });

  return { success: true, message: "Scheduled payment updated." };
}

export async function createAccountSpecialCaseForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    account_id: string;
    semester_id: string;
    total_amount: number;
    explanation: string;
    case_type: string;
    status: string;
  }
): Promise<AccountingMutationResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = createAccountSpecialCaseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const [accountResult, semesterResult, existingResult] = await Promise.all([
    accountRepository.findAccountById(adminClient, parsed.data.account_id),
    semesterRepository.findSemesterById(adminClient, parsed.data.semester_id),
    accountSpecialCaseRepository.findSpecialCaseByAccountAndSemester(
      adminClient,
      parsed.data.account_id,
      parsed.data.semester_id
    ),
  ]);

  if (accountResult.error) {
    return { success: false, error: accountResult.error.message };
  }

  if (!accountResult.data) {
    return { success: false, error: "Account not found." };
  }

  if (semesterResult.error) {
    return { success: false, error: semesterResult.error.message };
  }

  if (!semesterResult.data) {
    return { success: false, error: "Semester not found." };
  }

  if (existingResult.error) {
    return { success: false, error: existingResult.error.message };
  }

  if (existingResult.data) {
    return {
      success: false,
      error: "A special case already exists for this account and semester.",
    };
  }

  const subscription = await ensureSubscribedSemesterForAccount(
    adminClient,
    parsed.data.account_id,
    parsed.data.semester_id
  );
  const discountBaseAmount = subscription
    ? Number(subscription.amount ?? 0)
    : Number(semesterResult.data.amount ?? 0);
  const percentageDiscount = computeSpecialCasePercentageDiscount(
    discountBaseAmount,
    parsed.data.total_amount
  );

  const { data, error } = await accountSpecialCaseRepository.createSpecialCase(
    adminClient,
    {
      account_id: parsed.data.account_id,
      semester_id: parsed.data.semester_id,
      total_amount: parsed.data.total_amount,
      percentage_discount: percentageDiscount,
      explanation: parsed.data.explanation,
      approved_by: actor.userId,
      case_type: parsed.data.case_type,
      status: parsed.data.status,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: "Unable to create special case. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "insert",
    severity: "warning",
    table_name: "account_special_cases",
    record_id: data.id,
    new_data: {
      account_id: data.account_id,
      semester_id: data.semester_id,
      total_amount: data.total_amount,
      percentage_discount: data.percentage_discount,
      case_type: data.case_type,
      status: data.status,
      approved_by: data.approved_by,
    },
    metadata: { note: "Account special case created." },
  });

  try {
    await syncSubscriptionStatusForAccountSemester(
      adminClient,
      data.account_id,
      data.semester_id
    );
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Special case created, but subscription status could not be synced.",
    };
  }

  return { success: true, message: "Special case created." };
}

export async function updateAccountSpecialCaseForManager(
  adminClient: Supabase,
  actorRole: RoleValue | null,
  actor: AuditActor,
  input: {
    id: string;
    total_amount: number;
    explanation: string;
    case_type: string;
    status: string;
  }
): Promise<AccountingMutationResult> {
  if (actorRole !== ROLES.MANAGER) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = updateAccountSpecialCaseSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the errors below.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existing = await accountSpecialCaseRepository.findSpecialCaseById(
    adminClient,
    parsed.data.id
  );

  if (existing.error) {
    return { success: false, error: existing.error.message };
  }

  if (!existing.data) {
    return { success: false, error: "Special case not found." };
  }

  const semesterResult = await semesterRepository.findSemesterById(
    adminClient,
    existing.data.semester_id
  );

  if (semesterResult.error) {
    return { success: false, error: semesterResult.error.message };
  }

  if (!semesterResult.data) {
    return { success: false, error: "Semester not found." };
  }

  const subscription = await ensureSubscribedSemesterForAccount(
    adminClient,
    existing.data.account_id,
    existing.data.semester_id
  );
  const discountBaseAmount = subscription
    ? Number(subscription.amount ?? 0)
    : Number(semesterResult.data.amount ?? 0);
  const percentageDiscount = computeSpecialCasePercentageDiscount(
    discountBaseAmount,
    parsed.data.total_amount
  );

  const { data, error } = await accountSpecialCaseRepository.updateSpecialCase(
    adminClient,
    parsed.data.id,
    {
      total_amount: parsed.data.total_amount,
      percentage_discount: percentageDiscount,
      explanation: parsed.data.explanation,
      case_type: parsed.data.case_type,
      status: parsed.data.status,
    }
  );

  if (error || !data) {
    return {
      success: false,
      error: "Unable to update special case. Please try again.",
    };
  }

  await recordManagerAuditLog(adminClient, actor, {
    action: "update",
    severity: "warning",
    table_name: "account_special_cases",
    record_id: data.id,
    old_data: {
      total_amount: existing.data.total_amount,
      percentage_discount: existing.data.percentage_discount,
      explanation: existing.data.explanation,
      case_type: existing.data.case_type,
      status: existing.data.status,
    },
    new_data: {
      total_amount: data.total_amount,
      percentage_discount: data.percentage_discount,
      explanation: data.explanation,
      case_type: data.case_type,
      status: data.status,
    },
    metadata: {
      note: "Account special case updated.",
      changed_fields: [
        "total_amount",
        "percentage_discount",
        "explanation",
        "case_type",
        "status",
      ],
    },
  });

  try {
    await syncSubscriptionStatusForAccountSemester(
      adminClient,
      data.account_id,
      data.semester_id
    );
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Special case updated, but subscription status could not be synced.",
    };
  }

  return { success: true, message: "Special case updated." };
}
