import { format } from "date-fns";
import { ANALYTICS_COLORS } from "@/lib/constants/manager-analytics-mock";
import { getManagerStudentAccountMock } from "@/lib/constants/manager-student-account-mock";
import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import { formatPaymentMethodLabel } from "@/lib/constants/manager-payment-display";
import { SCHEDULED_PAYMENT_STATUSES } from "@/lib/constants/manager-scheduled-payment-status";
import { SUBSCRIBED_SEMESTER_STATUSES } from "@/lib/constants/manager-subscribed-semester-status";
import { MANAGER_SUBSCRIBED_SEMESTER_STATUS_LABELS } from "@/lib/constants/manager-subscribed-semester-display";
import { getManagerStudentSemesterMockSnapshot } from "@/lib/constants/manager-student-semester-mock";
import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import type {
  AccountingAnalysisAllSemestersAnalytics,
  AccountingAnalysisPaymentRow,
  AccountingAnalysisPeriod,
  AccountingAnalysisSemesterAnalytics,
  AccountingAnalysisSemesterOption,
  AccountingAnalysisSemesterSummary,
} from "@/types/manager-accounting-analytics";
import type { AnalyticsBarPoint, AnalyticsPieSlice, AnalyticsTimePoint } from "@/types/manager-analytics";
import type { ManagerSubscribedSemesterRow } from "@/types/manager-student-account";

type EnrichedSubscription = ManagerSubscribedSemesterRow & {
  studentProfileId: string;
  studentName: string;
};

type AccountingSnapshot = {
  subscriptions: EnrichedSubscription[];
  payments: AccountingAnalysisPaymentRow[];
  scheduledRemindersDue: number;
  studentCountBySemester: Map<string, number>;
};

function shortSemesterName(name: string) {
  return name.replace(/\s+Semester$/i, "");
}

function periodCutoff(period: AccountingAnalysisPeriod): number | null {
  const now = Date.now();

  switch (period) {
    case "7d":
      return now - 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return now - 30 * 24 * 60 * 60 * 1000;
    case "90d":
      return now - 90 * 24 * 60 * 60 * 1000;
    case "semester":
      return now - 120 * 24 * 60 * 60 * 1000;
    case "all":
      return null;
  }
}

function filterPaymentsByPeriod(
  payments: AccountingAnalysisPaymentRow[],
  period: AccountingAnalysisPeriod
) {
  const cutoff = periodCutoff(period);
  if (cutoff === null) {
    return payments;
  }

  return payments.filter(
    (payment) => new Date(payment.paid_at).getTime() >= cutoff
  );
}

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function computeCollectionRate(totalPaid: number, totalExpected: number) {
  if (totalExpected <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((totalPaid / totalExpected) * 100));
}

function buildAccountingSnapshot(): AccountingSnapshot {
  const subscriptions: EnrichedSubscription[] = [];
  const payments: AccountingAnalysisPaymentRow[] = [];
  let scheduledRemindersDue = 0;
  const now = Date.now();

  for (const student of MANAGER_STUDENTS_MOCK) {
    const account = getManagerStudentAccountMock(student.student_profile_id);

    for (const subscription of account.subscriptions) {
      subscriptions.push({
        ...subscription,
        studentProfileId: student.student_profile_id,
        studentName: student.full_name,
      });
    }

    for (const payment of account.payments) {
      const subscription = account.subscriptions.find(
        (row) => row.id === payment.subscribed_semester_id
      );

      payments.push({
        ...payment,
        studentName: student.full_name,
        studentProfileId: student.student_profile_id,
        semesterId: subscription?.semester_id ?? "",
      });
    }

    scheduledRemindersDue += account.scheduledPayments.filter((row) => {
      const isDue =
        row.status === SCHEDULED_PAYMENT_STATUSES.MISSED ||
        row.status === SCHEDULED_PAYMENT_STATUSES.REMINDED;
      const isPast = new Date(row.payment_date).getTime() <= now;

      return isDue && isPast;
    }).length;
  }

  const studentCountBySemester = new Map<string, number>();

  for (const enrollment of getManagerStudentSemesterMockSnapshot()) {
    studentCountBySemester.set(
      enrollment.semester_id,
      (studentCountBySemester.get(enrollment.semester_id) ?? 0) + 1
    );
  }

  return {
    subscriptions,
    payments: payments.sort(
      (left, right) =>
        new Date(right.paid_at).getTime() - new Date(left.paid_at).getTime()
    ),
    scheduledRemindersDue,
    studentCountBySemester,
  };
}

const ACCOUNTING_SNAPSHOT = buildAccountingSnapshot();

function buildRevenueTrend(
  payments: AccountingAnalysisPaymentRow[]
): AnalyticsTimePoint[] {
  if (payments.length === 0) {
    return [];
  }

  const buckets = new Map<string, number>();

  for (const payment of payments) {
    const label = format(new Date(payment.paid_at), "MMM d");
    buckets.set(label, (buckets.get(label) ?? 0) + payment.amount);
  }

  return [...buckets.entries()]
    .map(([label, revenue]) => ({ label, revenue: roundCurrency(revenue) }))
    .slice(-12);
}

function buildExpectedVsPaidTrend(
  subscriptions: EnrichedSubscription[],
  payments: AccountingAnalysisPaymentRow[]
): AnalyticsTimePoint[] {
  const events: Array<{ time: number; expected: number; collected: number }> =
    [];

  for (const subscription of subscriptions) {
    events.push({
      time: new Date(subscription.created_at).getTime(),
      expected: subscription.amount,
      collected: 0,
    });
  }

  for (const payment of payments) {
    events.push({
      time: new Date(payment.paid_at).getTime(),
      expected: 0,
      collected: payment.amount,
    });
  }

  events.sort((left, right) => left.time - right.time);

  let cumulativeExpected = 0;
  let cumulativeCollected = 0;
  const points: AnalyticsTimePoint[] = [];

  for (const event of events) {
    cumulativeExpected += event.expected;
    cumulativeCollected += event.collected;
    points.push({
      label: format(new Date(event.time), "MMM d"),
      expected: roundCurrency(cumulativeExpected),
      collected: roundCurrency(cumulativeCollected),
    });
  }

  return points.slice(-12);
}

function buildCollectionSparkline(
  payments: AccountingAnalysisPaymentRow[],
  totalExpected: number
): AnalyticsTimePoint[] {
  if (totalExpected <= 0 || payments.length === 0) {
    return [{ label: "Start", rate: 0 }];
  }

  const sortedPayments = [...payments].sort(
    (left, right) =>
      new Date(left.paid_at).getTime() - new Date(right.paid_at).getTime()
  );

  let runningPaid = 0;
  const points: AnalyticsTimePoint[] = [{ label: "Start", rate: 0 }];

  for (const payment of sortedPayments) {
    runningPaid += payment.amount;
    points.push({
      label: format(new Date(payment.paid_at), "MMM d"),
      rate: computeCollectionRate(runningPaid, totalExpected),
    });
  }

  return points.slice(-8);
}

function buildRevenueByMethod(
  payments: AccountingAnalysisPaymentRow[]
): AnalyticsPieSlice[] {
  const totals = new Map<string, number>();

  for (const payment of payments) {
    const label = formatPaymentMethodLabel(payment.method);
    totals.set(label, (totals.get(label) ?? 0) + payment.amount);
  }

  const colors = [
    ANALYTICS_COLORS.sky,
    ANALYTICS_COLORS.emerald,
    ANALYTICS_COLORS.violet,
    ANALYTICS_COLORS.amber,
  ];

  return [...totals.entries()].map(([label, value], index) => ({
    label,
    value: roundCurrency(value),
    color: colors[index % colors.length]!,
  }));
}

function buildSubscriptionStatusBreakdown(
  subscriptions: EnrichedSubscription[]
): AnalyticsBarPoint[] {
  const counts = new Map<string, number>();

  for (const subscription of subscriptions) {
    const label = MANAGER_SUBSCRIBED_SEMESTER_STATUS_LABELS[subscription.status];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const colorByStatus: Record<string, string> = {
    Active: ANALYTICS_COLORS.emerald,
    Pending: ANALYTICS_COLORS.amber,
    Overdue: ANALYTICS_COLORS.rose,
    Cancelled: ANALYTICS_COLORS.slate,
  };

  return [...counts.entries()].map(([label, value]) => ({
    label,
    value,
    color: colorByStatus[label] ?? ANALYTICS_COLORS.indigo,
  }));
}

function buildOutstandingTrend(
  subscriptions: EnrichedSubscription[],
  payments: AccountingAnalysisPaymentRow[]
): AnalyticsTimePoint[] {
  const totalExpected = subscriptions.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const expectedVsPaid = buildExpectedVsPaidTrend(subscriptions, payments);

  return expectedVsPaid.map((point) => ({
    label: point.label,
    balance: roundCurrency(
      totalExpected - Number(point.collected ?? 0)
    ),
  }));
}

function summarizeSubscriptions(
  subscriptions: EnrichedSubscription[],
  studentCount: number,
  scheduledRemindersDue: number
): Omit<
  AccountingAnalysisSemesterSummary,
  "semesterId" | "semesterName"
> {
  const totalExpected = subscriptions.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const totalPaid = subscriptions.reduce(
    (sum, row) => sum + row.paid_amount,
    0
  );
  const totalDue = Math.max(totalExpected - totalPaid, 0);
  const paymentCount = subscriptions.filter((row) => row.paid_amount > 0).length;

  return {
    studentCount,
    totalExpected: roundCurrency(totalExpected),
    totalPaid: roundCurrency(totalPaid),
    totalDue: roundCurrency(totalDue),
    collectionRate: computeCollectionRate(totalPaid, totalExpected),
    activeSubscriptions: subscriptions.filter(
      (row) => row.status === SUBSCRIBED_SEMESTER_STATUSES.ACTIVE
    ).length,
    overdueCount: subscriptions.filter(
      (row) => row.status === SUBSCRIBED_SEMESTER_STATUSES.OVERDUE
    ).length,
    scheduledRemindersDue,
    averagePaymentSize:
      paymentCount > 0 ? roundCurrency(totalPaid / paymentCount) : 0,
  };
}

export function getAccountingAnalysisSemesterOptions(): AccountingAnalysisSemesterOption[] {
  return MANAGER_PHASES_MOCK.map((semester) => ({
    id: semester.id,
    name: semester.name,
    shortName: shortSemesterName(semester.name),
    studentCount:
      ACCOUNTING_SNAPSHOT.studentCountBySemester.get(semester.id) ?? 0,
  }));
}

export function getAccountingAnalysisForSemester(
  semesterId: string,
  period: AccountingAnalysisPeriod
): AccountingAnalysisSemesterAnalytics {
  const semester = MANAGER_PHASES_MOCK.find((row) => row.id === semesterId);
  const subscriptions = ACCOUNTING_SNAPSHOT.subscriptions.filter(
    (row) => row.semester_id === semesterId
  );
  const allPayments = ACCOUNTING_SNAPSHOT.payments.filter(
    (row) => row.semesterId === semesterId
  );
  const periodPayments = filterPaymentsByPeriod(allPayments, period);
  const studentCount =
    ACCOUNTING_SNAPSHOT.studentCountBySemester.get(semesterId) ?? 0;

  const scheduledRemindersDue = ACCOUNTING_SNAPSHOT.scheduledRemindersDue > 0
    ? Math.max(
        1,
        Math.round(
          ACCOUNTING_SNAPSHOT.scheduledRemindersDue *
            (subscriptions.length /
              Math.max(ACCOUNTING_SNAPSHOT.subscriptions.length, 1))
        )
      )
    : 0;

  const summaryMetrics = summarizeSubscriptions(
    subscriptions,
    studentCount,
    scheduledRemindersDue
  );

  return {
    summary: {
      semesterId,
      semesterName: semester?.name ?? "Unknown semester",
      ...summaryMetrics,
    },
    revenueTrend: buildRevenueTrend(periodPayments),
    expectedVsPaidTrend: buildExpectedVsPaidTrend(
      subscriptions,
      periodPayments
    ),
    revenueByMethod: buildRevenueByMethod(periodPayments),
    subscriptionStatusBreakdown: buildSubscriptionStatusBreakdown(subscriptions),
    collectionSparkline: buildCollectionSparkline(
      periodPayments,
      summaryMetrics.totalExpected
    ),
    payments: periodPayments,
  };
}

export function getAccountingAnalysisAllSemesters(
  period: AccountingAnalysisPeriod
): AccountingAnalysisAllSemestersAnalytics {
  const { subscriptions, payments: allPayments, scheduledRemindersDue } =
    ACCOUNTING_SNAPSHOT;
  const periodPayments = filterPaymentsByPeriod(allPayments, period);
  const uniqueStudentIds = new Set(
    getManagerStudentSemesterMockSnapshot().map(
      (row) => row.student_profile_id
    )
  );

  const summaryMetrics = summarizeSubscriptions(
    subscriptions,
    uniqueStudentIds.size,
    scheduledRemindersDue
  );

  const semesterComparison = MANAGER_PHASES_MOCK.map((semester) => {
    const semesterSubscriptions = subscriptions.filter(
      (row) => row.semester_id === semester.id
    );

    return {
      label: shortSemesterName(semester.name),
      expected: roundCurrency(
        semesterSubscriptions.reduce((sum, row) => sum + row.amount, 0)
      ),
      paid: roundCurrency(
        semesterSubscriptions.reduce((sum, row) => sum + row.paid_amount, 0)
      ),
    };
  });

  const subscriptionsPerSemester: AnalyticsBarPoint[] =
    getAccountingAnalysisSemesterOptions().map((semester, index) => ({
      label: semester.shortName,
      value: semester.studentCount,
      color:
        [
          ANALYTICS_COLORS.emerald,
          ANALYTICS_COLORS.sky,
          ANALYTICS_COLORS.violet,
          ANALYTICS_COLORS.amber,
          ANALYTICS_COLORS.rose,
          ANALYTICS_COLORS.indigo,
        ][index % 6] ?? ANALYTICS_COLORS.emerald,
    }));

  return {
    summary: {
      uniqueStudentCount: uniqueStudentIds.size,
      totalExpected: summaryMetrics.totalExpected,
      totalPaid: summaryMetrics.totalPaid,
      totalDue: summaryMetrics.totalDue,
      collectionRate: summaryMetrics.collectionRate,
      activeSubscriptions: summaryMetrics.activeSubscriptions,
      overdueCount: summaryMetrics.overdueCount,
      scheduledRemindersDue: summaryMetrics.scheduledRemindersDue,
      averagePaymentSize: summaryMetrics.averagePaymentSize,
    },
    revenueTrend: buildRevenueTrend(periodPayments),
    semesterComparison,
    subscriptionsPerSemester,
    outstandingTrend: buildOutstandingTrend(subscriptions, periodPayments),
    collectionSparkline: buildCollectionSparkline(
      periodPayments,
      summaryMetrics.totalExpected
    ),
    payments: periodPayments,
  };
}
