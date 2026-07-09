import { buildScheduledPaymentsForSubscriptions } from "@/lib/constants/manager-scheduled-payments-mock";
import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import { SUBSCRIBED_SEMESTER_STATUSES } from "@/lib/constants/manager-subscribed-semester-status";
import { getManagerStudentSemesterMockSnapshot } from "@/lib/constants/manager-student-semester-mock";
import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import type {
  ManagerStudentAccountDetails,
  ManagerStudentPaymentRow,
  ManagerSubscribedSemesterRow,
} from "@/types/manager-student-account";

const PAYMENT_METHODS = ["card", "cash", "bank_transfer"] as const;

function hashString(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) % 10_000;
  }

  return hash;
}

function mapEnrollmentStatusToSubscriptionStatus(
  enrollmentStatus: string,
  index: number
) {
  if (enrollmentStatus === "withdrawn") {
    return SUBSCRIBED_SEMESTER_STATUSES.CANCELLED;
  }

  if (enrollmentStatus === "inactive") {
    return SUBSCRIBED_SEMESTER_STATUSES.OVERDUE;
  }

  if (enrollmentStatus === "pending") {
    return SUBSCRIBED_SEMESTER_STATUSES.PENDING;
  }

  return index % 5 === 0
    ? SUBSCRIBED_SEMESTER_STATUSES.OVERDUE
    : SUBSCRIBED_SEMESTER_STATUSES.ACTIVE;
}

function buildSubscriptionsForStudent(studentProfileId: string) {
  const semesterAmountById = new Map(
    MANAGER_PHASES_MOCK.map((semester) => [semester.id, semester.amount])
  );
  const enrollments = getManagerStudentSemesterMockSnapshot().filter(
    (row) => row.student_profile_id === studentProfileId
  );

  return enrollments.map((enrollment, index) => {
    const amount = semesterAmountById.get(enrollment.semester_id) ?? 500;
    const status = mapEnrollmentStatusToSubscriptionStatus(
      enrollment.status,
      index
    );
    const paidRatio =
      status === SUBSCRIBED_SEMESTER_STATUSES.ACTIVE
        ? 1
        : status === SUBSCRIBED_SEMESTER_STATUSES.PENDING
          ? 0
          : status === SUBSCRIBED_SEMESTER_STATUSES.OVERDUE
            ? 0.45
            : 0.2;

    return {
      id: `sub-${enrollment.id}`,
      account_id: `acc-${enrollment.user_id.slice(0, 8)}`,
      semester_id: enrollment.semester_id,
      semester_name: enrollment.semester_name,
      amount,
      status,
      created_at: enrollment.created_at,
      paid_amount: Math.round(amount * paidRatio * 100) / 100,
    } satisfies ManagerSubscribedSemesterRow;
  });
}

function buildPaymentsForSubscriptions(
  subscriptions: ManagerSubscribedSemesterRow[],
  studentProfileId: string
) {
  const payments: ManagerStudentPaymentRow[] = [];
  const seed = hashString(studentProfileId);

  subscriptions.forEach((subscription, index) => {
    if (subscription.paid_amount <= 0) {
      return;
    }

    const splitCount = subscription.paid_amount >= subscription.amount ? 2 : 1;
    let remaining = subscription.paid_amount;

    for (let part = 0; part < splitCount; part += 1) {
      const amount =
        part === splitCount - 1
          ? remaining
          : Math.round((subscription.paid_amount / splitCount) * 100) / 100;
      remaining -= amount;

      payments.push({
        id: `pay-${subscription.id}-${part}`,
        subscribed_semester_id: subscription.id,
        semester_name: subscription.semester_name,
        amount,
        currency: "USD",
        method: PAYMENT_METHODS[(seed + index + part) % PAYMENT_METHODS.length]!,
        paid_at: new Date(
          new Date(subscription.created_at).getTime() +
            (part + 1) * 7 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });
    }
  });

  return payments.sort(
    (left, right) =>
      new Date(right.paid_at).getTime() - new Date(left.paid_at).getTime()
  );
}

export function getManagerStudentAccountMock(
  studentProfileId: string
): ManagerStudentAccountDetails {
  const student =
    MANAGER_STUDENTS_MOCK.find(
      (row) => row.student_profile_id === studentProfileId
    ) ?? MANAGER_STUDENTS_MOCK[0]!;
  const subscriptions = buildSubscriptionsForStudent(student.student_profile_id);
  const payments = buildPaymentsForSubscriptions(
    subscriptions,
    student.student_profile_id
  );
  const scheduledPayments = buildScheduledPaymentsForSubscriptions(subscriptions);
  const totalSubscribed = subscriptions.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const totalPaid = subscriptions.reduce(
    (sum, row) => sum + row.paid_amount,
    0
  );

  return {
    overview: {
      account_id: `acc-${student.user_id.slice(0, 8)}`,
      student_profile_id: student.student_profile_id,
      user_id: student.user_id,
      full_name: student.full_name,
      email: student.email,
      phone: student.phone,
      opened_at: student.created_at,
      total_subscribed: totalSubscribed,
      total_paid: totalPaid,
      balance_due: Math.max(totalSubscribed - totalPaid, 0),
      active_subscriptions: subscriptions.filter(
        (row) => row.status === SUBSCRIBED_SEMESTER_STATUSES.ACTIVE
      ).length,
    },
    subscriptions,
    payments,
    scheduledPayments,
  };
}
