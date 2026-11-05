import type { Database } from "@/types/supabase";

type PublicTableName = keyof Database["public"]["Tables"];

/**
 * Every public table, in FK-safe insert order for SQL restores.
 * Keep this list complete — `_assertBackupTablesComplete` fails if a table is missing.
 */
export const BACKUP_TABLES = [
  "app_settings",
  "permissions",
  "role_permissions",
  "profiles",
  "student_profiles",
  "equipments",
  "semesters",
  "student_semester",
  "subjects",
  "categories",
  "exercises",
  "category_exercises",
  "subject_categories",
  "subject_exercises",
  "instructor_subjects",
  "instructor_subject_capability",
  "classes",
  "class_categories",
  "class_teacher",
  "student_class",
  "sessions",
  "weekly_schedule_slots",
  "workshops",
  "instructor_schedule_slots",
  "workshop_instructors",
  "workshop_documents",
  "workshop_payments",
  "workshop_sessions",
  "attendee",
  "subject_tasks",
  "class_tasks",
  "student_tasks",
  "student_task_uploads",
  "student_course_grade",
  "final_exam",
  "student_finalexam_grade",
  "borrow_equipment",
  "student_takeouts",
  "payment_phases",
  "student_payment_phases",
  "semester_drop_requests",
  "student_payments",
  "student_payment_schedules",
  "student_payment_phase_clearances",
  "student_financial_adjustments",
  "student_financial_form_invites",
  "student_financial_forms",
  "email_sent",
  "email_users",
  "guests",
  "teams",
  "team_guests",
  "guest_status_events",
  "student_registration_applications",
  "student_registration_documents",
  "guest_registration_invites",
  "gallery_images",
  "public_projects",
  "blogs",
  "transactions",
  "notifications",
  "audit_logs",
  "backup_history",
] as const satisfies readonly PublicTableName[];

export type BackupTableName = (typeof BACKUP_TABLES)[number];

/** Stable order for paged exports. Tables without `id` use their primary key. */
const BACKUP_TABLE_ORDER_OVERRIDES: Partial<
  Record<BackupTableName, readonly string[]>
> = {
  category_exercises: ["category_id", "exercise_id"],
  permissions: ["key"],
  role_permissions: ["role", "permission_key"],
  subject_categories: ["subject_id", "category_id"],
  subject_exercises: ["subject_id", "exercise_id"],
};

export function getBackupTableOrderColumns(
  tableName: BackupTableName
): readonly string[] {
  return BACKUP_TABLE_ORDER_OVERRIDES[tableName] ?? ["id"];
}

type MissingPublicTables = Exclude<PublicTableName, BackupTableName>;
const _assertBackupTablesComplete: MissingPublicTables extends never
  ? true
  : MissingPublicTables = true;
void _assertBackupTablesComplete;

export const BACKUP_TABLE_LABELS: Record<BackupTableName, string> = {
  app_settings: "App settings",
  permissions: "Permissions",
  role_permissions: "Role permissions",
  profiles: "Profiles",
  student_profiles: "Student profiles",
  equipments: "Equipments",
  semesters: "Semesters",
  student_semester: "Student semester",
  subjects: "Subjects",
  categories: "Categories",
  exercises: "Exercises",
  category_exercises: "Category exercises",
  subject_categories: "Subject categories",
  subject_exercises: "Subject exercises",
  instructor_subjects: "Instructor subjects",
  instructor_subject_capability: "Instructor subject capabilities",
  classes: "Classes",
  class_categories: "Class categories",
  class_teacher: "Class teacher",
  student_class: "Student class",
  sessions: "Sessions",
  weekly_schedule_slots: "Weekly schedule slots",
  workshops: "Workshops",
  instructor_schedule_slots: "Instructor schedule slots",
  workshop_instructors: "Workshop instructors",
  workshop_documents: "Workshop documents",
  workshop_payments: "Workshop payments",
  workshop_sessions: "Workshop sessions",
  attendee: "Attendee",
  subject_tasks: "Subject tasks",
  class_tasks: "Class tasks",
  student_tasks: "Student tasks",
  student_task_uploads: "Student task uploads",
  student_course_grade: "Student course grade",
  final_exam: "Final exam",
  student_finalexam_grade: "Student final exam grade",
  borrow_equipment: "Borrow equipment",
  student_takeouts: "Student takeouts",
  payment_phases: "Payment phases",
  student_payment_phases: "Student payment phases",
  semester_drop_requests: "Semester drop requests",
  student_payments: "Student payments",
  student_payment_schedules: "Student payment schedules",
  student_payment_phase_clearances: "SPP month paid clearances",
  student_financial_adjustments: "Student financial adjustments",
  student_financial_form_invites: "Student financial form invites",
  student_financial_forms: "Student financial forms",
  email_sent: "Email sent",
  email_users: "Email users",
  guests: "Guests",
  teams: "Teams",
  team_guests: "Team guests",
  guest_status_events: "Guest status events",
  student_registration_applications: "Student registration applications",
  student_registration_documents: "Student registration documents",
  guest_registration_invites: "Guest registration invites",
  gallery_images: "Gallery images",
  public_projects: "Public projects",
  blogs: "Blogs",
  transactions: "Transactions",
  notifications: "Notifications",
  audit_logs: "Audit logs",
  backup_history: "Backup history",
};
