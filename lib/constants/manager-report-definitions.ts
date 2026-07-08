import type { ReportCategory, ReportDefinition, ReportId } from "@/types/manager-reports";

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  student: "Student",
  class: "Class & academic",
  financial: "Financial",
  equipment: "Equipment",
  operations: "Contacts & operations",
};

export const REPORT_CATEGORY_ORDER: ReportCategory[] = [
  "student",
  "class",
  "financial",
  "equipment",
  "operations",
];

export const MANAGER_REPORT_DEFINITIONS: ReportDefinition[] = [
  {
    id: "student_roster",
    category: "student",
    label: "Student roster",
    description: "All students with name, status, phone, and enrollment date.",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "status", label: "Status" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "enrollment_date", label: "Enrollment date" },
    ],
    filters: ["period", "status"],
  },
  {
    id: "enrollment_summary",
    category: "student",
    label: "Enrollment summary",
    description: "Student class enrollments joined with class and subject.",
    columns: [
      { key: "student_name", label: "Student" },
      { key: "class_name", label: "Class" },
      { key: "subject_name", label: "Subject" },
      { key: "status", label: "Status" },
      { key: "joined_at", label: "Joined" },
    ],
    filters: ["period", "semester", "status"],
  },
  {
    id: "student_transcript",
    category: "student",
    label: "Student transcript",
    description: "Course grades with component breakdown per class.",
    columns: [
      { key: "class_name", label: "Class" },
      { key: "subject_name", label: "Subject" },
      { key: "attendance_grade", label: "Attendance", align: "right" },
      { key: "task_grade", label: "Tasks", align: "right" },
      { key: "group_grade", label: "Group", align: "right" },
      { key: "exam_grade", label: "Exam", align: "right" },
      { key: "final_grade", label: "Final", align: "right" },
    ],
    filters: ["student"],
  },
  {
    id: "student_tasks",
    category: "student",
    label: "Task report per student",
    description: "Assignment grades, status, and submission dates.",
    columns: [
      { key: "task_title", label: "Task" },
      { key: "class_name", label: "Class" },
      { key: "status", label: "Status" },
      { key: "grade", label: "Grade", align: "right" },
      { key: "max_grade", label: "Max", align: "right" },
      { key: "submitted_at", label: "Submitted" },
      { key: "graded_at", label: "Graded" },
    ],
    filters: ["student", "period"],
  },
  {
    id: "at_risk_students",
    category: "student",
    label: "At-risk students",
    description: "Students with low grades, incomplete tasks, or paused enrollments.",
    columns: [
      { key: "student_name", label: "Student" },
      { key: "risk_reason", label: "Risk factor" },
      { key: "detail", label: "Detail" },
      { key: "severity", label: "Severity" },
    ],
    filters: ["semester"],
  },
  {
    id: "class_roster",
    category: "class",
    label: "Class roster",
    description: "Students enrolled in the selected class.",
    columns: [
      { key: "student_name", label: "Student" },
      { key: "status", label: "Status" },
      { key: "phone", label: "Phone" },
      { key: "joined_at", label: "Joined" },
    ],
    filters: ["class"],
  },
  {
    id: "class_grade_sheet",
    category: "class",
    label: "Class grade sheet",
    description: "Final grades for all students in a class.",
    columns: [
      { key: "student_name", label: "Student" },
      { key: "final_grade", label: "Final grade", align: "right" },
      { key: "attendance_grade", label: "Attendance", align: "right" },
      { key: "task_grade", label: "Tasks", align: "right" },
      { key: "exam_grade", label: "Exam", align: "right" },
    ],
    filters: ["class"],
  },
  {
    id: "teacher_assignments",
    category: "class",
    label: "Teacher assignment list",
    description: "Teachers assigned to classes for the selected semester.",
    columns: [
      { key: "teacher_name", label: "Teacher" },
      { key: "class_name", label: "Class" },
      { key: "subject_name", label: "Subject" },
      { key: "assigned_at", label: "Assigned" },
    ],
    filters: ["semester"],
  },
  {
    id: "subject_catalog",
    category: "class",
    label: "Subject catalog",
    description: "Subjects with resource link completeness.",
    columns: [
      { key: "name", label: "Subject" },
      { key: "class_count", label: "Classes", align: "right" },
      { key: "syllabus", label: "Syllabus" },
      { key: "reference", label: "Reference" },
      { key: "handout", label: "Handout" },
      { key: "completeness", label: "Links complete" },
    ],
    filters: [],
  },
  {
    id: "semester_class_list",
    category: "class",
    label: "Semester class list",
    description: "Classes offered in the selected semester.",
    columns: [
      { key: "class_name", label: "Class" },
      { key: "subject_name", label: "Subject" },
      { key: "status", label: "Status" },
      { key: "enrollment_count", label: "Enrolled", align: "right" },
      { key: "semester_name", label: "Semester" },
    ],
    filters: ["semester"],
  },
  {
    id: "payment_ledger",
    category: "financial",
    label: "Payment ledger",
    description: "Payment transactions with date, amount, method, and currency.",
    columns: [
      { key: "paid_at", label: "Date" },
      { key: "student_name", label: "Student" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "currency", label: "Currency" },
      { key: "method", label: "Method" },
    ],
    filters: ["period"],
  },
  {
    id: "outstanding_balances",
    category: "financial",
    label: "Outstanding balances",
    description: "Unpaid subscription balances per account.",
    columns: [
      { key: "student_name", label: "Student" },
      { key: "semester_name", label: "Semester" },
      { key: "subscribed", label: "Subscribed", align: "right" },
      { key: "paid", label: "Paid", align: "right" },
      { key: "balance", label: "Balance", align: "right" },
    ],
    filters: ["semester"],
  },
  {
    id: "subscription_register",
    category: "financial",
    label: "Subscription register",
    description: "Semester subscriptions by status.",
    columns: [
      { key: "student_name", label: "Student" },
      { key: "semester_name", label: "Semester" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Created" },
    ],
    filters: ["semester", "status"],
  },
  {
    id: "account_statement",
    category: "financial",
    label: "Account statement",
    description: "Per-student subscriptions, payments, and takeouts.",
    columns: [
      { key: "date", label: "Date" },
      { key: "type", label: "Type" },
      { key: "description", label: "Description" },
      { key: "amount", label: "Amount", align: "right" },
      { key: "balance", label: "Balance", align: "right" },
    ],
    filters: ["student", "period"],
  },
  {
    id: "revenue_summary",
    category: "financial",
    label: "Revenue summary",
    description: "Aggregated revenue totals by period granularity.",
    columns: [
      { key: "period_label", label: "Period" },
      { key: "payment_count", label: "Payments", align: "right" },
      { key: "total_revenue", label: "Revenue", align: "right" },
      { key: "currency", label: "Currency" },
    ],
    filters: ["period", "granularity"],
  },
  {
    id: "inventory_list",
    category: "equipment",
    label: "Inventory list",
    description: "Equipment catalog with quantity, unit price, and total value.",
    columns: [
      { key: "name", label: "Item" },
      { key: "quantity", label: "Qty", align: "right" },
      { key: "unit_price", label: "Unit price", align: "right" },
      { key: "total_value", label: "Total value", align: "right" },
      { key: "stock_status", label: "Stock" },
    ],
    filters: [],
  },
  {
    id: "borrow_log",
    category: "equipment",
    label: "Borrow log",
    description: "Equipment borrow history with borrower and dates.",
    columns: [
      { key: "equipment_name", label: "Equipment" },
      { key: "borrower_name", label: "Borrower" },
      { key: "quantity", label: "Qty", align: "right" },
      { key: "borrowed_at", label: "Borrowed" },
      { key: "returned_at", label: "Returned" },
      { key: "status", label: "Status" },
    ],
    filters: ["period"],
  },
  {
    id: "open_borrows",
    category: "equipment",
    label: "Open borrows",
    description: "Items not yet returned.",
    columns: [
      { key: "equipment_name", label: "Equipment" },
      { key: "borrower_name", label: "Borrower" },
      { key: "quantity", label: "Qty", align: "right" },
      { key: "borrowed_at", label: "Borrowed" },
      { key: "days_out", label: "Days out", align: "right" },
    ],
    filters: [],
  },
  {
    id: "relationships_directory",
    category: "operations",
    label: "Relationships directory",
    description: "Contact directory with relation and specialty.",
    columns: [
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "relation_with", label: "Relation" },
      { key: "major", label: "Major" },
      { key: "speciality", label: "Speciality" },
      { key: "is_useful", label: "Useful" },
    ],
    filters: ["search"],
  },
  {
    id: "audit_trail",
    category: "operations",
    label: "Audit trail",
    description: "System change log filtered by user and table.",
    columns: [
      { key: "created_at", label: "Date" },
      { key: "user_name", label: "User" },
      { key: "action", label: "Action" },
      { key: "table_name", label: "Table" },
      { key: "record_id", label: "Record ID" },
    ],
    filters: ["period", "user", "table"],
  },
  {
    id: "backup_history",
    category: "operations",
    label: "Backup history",
    description: "Database export history. Use Backup for full exports.",
    columns: [
      { key: "created_at", label: "Date" },
      { key: "created_by_label", label: "Created by" },
      { key: "scope", label: "Scope" },
      { key: "table_name", label: "Table" },
      { key: "file_name", label: "File" },
      { key: "row_count", label: "Rows", align: "right" },
    ],
    filters: ["period"],
  },
];

export function getReportDefinition(reportId: ReportId): ReportDefinition {
  const definition = MANAGER_REPORT_DEFINITIONS.find(
    (report) => report.id === reportId
  );
  if (!definition) {
    throw new Error(`Unknown report id: ${reportId}`);
  }
  return definition;
}

export function getReportsByCategory(
  category: ReportCategory
): ReportDefinition[] {
  return MANAGER_REPORT_DEFINITIONS.filter(
    (report) => report.category === category
  );
}

export function getDefaultReportForCategory(
  category: ReportCategory
): ReportId {
  const reports = getReportsByCategory(category);
  return reports[0]?.id ?? "student_roster";
}
