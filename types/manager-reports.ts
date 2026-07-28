import type { AnalyticsPeriod } from "@/types/manager-analytics";

export type ReportCategory =
  | "student"
  | "class"
  | "equipment"
  | "operations";

export type ReportId =
  | "student_roster"
  | "enrollment_summary"
  | "student_transcript"
  | "student_tasks"
  | "at_risk_students"
  | "class_roster"
  | "class_grade_sheet"
  | "teacher_assignments"
  | "subject_catalog"
  | "semester_class_list"
  | "inventory_list"
  | "borrow_log"
  | "open_borrows"
  | "relationships_directory"
  | "audit_trail"
  | "backup_history";

export type ReportFilterKey =
  | "period"
  | "semester"
  | "class"
  | "student"
  | "status"
  | "user"
  | "table"
  | "granularity"
  | "search";

export type ReportGranularity = "week" | "month" | "semester";

export type ReportFilters = {
  period: AnalyticsPeriod;
  semesterId: string | "all";
  classId: string | "all";
  studentId: string | "all";
  status: string | "all";
  userId: string | "all";
  tableName: string | "all";
  granularity: ReportGranularity;
  search: string;
};

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
};

export type ReportDefinition = {
  id: ReportId;
  category: ReportCategory;
  label: string;
  description: string;
  columns: ReportColumn[];
  filters: ReportFilterKey[];
};

export type ReportRow = Record<string, string | number | null>;

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  period: "30d",
  semesterId: "all",
  classId: "all",
  studentId: "all",
  status: "all",
  userId: "all",
  tableName: "all",
  granularity: "month",
  search: "",
};
