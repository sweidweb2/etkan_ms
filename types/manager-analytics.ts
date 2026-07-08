export type AnalyticsPeriod = "7d" | "30d" | "90d" | "semester" | "all";

export type AnalyticsFilters = {
  period: AnalyticsPeriod;
  semesterId: string | "all";
};

export type AnalyticsPieSlice = {
  label: string;
  value: number;
  color: string;
};

export type AnalyticsTimePoint = {
  label: string;
  [key: string]: string | number;
};

export type AnalyticsBarPoint = {
  label: string;
  value: number;
  color?: string;
};

export type AnalyticsStackedBarPoint = {
  label: string;
  attendance: number;
  tasks: number;
  group: number;
  exam: number;
};

export type AnalyticsHeadlineKpi = {
  label: string;
  value: string | number;
  accentClassName: string;
};

export type EnrollmentAnalytics = {
  studentStatus: AnalyticsPieSlice[];
  studentStatusKpis: AnalyticsHeadlineKpi[];
  enrollmentTrend: AnalyticsTimePoint[];
  enrollmentStatus: AnalyticsBarPoint[];
  classesPerStudent: AnalyticsBarPoint[];
  ageCohorts: AnalyticsBarPoint[];
};

export type AcademicAnalytics = {
  classAverages: AnalyticsBarPoint[];
  schoolAverage: number;
  gradeDistribution: AnalyticsBarPoint[];
  passingThreshold: number;
  taskCompletion: AnalyticsPieSlice[];
  submissionTrend: AnalyticsTimePoint[];
  componentBreakdown: AnalyticsStackedBarPoint[];
  gradingTurnaround: AnalyticsBarPoint[];
};

export type WorkloadAnalytics = {
  classStatus: AnalyticsPieSlice[];
  classStatusKpis: AnalyticsHeadlineKpi[];
  enrollmentFillRate: AnalyticsBarPoint[];
  classesPerTeacher: AnalyticsBarPoint[];
  subjectEnrollments: AnalyticsBarPoint[];
};

export type FinancialAnalytics = {
  revenueTrend: AnalyticsTimePoint[];
  revenueByMethod: AnalyticsPieSlice[];
  revenueByCurrency: AnalyticsBarPoint[];
  collectionRate: number;
  collectionSparkline: AnalyticsTimePoint[];
  subscriptionsPerSemester: AnalyticsBarPoint[];
  outstandingTrend: AnalyticsTimePoint[];
};

export type EquipmentLowStockItem = {
  id: string;
  name: string;
  quantity: number;
  threshold: number;
};

export type EquipmentAnalytics = {
  borrowTrend: AnalyticsTimePoint[];
  mostBorrowed: AnalyticsBarPoint[];
  inventoryValue: number;
  lowStock: EquipmentLowStockItem[];
};

export type ActivityAnalytics = {
  activityTrend: AnalyticsTimePoint[];
  mostActiveUsers: AnalyticsBarPoint[];
  mostModifiedTables: AnalyticsBarPoint[];
};
