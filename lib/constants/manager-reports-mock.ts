import { format } from "date-fns";
import type { AnalyticsPeriod } from "@/types/manager-analytics";
import { MANAGER_CLASSES_MOCK } from "@/lib/constants/manager-classes-mock";
import { getPreviewClassStatus } from "@/lib/constants/manager-class-status";
import { MANAGER_PHASES_MOCK } from "@/lib/constants/manager-phases-mock";
import { MANAGER_RELATIONSHIPS_MOCK } from "@/lib/constants/manager-relationships-mock";
import { MANAGER_CLASS_STUDENT_GRADES_MOCK } from "@/lib/constants/manager-subject-student-grades-data";
import { MANAGER_SUBJECTS_MOCK } from "@/lib/constants/manager-subjects-mock";
import { BORROW_EQUIPMENT_STATUSES } from "@/lib/constants/manager-borrow-equipment-status";
import {
  getDefaultStudentBorrowEquipmentPreview,
  MANAGER_STUDENT_BORROW_EQUIPMENT_MOCK,
} from "@/lib/constants/manager-student-borrow-equipment-mock";
import { MANAGER_STUDENT_CLASSES_MOCK } from "@/lib/constants/manager-student-classes-mock";
import { getManagerStudentClassDetailPreview } from "@/lib/manager/get-manager-student-class-detail-preview";
import {
  computeManagerStudentCourseFinalGrade,
  formatCourseGradeValue,
} from "@/lib/constants/manager-student-course-grade-display";
import { MANAGER_STUDENTS_MOCK } from "@/lib/constants/manager-students-mock";
import { MANAGER_USERS_MOCK } from "@/lib/constants/manager-users-mock";
import type { ReportFilters, ReportId, ReportRow } from "@/types/manager-reports";

const SARA_PROFILE_ID = "s1a2b3c4-d5e6-7890-abcd-ef1234567890";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return format(new Date(value), "MMM d, yyyy");
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return format(new Date(value), "MMM d, yyyy h:mm a");
}

function periodCutoff(period: AnalyticsPeriod): Date | null {
  const now = new Date();
  switch (period) {
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case "semester":
      return new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000);
    case "all":
      return null;
  }
}

function isWithinPeriod(
  dateValue: string | null | undefined,
  period: AnalyticsPeriod
): boolean {
  if (!dateValue) return true;
  const cutoff = periodCutoff(period);
  if (!cutoff) return true;
  return new Date(dateValue) >= cutoff;
}

function withMockFallback<T>(filtered: T[], fallback: T[]): T[] {
  return filtered.length > 0 ? filtered : fallback;
}

function getClassGrades(classId: string) {
  const direct = MANAGER_CLASS_STUDENT_GRADES_MOCK[classId];
  if (direct?.length) return direct;
  const firstKey = Object.keys(MANAGER_CLASS_STUDENT_GRADES_MOCK)[0];
  return firstKey ? MANAGER_CLASS_STUDENT_GRADES_MOCK[firstKey] : [];
}

function getStudentNameByUserId(userId: string): string {
  return (
    MANAGER_STUDENTS_MOCK.find((s) => s.user_id === userId)?.full_name ??
    MANAGER_USERS_MOCK.find((u) => u.id === userId)?.username ??
    "Unknown"
  );
}

function getStudentById(studentId: string) {
  return (
    MANAGER_STUDENTS_MOCK.find(
      (s) => s.student_profile_id === studentId || s.user_id === studentId
    ) ?? MANAGER_STUDENTS_MOCK[0]
  );
}

const PAYMENT_LEDGER_MOCK: ReportRow[] = [
  {
    paid_at: "2026-07-05T10:00:00.000Z",
    student_name: "Sara Ahmad",
    amount: 450,
    currency: "USD",
    method: "Bank transfer",
  },
  {
    paid_at: "2026-06-28T14:30:00.000Z",
    student_name: "Omar Khalil",
    amount: 620,
    currency: "USD",
    method: "Cash",
  },
  {
    paid_at: "2026-06-20T09:15:00.000Z",
    student_name: "Fatima Zahra",
    amount: 380,
    currency: "USD",
    method: "Card",
  },
  {
    paid_at: "2026-06-12T11:00:00.000Z",
    student_name: "Hassan Ali",
    amount: 700,
    currency: "USD",
    method: "Online",
  },
  {
    paid_at: "2026-05-30T16:45:00.000Z",
    student_name: "Rana Mohammed",
    amount: 450,
    currency: "USD",
    method: "Bank transfer",
  },
  {
    paid_at: "2026-05-18T08:30:00.000Z",
    student_name: "Maya Ibrahim",
    amount: 540,
    currency: "USD",
    method: "Cash",
  },
  {
    paid_at: "2026-04-22T13:20:00.000Z",
    student_name: "Youssef Nasser",
    amount: 240,
    currency: "EUR",
    method: "Bank transfer",
  },
  {
    paid_at: "2025-11-28T10:00:00.000Z",
    student_name: "Sara Ahmad",
    amount: 320,
    currency: "USD",
    method: "Bank transfer",
  },
];

const OUTSTANDING_BALANCES_MOCK: ReportRow[] = [
  {
    student_name: "Maya Ibrahim",
    semester_name: "Fall 2025 Core Semester",
    subscribed: 450,
    paid: 200,
    balance: 250,
  },
  {
    student_name: "Rana Mohammed",
    semester_name: "STEM Focus Semester",
    subscribed: 620,
    paid: 400,
    balance: 220,
  },
  {
    student_name: "Youssef Nasser",
    semester_name: "Language Bridge Semester",
    subscribed: 380,
    paid: 100,
    balance: 280,
  },
];

const SUBSCRIPTION_REGISTER_MOCK: ReportRow[] = [
  {
    student_name: "Sara Ahmad",
    semester_name: "Fall 2025 Core Semester",
    amount: 450,
    status: "active",
    created_at: "2025-09-12T08:15:00.000Z",
  },
  {
    student_name: "Omar Khalil",
    semester_name: "STEM Focus Semester",
    amount: 620,
    status: "active",
    created_at: "2025-09-14T10:30:00.000Z",
  },
  {
    student_name: "Rana Mohammed",
    semester_name: "Fall 2025 Core Semester",
    amount: 450,
    status: "inactive",
    created_at: "2025-11-10T15:25:00.000Z",
  },
];

const INVENTORY_MOCK: ReportRow[] = [
  {
    name: "Student laptop",
    quantity: 24,
    unit_price: 450,
    total_value: 10800,
    stock_status: "OK",
  },
  {
    name: "Scientific calculator",
    quantity: 42,
    unit_price: 85,
    total_value: 3570,
    stock_status: "OK",
  },
  {
    name: "Safety goggles",
    quantity: 3,
    unit_price: 12,
    total_value: 36,
    stock_status: "Low",
  },
  {
    name: "Lab microscope",
    quantity: 8,
    unit_price: 320,
    total_value: 2560,
    stock_status: "OK",
  },
  {
    name: "Graphing calculator",
    quantity: 4,
    unit_price: 95,
    total_value: 380,
    stock_status: "Low",
  },
];

const TEACHER_ASSIGNMENTS_MOCK: ReportRow[] = [
  {
    teacher_name: "Layla Hassan",
    class_name: "Advanced Algebra II",
    subject_name: "Mathematics",
    assigned_at: "2025-08-18T09:00:00.000Z",
  },
  {
    teacher_name: "Karim Saleh",
    class_name: "Physics — Mechanics",
    subject_name: "Physics",
    assigned_at: "2025-08-20T10:00:00.000Z",
  },
  {
    teacher_name: "Layla Hassan",
    class_name: "Geometry",
    subject_name: "Mathematics",
    assigned_at: "2025-08-22T11:00:00.000Z",
  },
  {
    teacher_name: "Omar Khaled",
    class_name: "English Literature",
    subject_name: "English",
    assigned_at: "2025-08-25T14:00:00.000Z",
  },
];

const SEMESTER_CLASSES_MOCK: ReportRow[] = MANAGER_CLASSES_MOCK.map(
  (cls, index) => ({
    class_name: cls.name,
    subject_name: cls.subject_name,
    status: getPreviewClassStatus(index),
    enrollment_count: 12 + (index % 8) * 2,
    semester_name:
      MANAGER_PHASES_MOCK[index % MANAGER_PHASES_MOCK.length]?.name ?? "—",
    semester_id:
      MANAGER_PHASES_MOCK[index % MANAGER_PHASES_MOCK.length]?.id ?? "all",
  })
);

const AUDIT_TRAIL_MOCK: ReportRow[] = [
  {
    created_at: "2026-07-08T10:12:00.000Z",
    user_name: "Nour Eldin",
    action: "update",
    table_name: "student_tasks",
    record_id: "st-001",
  },
  {
    created_at: "2026-07-07T15:40:00.000Z",
    user_name: "Layla Hassan",
    action: "insert",
    table_name: "payments",
    record_id: "pay-014",
  },
  {
    created_at: "2026-07-06T09:05:00.000Z",
    user_name: "Nour Eldin",
    action: "update",
    table_name: "student_class",
    record_id: "sc-042",
  },
  {
    created_at: "2026-06-28T11:30:00.000Z",
    user_name: "Karim Saleh",
    action: "insert",
    table_name: "borrow_equipment",
    record_id: "be-008",
  },
  {
    created_at: "2026-06-15T08:00:00.000Z",
    user_name: "Nour Eldin",
    action: "update",
    table_name: "profiles",
    record_id: "prof-003",
  },
  {
    created_at: "2025-11-28T10:12:00.000Z",
    user_name: "Nour Eldin",
    action: "update",
    table_name: "student_tasks",
    record_id: "st-099",
  },
];

const BACKUP_HISTORY_MOCK: ReportRow[] = [
  {
    created_at: "2026-07-08T08:00:00.000Z",
    created_by_label: "Manager Admin",
    scope: "all",
    table_name: "—",
    file_name: "backup-all-2026-07-08.json",
    row_count: 1240,
  },
  {
    created_at: "2026-07-01T14:30:00.000Z",
    created_by_label: "Nour Eldin",
    scope: "table",
    table_name: "student_profiles",
    file_name: "backup-student_profiles-2026-07-01.json",
    row_count: 248,
  },
  {
    created_at: "2026-06-20T10:15:00.000Z",
    created_by_label: "Manager Admin",
    scope: "table",
    table_name: "payments",
    file_name: "backup-payments-2026-06-20.json",
    row_count: 186,
  },
  {
    created_at: "2025-11-28T08:00:00.000Z",
    created_by_label: "Manager Admin",
    scope: "all",
    table_name: "—",
    file_name: "backup-all-2025-11-28.json",
    row_count: 1180,
  },
];

function buildStudentRoster(filters: ReportFilters): ReportRow[] {
  const allRows = MANAGER_STUDENTS_MOCK.map((student) => ({
    full_name: student.full_name,
    status: student.status,
    phone: student.phone ?? "—",
    email: student.email,
    enrollment_date: formatDate(student.created_at),
  }));

  const filtered = MANAGER_STUDENTS_MOCK.filter((student) => {
    const matchesStatus =
      filters.status === "all" || student.status === filters.status;
    const matchesPeriod = isWithinPeriod(student.created_at, filters.period);
    return matchesStatus && matchesPeriod;
  }).map((student) => ({
    full_name: student.full_name,
    status: student.status,
    phone: student.phone ?? "—",
    email: student.email,
    enrollment_date: formatDate(student.created_at),
  }));

  return withMockFallback(filtered, allRows);
}

function buildEnrollmentSummary(filters: ReportFilters): ReportRow[] {
  const allRows: ReportRow[] = [];
  const rows: ReportRow[] = [];

  for (const student of MANAGER_STUDENTS_MOCK) {
    const classes =
      MANAGER_STUDENT_CLASSES_MOCK[student.student_profile_id] ?? [];
    for (const cls of classes) {
      const row = {
        student_name: student.full_name,
        class_name: cls.name,
        subject_name: cls.subject_name,
        status: cls.status,
        joined_at: formatDate(cls.joined_at),
      };
      allRows.push(row);

      if (
        filters.status !== "all" &&
        cls.status !== filters.status
      ) {
        continue;
      }
      if (!isWithinPeriod(cls.joined_at, filters.period)) {
        continue;
      }
      rows.push(row);
    }
  }

  return withMockFallback(rows, allRows);
}

function buildStudentTranscript(filters: ReportFilters): ReportRow[] {
  const student = getStudentById(filters.studentId);
  const classes =
    MANAGER_STUDENT_CLASSES_MOCK[student.student_profile_id] ?? [];

  const rows = classes.map((cls) => {
    const detail = getManagerStudentClassDetailPreview(
      student.user_id,
      cls.class_id
    );
    const grade = detail.courseGrade;
    const finalGrade = grade
      ? computeManagerStudentCourseFinalGrade(grade)
      : null;

    return {
      class_name: cls.name,
      subject_name: cls.subject_name,
      attendance_grade: formatCourseGradeValue(grade?.attendee_grade),
      task_grade: formatCourseGradeValue(grade?.task_total_grade),
      group_grade: formatCourseGradeValue(grade?.total_group_grade),
      exam_grade: formatCourseGradeValue(grade?.final_exam_grade),
      final_grade: formatCourseGradeValue(finalGrade),
    };
  });

  return withMockFallback(rows, [
    {
      class_name: "Advanced Algebra II",
      subject_name: "Mathematics",
      attendance_grade: "88.0",
      task_grade: "82.5",
      group_grade: "85.0",
      exam_grade: "78.0",
      final_grade: "81.4",
    },
    {
      class_name: "Physics Lab",
      subject_name: "Physics",
      attendance_grade: "80.0",
      task_grade: "74.0",
      group_grade: "72.0",
      exam_grade: "—",
      final_grade: "75.2",
    },
  ]);
}

function buildStudentTasks(filters: ReportFilters): ReportRow[] {
  const student = getStudentById(filters.studentId);
  const classes =
    MANAGER_STUDENT_CLASSES_MOCK[student.student_profile_id] ?? [];
  const allRows: ReportRow[] = [];
  const rows: ReportRow[] = [];

  for (const cls of classes) {
    const detail = getManagerStudentClassDetailPreview(
      student.user_id,
      cls.class_id
    );
    for (const task of detail.tasks) {
      const row = {
        task_title: task.title,
        class_name: cls.name,
        status: task.status,
        grade: task.grade ?? "—",
        max_grade: task.max_grade,
        submitted_at: formatDateTime(task.submitted_at),
        graded_at: formatDateTime(task.graded_at),
      };
      allRows.push(row);
      if (!isWithinPeriod(task.submitted_at ?? task.due_date, filters.period)) {
        continue;
      }
      rows.push(row);
    }
  }

  return withMockFallback(rows, allRows.length > 0 ? allRows : [
    {
      task_title: "Chapter 4 Problem Set",
      class_name: "Advanced Algebra II",
      status: "graded",
      grade: 18,
      max_grade: 20,
      submitted_at: formatDateTime("2026-06-10T14:00:00.000Z"),
      graded_at: formatDateTime("2026-06-12T09:30:00.000Z"),
    },
    {
      task_title: "Lab Report — Motion",
      class_name: "Physics Lab",
      status: "submitted",
      grade: "—",
      max_grade: 25,
      submitted_at: formatDateTime("2026-07-01T16:20:00.000Z"),
      graded_at: "—",
    },
  ]);
}

function buildAtRiskStudents(_filters: ReportFilters): ReportRow[] {
  return [
    {
      student_name: "Maya Ibrahim",
      risk_reason: "Paused enrollment",
      detail: "English Composition — paused since Oct 1",
      severity: "Medium",
    },
    {
      student_name: "Karim Farouk",
      risk_reason: "Low grade",
      detail: "Final grade 68% in Advanced Mathematics",
      severity: "High",
    },
    {
      student_name: "Youssef Nasser",
      risk_reason: "Missing tasks",
      detail: "3 tasks missing in Physics Lab",
      severity: "High",
    },
    {
      student_name: "Rana Mohammed",
      risk_reason: "Outstanding balance",
      detail: "$280 unpaid for Language Bridge Semester",
      severity: "Medium",
    },
  ];
}

function buildClassRoster(filters: ReportFilters): ReportRow[] {
  const classId =
    filters.classId === "all"
      ? MANAGER_CLASSES_MOCK[0]?.class_id
      : filters.classId;
  if (!classId) {
    return [
      {
        student_name: "Sara Ahmad",
        status: "enrolled",
        phone: "+961 71 234 567",
        joined_at: formatDate("2025-09-14T08:15:00.000Z"),
      },
    ];
  }

  const rows: ReportRow[] = [];
  for (const student of MANAGER_STUDENTS_MOCK) {
    const classes =
      MANAGER_STUDENT_CLASSES_MOCK[student.student_profile_id] ?? [];
    const match = classes.find((c) => c.class_id === classId);
    if (!match) continue;
    rows.push({
      student_name: student.full_name,
      status: match.status,
      phone: student.phone ?? "—",
      joined_at: formatDate(match.joined_at),
    });
  }

  return withMockFallback(rows, [
    {
      student_name: "Sara Ahmad",
      status: "enrolled",
      phone: "+961 71 234 567",
      joined_at: formatDate("2025-09-14T08:15:00.000Z"),
    },
    {
      student_name: "Omar Khalil",
      status: "enrolled",
      phone: "+961 76 345 678",
      joined_at: formatDate("2025-09-20T10:00:00.000Z"),
    },
    {
      student_name: "Fatima Zahra",
      status: "stopped",
      phone: "+961 70 456 789",
      joined_at: formatDate("2025-10-05T16:10:00.000Z"),
    },
  ]);
}

function buildClassGradeSheet(filters: ReportFilters): ReportRow[] {
  const classId =
    filters.classId === "all"
      ? DEFAULT_REPORT_CLASS_ID
      : filters.classId;
  const grades = getClassGrades(classId ?? "");

  const rows = grades.map((entry) => ({
    student_name: entry.studentName,
    final_grade: entry.finalGrade,
    attendance_grade: Math.round(entry.finalGrade * 0.1 + 70),
    task_grade: Math.round(entry.finalGrade * 0.45),
    exam_grade: Math.round(entry.finalGrade * 0.3),
  }));

  return withMockFallback(rows, [
    { student_name: "Ahmed Hassan", final_grade: 94, attendance_grade: 79, task_grade: 42, exam_grade: 28 },
    { student_name: "Sara Ali", final_grade: 88, attendance_grade: 79, task_grade: 40, exam_grade: 26 },
    { student_name: "Omar Mahmoud", final_grade: 82, attendance_grade: 78, task_grade: 37, exam_grade: 25 },
  ]);
}

function buildSubjectCatalog(): ReportRow[] {
  return MANAGER_SUBJECTS_MOCK.map((subject) => {
    const links = [
      subject.syllabus_link,
      subject.reference_link,
      subject.handout_link,
    ];
    const completeCount = links.filter(Boolean).length;
    return {
      name: subject.name,
      class_count: subject.class_count,
      syllabus: subject.syllabus_link ? "Yes" : "No",
      reference: subject.reference_link ? "Yes" : "No",
      handout: subject.handout_link ? "Yes" : "No",
      completeness: `${completeCount}/3`,
    };
  });
}

function buildSemesterClassList(filters: ReportFilters): ReportRow[] {
  if (filters.semesterId === "all") {
    return SEMESTER_CLASSES_MOCK.map(({ semester_id: _, ...row }) => row);
  }
  return SEMESTER_CLASSES_MOCK.filter(
    (row) => row.semester_id === filters.semesterId
  ).map(({ semester_id: _, ...row }) => row);
}

function buildPaymentLedger(filters: ReportFilters): ReportRow[] {
  const allRows = PAYMENT_LEDGER_MOCK.map((row) => ({
    ...row,
    paid_at: formatDate(row.paid_at as string),
  }));

  const filtered = PAYMENT_LEDGER_MOCK.filter((row) =>
    isWithinPeriod(row.paid_at as string, filters.period)
  ).map((row) => ({
    ...row,
    paid_at: formatDate(row.paid_at as string),
  }));

  return withMockFallback(filtered, allRows);
}

function buildOutstandingBalances(filters: ReportFilters): ReportRow[] {
  if (filters.semesterId === "all") {
    return OUTSTANDING_BALANCES_MOCK;
  }
  const semester = MANAGER_PHASES_MOCK.find((s) => s.id === filters.semesterId);
  if (!semester) return OUTSTANDING_BALANCES_MOCK;
  return OUTSTANDING_BALANCES_MOCK.filter(
    (row) => row.semester_name === semester.name
  );
}

function buildSubscriptionRegister(filters: ReportFilters): ReportRow[] {
  return SUBSCRIPTION_REGISTER_MOCK.filter((row) => {
    const matchesStatus =
      filters.status === "all" || row.status === filters.status;
    const semester = MANAGER_PHASES_MOCK.find(
      (s) => s.id === filters.semesterId
    );
    const matchesSemester =
      filters.semesterId === "all" ||
      !semester ||
      row.semester_name === semester.name;
    return matchesStatus && matchesSemester;
  }).map((row) => ({
    ...row,
    created_at: formatDate(row.created_at as string),
  }));
}

function buildAccountStatement(filters: ReportFilters): ReportRow[] {
  const student = getStudentById(filters.studentId);
  const rawRows = [
    {
      date: "2026-06-12T08:15:00.000Z",
      type: "Subscription",
      description: "Fall 2025 Core Semester",
      amount: 450,
      balance: 450,
    },
    {
      date: "2026-06-20T10:00:00.000Z",
      type: "Payment",
      description: "Bank transfer",
      amount: -200,
      balance: 250,
    },
    {
      date: "2026-07-01T14:00:00.000Z",
      type: "Takeout",
      description: "Lab materials fee",
      amount: 35,
      balance: 285,
    },
    {
      date: "2026-07-05T09:00:00.000Z",
      type: "Payment",
      description: "Cash",
      amount: -150,
      balance: 135,
    },
  ];

  const mapped = rawRows.map((row) => ({
    date: formatDate(row.date),
    type: row.type,
    description:
      filters.studentId !== "all" && student.full_name !== "Sara Ahmad"
        ? `${row.description} — ${student.full_name}`
        : row.description,
    amount: row.amount,
    balance: row.balance,
  }));

  const filtered = rawRows
    .filter((row) => isWithinPeriod(row.date, filters.period))
    .map((row, index) => mapped[index]!);

  return withMockFallback(filtered, mapped);
}

function buildRevenueSummary(filters: ReportFilters): ReportRow[] {
  const weekly: ReportRow[] = [
    { period_label: "Week 1", payment_count: 8, total_revenue: 4200, currency: "USD" },
    { period_label: "Week 2", payment_count: 12, total_revenue: 5100, currency: "USD" },
    { period_label: "Week 3", payment_count: 10, total_revenue: 4800, currency: "USD" },
    { period_label: "Week 4", payment_count: 14, total_revenue: 6200, currency: "USD" },
  ];
  const monthly: ReportRow[] = [
    { period_label: "September 2025", payment_count: 42, total_revenue: 18400, currency: "USD" },
    { period_label: "October 2025", payment_count: 38, total_revenue: 16200, currency: "USD" },
    { period_label: "November 2025", payment_count: 44, total_revenue: 19800, currency: "USD" },
  ];
  const semester: ReportRow[] = MANAGER_PHASES_MOCK.slice(0, 4).map((sem) => ({
    period_label: sem.name,
    payment_count: 28 + sem.nb_courses * 2,
    total_revenue: sem.amount * 40,
    currency: "USD",
  }));

  if (filters.granularity === "week") {
    return filters.period === "7d" ? weekly.slice(0, 1) : weekly;
  }
  if (filters.granularity === "semester") {
    return semester;
  }
  return monthly;
}

function buildBorrowLog(filters: ReportFilters): ReportRow[] {
  const allBorrows = [
    ...Object.entries(MANAGER_STUDENT_BORROW_EQUIPMENT_MOCK).flatMap(
      ([userId, rows]) =>
        rows.map((row) => ({
          ...row,
          borrower_name: getStudentNameByUserId(userId),
        }))
    ),
    ...getDefaultStudentBorrowEquipmentPreview().map((row) => ({
      ...row,
      borrower_name: "Preview Student",
    })),
  ];

  const mapRow = (row: (typeof allBorrows)[number]) => ({
    equipment_name: row.equipment_name,
    borrower_name: row.borrower_name,
    quantity: row.quantity,
    borrowed_at: formatDateTime(row.borrowed_at),
    returned_at: formatDateTime(row.returned_at),
    status: row.status,
  });

  const allRows = allBorrows.map(mapRow);
  const filtered = allBorrows
    .filter((row) => isWithinPeriod(row.borrowed_at, filters.period))
    .map(mapRow);

  return withMockFallback(filtered, allRows);
}

function buildOpenBorrows(): ReportRow[] {
  const now = Date.now();
  const allBorrows = [
    ...Object.entries(MANAGER_STUDENT_BORROW_EQUIPMENT_MOCK).flatMap(
      ([userId, rows]) =>
        rows.map((row) => ({
          ...row,
          borrower_name: getStudentNameByUserId(userId),
        }))
    ),
    ...getDefaultStudentBorrowEquipmentPreview().map((row) => ({
      ...row,
      borrower_name: "Preview Student",
    })),
  ];

  return allBorrows
    .filter((row) => row.status === BORROW_EQUIPMENT_STATUSES.BORROWED)
    .map((row) => {
      const daysOut = Math.max(
        1,
        Math.floor(
          (now - new Date(row.borrowed_at).getTime()) / (24 * 60 * 60 * 1000)
        )
      );
      return {
        equipment_name: row.equipment_name,
        borrower_name: row.borrower_name,
        quantity: row.quantity,
        borrowed_at: formatDateTime(row.borrowed_at),
        days_out: daysOut,
      };
    });
}

function buildRelationshipsDirectory(filters: ReportFilters): ReportRow[] {
  const query = filters.search.trim().toLowerCase();
  return MANAGER_RELATIONSHIPS_MOCK.filter((row) => {
    if (!query) return true;
    return (
      row.name.toLowerCase().includes(query) ||
      (row.phone?.toLowerCase().includes(query) ?? false) ||
      (row.relation_with?.toLowerCase().includes(query) ?? false) ||
      (row.major?.toLowerCase().includes(query) ?? false)
    );
  }).map((row) => ({
    name: row.name,
    phone: row.phone,
    relation_with: row.relation_with,
    major: row.major,
    speciality: row.speciality,
    is_useful: row.is_useful ? "Yes" : "No",
  }));
}

function buildAuditTrail(filters: ReportFilters): ReportRow[] {
  const mapRow = (row: ReportRow) => ({
    ...row,
    created_at: formatDateTime(row.created_at as string),
  });

  const allRows = AUDIT_TRAIL_MOCK.map(mapRow);
  const filtered = AUDIT_TRAIL_MOCK.filter((row) => {
    const matchesPeriod = isWithinPeriod(
      row.created_at as string,
      filters.period
    );
    const matchesUser =
      filters.userId === "all" ||
      row.user_name ===
        MANAGER_USERS_MOCK.find((u) => u.id === filters.userId)?.username;
    const matchesTable =
      filters.tableName === "all" || row.table_name === filters.tableName;
    return matchesPeriod && matchesUser && matchesTable;
  }).map(mapRow);

  return withMockFallback(filtered, allRows);
}

function buildBackupHistory(filters: ReportFilters): ReportRow[] {
  const mapRow = (row: ReportRow) => ({
    ...row,
    created_at: formatDateTime(row.created_at as string),
  });

  const allRows = BACKUP_HISTORY_MOCK.map(mapRow);
  const filtered = BACKUP_HISTORY_MOCK.filter((row) =>
    isWithinPeriod(row.created_at as string, filters.period)
  ).map(mapRow);

  return withMockFallback(filtered, allRows);
}

export function getReportRows(
  reportId: ReportId,
  filters: ReportFilters
): ReportRow[] {
  switch (reportId) {
    case "student_roster":
      return buildStudentRoster(filters);
    case "enrollment_summary":
      return buildEnrollmentSummary(filters);
    case "student_transcript":
      return buildStudentTranscript(filters);
    case "student_tasks":
      return buildStudentTasks(filters);
    case "at_risk_students":
      return buildAtRiskStudents(filters);
    case "class_roster":
      return buildClassRoster(filters);
    case "class_grade_sheet":
      return buildClassGradeSheet(filters);
    case "teacher_assignments":
      return buildTeacherAssignments(filters);
    case "subject_catalog":
      return buildSubjectCatalog();
    case "semester_class_list":
      return buildSemesterClassList(filters);
    case "payment_ledger":
      return buildPaymentLedger(filters);
    case "outstanding_balances":
      return buildOutstandingBalances(filters);
    case "subscription_register":
      return buildSubscriptionRegister(filters);
    case "account_statement":
      return buildAccountStatement(filters);
    case "revenue_summary":
      return buildRevenueSummary(filters);
    case "inventory_list":
      return INVENTORY_MOCK;
    case "borrow_log":
      return buildBorrowLog(filters);
    case "open_borrows":
      return buildOpenBorrows();
    case "relationships_directory":
      return buildRelationshipsDirectory(filters);
    case "audit_trail":
      return buildAuditTrail(filters);
    case "backup_history":
      return buildBackupHistory(filters);
    default:
      return [];
  }
}

function buildTeacherAssignments(filters: ReportFilters): ReportRow[] {
  if (filters.semesterId === "all") {
    return TEACHER_ASSIGNMENTS_MOCK.map((row) => ({
      ...row,
      assigned_at: formatDate(row.assigned_at as string),
    }));
  }
  return TEACHER_ASSIGNMENTS_MOCK.map((row) => ({
    ...row,
    assigned_at: formatDate(row.assigned_at as string),
  }));
}

export const AUDIT_TABLE_OPTIONS = [
  "student_tasks",
  "payments",
  "student_class",
  "profiles",
  "borrow_equipment",
] as const;

export const DEFAULT_REPORT_STUDENT_ID = SARA_PROFILE_ID;
export const DEFAULT_REPORT_CLASS_ID =
  MANAGER_CLASSES_MOCK[0]?.class_id ?? "cls-math-adv";
