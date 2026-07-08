import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import type {
  AcademicAnalytics,
  ActivityAnalytics,
  AnalyticsFilters,
  AnalyticsHeadlineKpi,
  AnalyticsPeriod,
  AnalyticsPieSlice,
  AnalyticsTimePoint,
  EnrollmentAnalytics,
  EquipmentAnalytics,
  FinancialAnalytics,
  WorkloadAnalytics,
} from "@/types/manager-analytics";

export const ANALYTICS_PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] =
  [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "semester", label: "This semester" },
    { value: "all", label: "All time" },
  ];

export const ANALYTICS_COLORS = {
  sky: "#0ea5e9",
  skyMuted: "#bae6fd",
  emerald: "#10b981",
  emeraldMuted: "#a7f3d0",
  violet: "#8b5cf6",
  amber: "#f59e0b",
  rose: "#f43f5e",
  slate: "#94a3b8",
  orange: "#f97316",
  indigo: "#6366f1",
} as const;

function periodScale(period: AnalyticsPeriod): number {
  switch (period) {
    case "7d":
      return 0.25;
    case "30d":
      return 0.55;
    case "90d":
      return 0.8;
    case "semester":
      return 0.9;
    case "all":
      return 1;
  }
}

function semesterScale(semesterId: string | "all"): number {
  if (semesterId === "all") return 1;
  const index = MANAGER_PHASES_MOCK.findIndex((s) => s.id === semesterId);
  if (index < 0) return 1;
  return 0.65 + (index % 4) * 0.1;
}

function scaleValue(value: number, filters: AnalyticsFilters): number {
  if (value <= 0) return 0;
  const scaled = Math.round(
    value * periodScale(filters.period) * semesterScale(filters.semesterId)
  );
  return Math.max(1, scaled);
}

function sliceTimeSeries(
  data: AnalyticsTimePoint[],
  period: AnalyticsPeriod
): AnalyticsTimePoint[] {
  switch (period) {
    case "7d":
      return data.slice(-3);
    case "30d":
      return data.slice(-5);
    case "90d":
      return data.slice(-7);
    case "semester":
      return data.slice(-8);
    case "all":
      return data;
  }
}

function scaleSeries(
  data: AnalyticsTimePoint[],
  filters: AnalyticsFilters,
  keys: string[]
): AnalyticsTimePoint[] {
  const factor = periodScale(filters.period) * semesterScale(filters.semesterId);
  return sliceTimeSeries(data, filters.period).map((point) => {
    const scaled: AnalyticsTimePoint = { label: point.label };
    for (const key of keys) {
      const raw = point[key];
      scaled[key] =
        typeof raw === "number" ? Math.round(raw * factor) : (raw ?? 0);
    }
    return scaled;
  });
}

const BASE_ENROLLMENT_TREND: AnalyticsTimePoint[] = [
  { label: "Jan", count: 8 },
  { label: "Feb", count: 12 },
  { label: "Mar", count: 15 },
  { label: "Apr", count: 18 },
  { label: "May", count: 22 },
  { label: "Jun", count: 28 },
  { label: "Jul", count: 24 },
  { label: "Aug", count: 32 },
  { label: "Sep", count: 38 },
  { label: "Oct", count: 42 },
  { label: "Nov", count: 35 },
  { label: "Dec", count: 30 },
];

const BASE_REVENUE_TREND: AnalyticsTimePoint[] = [
  { label: "W1", revenue: 4200 },
  { label: "W2", revenue: 5100 },
  { label: "W3", revenue: 4800 },
  { label: "W4", revenue: 6200 },
  { label: "W5", revenue: 5800 },
  { label: "W6", revenue: 7100 },
  { label: "W7", revenue: 6500 },
  { label: "W8", revenue: 7800 },
];

const BASE_SUBMISSION_TREND: AnalyticsTimePoint[] = [
  { label: "W1", on_time: 142, late: 18 },
  { label: "W2", on_time: 156, late: 22 },
  { label: "W3", on_time: 148, late: 15 },
  { label: "W4", on_time: 165, late: 12 },
  { label: "W5", on_time: 172, late: 10 },
  { label: "W6", on_time: 158, late: 14 },
];

const BASE_BORROW_TREND: AnalyticsTimePoint[] = [
  { label: "W1", open: 12, returned: 8 },
  { label: "W2", open: 15, returned: 11 },
  { label: "W3", open: 10, returned: 14 },
  { label: "W4", open: 18, returned: 9 },
  { label: "W5", open: 14, returned: 16 },
  { label: "W6", open: 11, returned: 13 },
];

const BASE_ACTIVITY_TREND: AnalyticsTimePoint[] = [
  { label: "Mon", events: 48 },
  { label: "Tue", events: 62 },
  { label: "Wed", events: 55 },
  { label: "Thu", events: 71 },
  { label: "Fri", events: 58 },
  { label: "Sat", events: 22 },
  { label: "Sun", events: 15 },
];

const BASE_OUTSTANDING_TREND: AnalyticsTimePoint[] = [
  { label: "Jan", balance: 8200 },
  { label: "Feb", balance: 7600 },
  { label: "Mar", balance: 7100 },
  { label: "Apr", balance: 6800 },
  { label: "May", balance: 6200 },
  { label: "Jun", balance: 5800 },
  { label: "Jul", balance: 5400 },
  { label: "Aug", balance: 5100 },
];

const BASE_COLLECTION_SPARKLINE: AnalyticsTimePoint[] = [
  { label: "1", rate: 72 },
  { label: "2", rate: 74 },
  { label: "3", rate: 73 },
  { label: "4", rate: 76 },
  { label: "5", rate: 78 },
  { label: "6", rate: 77 },
  { label: "7", rate: 79 },
];

export function getAnalyticsHeadlineKpis(
  filters: AnalyticsFilters
): AnalyticsHeadlineKpi[] {
  const factor = periodScale(filters.period) * semesterScale(filters.semesterId);
  return [
    {
      label: "Active students",
      value: Math.round(198 * factor),
      accentClassName: "border-l-sky-500",
    },
    {
      label: "Avg final grade",
      value: `${(76.4 * (0.9 + factor * 0.1)).toFixed(1)}%`,
      accentClassName: "border-l-emerald-500",
    },
    {
      label: "Revenue (period)",
      value: `$${Math.round(28400 * factor).toLocaleString()}`,
      accentClassName: "border-l-violet-500",
    },
    {
      label: "Open borrows",
      value: Math.round(11 * factor),
      accentClassName: "border-l-amber-500",
    },
  ];
}

export function getEnrollmentAnalytics(
  filters: AnalyticsFilters
): EnrollmentAnalytics {
  const studentStatus: AnalyticsPieSlice[] = [
    {
      label: "Active",
      value: scaleValue(198, filters),
      color: ANALYTICS_COLORS.emerald,
    },
    {
      label: "Inactive",
      value: scaleValue(28, filters),
      color: ANALYTICS_COLORS.slate,
    },
    {
      label: "Graduated",
      value: scaleValue(16, filters),
      color: ANALYTICS_COLORS.sky,
    },
    {
      label: "Suspended",
      value: scaleValue(6, filters),
      color: ANALYTICS_COLORS.rose,
    },
  ];

  const enrollmentStatus = [
    { label: "In progress", value: scaleValue(312, filters) },
    { label: "Done", value: scaleValue(186, filters) },
    { label: "Paused", value: scaleValue(24, filters) },
    { label: "Stopped", value: scaleValue(18, filters) },
  ];

  return {
    studentStatus,
    studentStatusKpis: studentStatus.map((s) => ({
      label: s.label,
      value: s.value,
      accentClassName:
        s.label === "Active"
          ? "border-l-emerald-500"
          : s.label === "Inactive"
            ? "border-l-slate-400"
            : s.label === "Graduated"
              ? "border-l-sky-500"
              : "border-l-rose-500",
    })),
    enrollmentTrend: scaleSeries(BASE_ENROLLMENT_TREND, filters, ["count"]),
    enrollmentStatus,
    classesPerStudent: [
      { label: "1 class", value: scaleValue(42, filters) },
      { label: "2 classes", value: scaleValue(98, filters) },
      { label: "3 classes", value: scaleValue(76, filters) },
      { label: "4+ classes", value: scaleValue(32, filters) },
    ],
    ageCohorts: [
      { label: "Under 15", value: scaleValue(18, filters) },
      { label: "15–17", value: scaleValue(86, filters) },
      { label: "18–20", value: scaleValue(112, filters) },
      { label: "21+", value: scaleValue(32, filters) },
    ],
  };
}

export function getAcademicAnalytics(filters: AnalyticsFilters): AcademicAnalytics {
  const factor = periodScale(filters.period) * semesterScale(filters.semesterId);

  const classAverages = [
    { label: "Algebra II", value: 82.4 * factor },
    { label: "Physics Lab", value: 74.8 * factor },
    { label: "English Lit", value: 88.2 * factor },
    { label: "Biology", value: 71.5 * factor },
    { label: "CS Intro", value: 79.6 * factor },
    { label: "History", value: 76.3 * factor },
  ].map((item) => ({
    label: item.label,
    value: Math.round(item.value * 10) / 10,
  }));

  const schoolAverage =
    classAverages.reduce((sum, c) => sum + c.value, 0) / classAverages.length;

  return {
    classAverages,
    schoolAverage: Math.round(schoolAverage * 10) / 10,
    gradeDistribution: [
      { label: "0–59", value: scaleValue(12, filters) },
      { label: "60–69", value: scaleValue(28, filters) },
      { label: "70–79", value: scaleValue(86, filters) },
      { label: "80–89", value: scaleValue(102, filters) },
      { label: "90–100", value: scaleValue(48, filters) },
    ],
    passingThreshold: 70,
    taskCompletion: [
      {
        label: "Graded",
        value: scaleValue(420, filters),
        color: ANALYTICS_COLORS.emerald,
      },
      {
        label: "Submitted",
        value: scaleValue(68, filters),
        color: ANALYTICS_COLORS.sky,
      },
      {
        label: "Pending",
        value: scaleValue(52, filters),
        color: ANALYTICS_COLORS.slate,
      },
      {
        label: "Late",
        value: scaleValue(34, filters),
        color: ANALYTICS_COLORS.amber,
      },
      {
        label: "Missing",
        value: scaleValue(18, filters),
        color: ANALYTICS_COLORS.rose,
      },
    ],
    submissionTrend: scaleSeries(BASE_SUBMISSION_TREND, filters, [
      "on_time",
      "late",
    ]),
    componentBreakdown: [
      {
        label: "Algebra II",
        attendance: 18,
        tasks: 32,
        group: 12,
        exam: 38,
      },
      {
        label: "Physics Lab",
        attendance: 15,
        tasks: 28,
        group: 10,
        exam: 35,
      },
      {
        label: "English Lit",
        attendance: 12,
        tasks: 30,
        group: 18,
        exam: 40,
      },
      {
        label: "Biology",
        attendance: 20,
        tasks: 25,
        group: 8,
        exam: 32,
      },
    ].map((item) => ({
      ...item,
      attendance: Math.round(item.attendance * factor),
      tasks: Math.round(item.tasks * factor),
      group: Math.round(item.group * factor),
      exam: Math.round(item.exam * factor),
    })),
    gradingTurnaround: [
      { label: "Algebra II", value: Math.round(2.4 * (2 - factor * 0.5) * 10) / 10 },
      { label: "Physics Lab", value: Math.round(3.1 * (2 - factor * 0.5) * 10) / 10 },
      { label: "English Lit", value: Math.round(1.8 * (2 - factor * 0.5) * 10) / 10 },
      { label: "Biology", value: Math.round(2.9 * (2 - factor * 0.5) * 10) / 10 },
      { label: "CS Intro", value: Math.round(2.2 * (2 - factor * 0.5) * 10) / 10 },
    ],
  };
}

export function getWorkloadAnalytics(filters: AnalyticsFilters): WorkloadAnalytics {
  const active = scaleValue(28, filters);
  const inactive = scaleValue(6, filters);

  return {
    classStatus: [
      { label: "Active", value: active, color: ANALYTICS_COLORS.emerald },
      { label: "Inactive", value: inactive, color: ANALYTICS_COLORS.slate },
    ],
    classStatusKpis: [
      {
        label: "Active classes",
        value: active,
        accentClassName: "border-l-emerald-500",
      },
      {
        label: "Inactive classes",
        value: inactive,
        accentClassName: "border-l-slate-400",
      },
    ],
    enrollmentFillRate: [
      { label: "Algebra II B", value: 92 },
      { label: "Physics Lab 3", value: 88 },
      { label: "English Lit A", value: 76 },
      { label: "Biology Lab", value: 68 },
      { label: "CS Intro", value: 84 },
      { label: "History B", value: 72 },
    ].map((item) => ({
      ...item,
      value: Math.min(100, Math.round(item.value * semesterScale(filters.semesterId))),
    })),
    classesPerTeacher: [
      { label: "Omar Khaled", value: scaleValue(5, filters) },
      { label: "Sara Nabil", value: scaleValue(4, filters) },
      { label: "Dina Hossam", value: scaleValue(4, filters) },
      { label: "Ahmed Tariq", value: scaleValue(3, filters) },
      { label: "Layla Mansour", value: scaleValue(3, filters) },
      { label: "Karim Fadel", value: scaleValue(2, filters) },
    ],
    subjectEnrollments: [
      { label: "Mathematics", value: scaleValue(142, filters) },
      { label: "Sciences", value: scaleValue(128, filters) },
      { label: "English", value: scaleValue(118, filters) },
      { label: "Computer Science", value: scaleValue(96, filters) },
      { label: "History", value: scaleValue(72, filters) },
      { label: "Arts", value: scaleValue(38, filters) },
    ],
  };
}

export function getFinancialAnalytics(
  filters: AnalyticsFilters
): FinancialAnalytics {
  const factor = periodScale(filters.period) * semesterScale(filters.semesterId);
  const collectionRate = Math.min(
    99,
    Math.round(79 * (0.85 + factor * 0.15))
  );

  const subscriptionsPerSemester =
    filters.semesterId === "all"
      ? MANAGER_PHASES_MOCK.map((semester, index) => ({
          label: semester.name.replace(" Semester", ""),
          value: scaleValue(28 + index * 4, filters),
        }))
      : [
          {
            label:
              MANAGER_PHASES_MOCK.find((s) => s.id === filters.semesterId)
                ?.name.replace(" Semester", "") ?? "Selected",
            value: scaleValue(42, filters),
          },
        ];

  return {
    revenueTrend: scaleSeries(BASE_REVENUE_TREND, filters, ["revenue"]),
    revenueByMethod: [
      {
        label: "Bank transfer",
        value: scaleValue(12400, filters),
        color: ANALYTICS_COLORS.sky,
      },
      {
        label: "Cash",
        value: scaleValue(8200, filters),
        color: ANALYTICS_COLORS.emerald,
      },
      {
        label: "Card",
        value: scaleValue(5600, filters),
        color: ANALYTICS_COLORS.violet,
      },
      {
        label: "Online",
        value: scaleValue(2200, filters),
        color: ANALYTICS_COLORS.amber,
      },
    ],
    revenueByCurrency: [
      { label: "USD", value: scaleValue(24800, filters) },
      { label: "EUR", value: scaleValue(2400, filters) },
      { label: "LBP", value: scaleValue(1200, filters) },
    ],
    collectionRate,
    collectionSparkline: BASE_COLLECTION_SPARKLINE.map((point) => ({
      label: point.label,
      rate: Math.round((point.rate as number) * (0.9 + factor * 0.1)),
    })),
    subscriptionsPerSemester,
    outstandingTrend: scaleSeries(BASE_OUTSTANDING_TREND, filters, ["balance"]),
  };
}

export function getEquipmentAnalytics(
  filters: AnalyticsFilters
): EquipmentAnalytics {
  return {
    borrowTrend: scaleSeries(BASE_BORROW_TREND, filters, ["open", "returned"]),
    mostBorrowed: [
      { label: "Microscope Kit", value: scaleValue(24, filters) },
      { label: "Graphing Calculator", value: scaleValue(18, filters) },
      { label: "Lab Coat (M)", value: scaleValue(15, filters) },
      { label: "Arduino Starter", value: scaleValue(12, filters) },
      { label: "Safety Goggles", value: scaleValue(10, filters) },
    ],
    inventoryValue: scaleValue(18420, filters),
    lowStock: [
      { id: "eq-1", name: "Safety Goggles", quantity: 3, threshold: 5 },
      { id: "eq-2", name: "Lab Coat (S)", quantity: 2, threshold: 5 },
      { id: "eq-3", name: "USB-C Hub", quantity: 4, threshold: 5 },
      { id: "eq-4", name: "Whiteboard Markers", quantity: 1, threshold: 5 },
    ],
  };
}

export function getActivityAnalytics(
  filters: AnalyticsFilters
): ActivityAnalytics {
  return {
    activityTrend: scaleSeries(BASE_ACTIVITY_TREND, filters, ["events"]),
    mostActiveUsers: [
      { label: "Omar Khaled", value: scaleValue(48, filters) },
      { label: "Manager Admin", value: scaleValue(42, filters) },
      { label: "Sara Nabil", value: scaleValue(36, filters) },
      { label: "Dina Hossam", value: scaleValue(28, filters) },
      { label: "Ahmed Tariq", value: scaleValue(22, filters) },
    ],
    mostModifiedTables: [
      { label: "student_tasks", value: scaleValue(86, filters) },
      { label: "payments", value: scaleValue(64, filters) },
      { label: "student_class", value: scaleValue(52, filters) },
      { label: "profiles", value: scaleValue(38, filters) },
      { label: "borrow_equipment", value: scaleValue(24, filters) },
    ],
  };
}
