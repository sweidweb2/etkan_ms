import type { AnalyticsBarPoint, AnalyticsPieSlice, AnalyticsTimePoint } from "@/types/manager-analytics";
import type { ManagerStudentPaymentRow } from "@/types/manager-student-account";

export type AccountingAnalysisPeriod = "7d" | "30d" | "90d" | "semester" | "all";

export type AccountingAnalysisSemesterOption = {
  id: string;
  name: string;
  shortName: string;
  studentCount: number;
};

export type AccountingAnalysisSemesterSummary = {
  semesterId: string;
  semesterName: string;
  studentCount: number;
  totalExpected: number;
  totalPaid: number;
  totalDue: number;
  collectionRate: number;
  activeSubscriptions: number;
  overdueCount: number;
  scheduledRemindersDue: number;
  averagePaymentSize: number;
};

export type AccountingAnalysisPaymentRow = ManagerStudentPaymentRow & {
  studentName: string;
  studentProfileId: string;
  semesterId: string;
};

export type AccountingAnalysisSemesterAnalytics = {
  summary: AccountingAnalysisSemesterSummary;
  revenueTrend: AnalyticsTimePoint[];
  expectedVsPaidTrend: AnalyticsTimePoint[];
  revenueByMethod: AnalyticsPieSlice[];
  subscriptionStatusBreakdown: AnalyticsBarPoint[];
  collectionSparkline: AnalyticsTimePoint[];
  payments: AccountingAnalysisPaymentRow[];
};

export type AccountingAnalysisAllSemestersSummary = {
  uniqueStudentCount: number;
  totalExpected: number;
  totalPaid: number;
  totalDue: number;
  collectionRate: number;
  activeSubscriptions: number;
  overdueCount: number;
  scheduledRemindersDue: number;
  averagePaymentSize: number;
};

export type AccountingAnalysisSemesterComparisonPoint = {
  label: string;
  expected: number;
  paid: number;
};

export type AccountingAnalysisAllSemestersAnalytics = {
  summary: AccountingAnalysisAllSemestersSummary;
  revenueTrend: AnalyticsTimePoint[];
  semesterComparison: AccountingAnalysisSemesterComparisonPoint[];
  subscriptionsPerSemester: AnalyticsBarPoint[];
  outstandingTrend: AnalyticsTimePoint[];
  collectionSparkline: AnalyticsTimePoint[];
  payments: AccountingAnalysisPaymentRow[];
};
