import {
  isOpenBillingSubscriptionStatus,
  resolveManageAccountingAlert,
} from "@/lib/constants/manager-accounting-payment-alert";
import { getManagerStudentAccountMock } from "@/lib/constants/manager-student-account-mock";
import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import { getManagerStudentSemesterMockSnapshot } from "@/lib/constants/manager-student-semester-mock";
import type { ManagerAccountingStudentRow } from "@/types/manager-student-semester";

function getBillingForEnrollment(
  studentProfileId: string,
  semesterId: string
) {
  const account = getManagerStudentAccountMock(studentProfileId);
  const subscription = account.subscriptions.find(
    (row) => row.semester_id === semesterId
  );

  if (!subscription) {
    return null;
  }

  const balanceDue = Math.max(subscription.amount - subscription.paid_amount, 0);
  const paidAts = account.payments
    .filter((payment) => payment.subscribed_semester_id === subscription.id)
    .map((payment) => payment.paid_at);

  return {
    total_amount: subscription.amount,
    total_paid: subscription.paid_amount,
    balance_due: balanceDue,
    paidAts,
    status: subscription.status,
  };
}

function getAccountBilling(studentProfileId: string) {
  const account = getManagerStudentAccountMock(studentProfileId);

  return {
    total_amount: account.overview.total_subscribed,
    total_paid: account.overview.total_paid,
    balance_due: account.overview.balance_due,
    openCount: account.subscriptions.filter((row) =>
      isOpenBillingSubscriptionStatus(row.status)
    ).length,
  };
}

export function getManagerAccountingStudentsPreview(): ManagerAccountingStudentRow[] {
  const enrollments = getManagerStudentSemesterMockSnapshot();
  const enrolledStudentIds = new Set(
    enrollments.map((row) => row.student_profile_id)
  );
  const rows: ManagerAccountingStudentRow[] = enrollments.map((row) => {
    const account = getManagerStudentAccountMock(row.student_profile_id);
    const openBillingSubscriptions = account.subscriptions.filter((sub) =>
      isOpenBillingSubscriptionStatus(sub.status)
    );
    const billing = getBillingForEnrollment(
      row.student_profile_id,
      row.semester_id
    );
    const singleOpen =
      openBillingSubscriptions.length === 1
        ? openBillingSubscriptions[0]
        : undefined;
    const paymentAlert = resolveManageAccountingAlert({
      openBillingCount: openBillingSubscriptions.length,
      isFocusOpenSubscription:
        openBillingSubscriptions.length !== 1 ||
        singleOpen?.semester_id === row.semester_id,
      totalPaid: singleOpen?.paid_amount ?? billing?.total_paid ?? 0,
      paidAts: billing?.paidAts ?? [],
      semesterAmount: singleOpen?.amount ?? billing?.total_amount ?? null,
      hasScheduledPayments: false,
      hasMissedScheduledPayment: false,
    });

    return {
      student_profile_id: row.student_profile_id,
      user_id: row.user_id,
      full_name: row.full_name,
      email: row.email,
      phone: row.phone,
      semester_id: row.semester_id,
      semester_name: row.semester_name,
      enrollment_status: row.status,
      enrolled_at: row.created_at,
      total_amount: billing?.total_amount ?? null,
      total_paid: billing?.total_paid ?? null,
      balance_due: billing?.balance_due ?? null,
      payment_alert: paymentAlert.payment_alert,
      low_payment: paymentAlert.low_payment,
      payment_missed_months: paymentAlert.payment_missed_months,
      payment_alert_reasons: paymentAlert.payment_alert_reasons,
      special_case_type: null,
      special_case_no_money: false,
      has_missed_scheduled_payment: false,
    };
  });

  for (const student of MANAGER_STUDENTS_MOCK) {
    if (enrolledStudentIds.has(student.student_profile_id)) {
      continue;
    }

    const billing = getAccountBilling(student.student_profile_id);
    const paymentAlert = resolveManageAccountingAlert({
      openBillingCount: billing.openCount,
      isFocusOpenSubscription: true,
      totalPaid: billing.total_paid,
      paidAts: [],
      hasScheduledPayments: false,
      hasMissedScheduledPayment: false,
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
      has_missed_scheduled_payment: false,
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

export function getManagerAccountingSemesterOptions() {
  return MANAGER_PHASES_MOCK.map((semester) => ({
    id: semester.id,
    name: semester.name,
  }));
}
