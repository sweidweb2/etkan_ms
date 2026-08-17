/**
 * Official RBAC permission keys (Phase 1).
 *
 * Source of truth for seeds and the authorization engine.
 * New feature / action → update `docs/[11] RBAC/[02] permission-definitions.md`
 * first, then add the matching entry here.
 */

export const PERMISSION_ACCESS = {
  READ: "read",
  WRITE: "write",
} as const;

export type PermissionAccess =
  (typeof PERMISSION_ACCESS)[keyof typeof PERMISSION_ACCESS];

export const PERMISSION_FEATURES = [
  "dashboard",
  "users",
  "students",
  "relationships",
  "subjects",
  "instructors",
  "classes",
  "sessions",
  "attendance",
  "tasks",
  "final_exams",
  "grades",
  "semesters",
  "equipment",
  "gallery",
  "projects",
  "schedule",
  "instructor_schedules",
  "workshops",
  "notifications",
  "emailing",
  "accounting",
  "reports",
  "analytics",
  "backup",
  "logs",
  "cloudflare_ai_usage",
  "registrations",
  "guests",
  "cron_jobs",
  "settings",
  "rbac",
] as const;

export type PermissionFeature = (typeof PERMISSION_FEATURES)[number];

export const PERMISSION_FEATURE_LABELS: Record<PermissionFeature, string> = {
  dashboard: "Dashboard",
  users: "Users",
  students: "Students",
  relationships: "Relationships",
  subjects: "Subjects",
  instructors: "Instructors",
  classes: "Classes",
  sessions: "Sessions",
  attendance: "Attendance",
  tasks: "Tasks",
  final_exams: "Final Exams",
  grades: "Grades",
  semesters: "Semesters",
  equipment: "Equipment",
  gallery: "Gallery",
  projects: "Projects",
  schedule: "Schedule",
  instructor_schedules: "Instructor Schedules",
  workshops: "Workshops",
  notifications: "Notifications",
  emailing: "Emailing",
  accounting: "Accounting",
  reports: "Reports",
  analytics: "Analytics",
  backup: "Backup",
  logs: "Logs",
  cloudflare_ai_usage: "Cloudflare AI usage",
  registrations: "Registrations",
  guests: "Guests",
  cron_jobs: "Cron Jobs",
  settings: "Settings",
  rbac: "RBAC",
};

/** Stable permission keys — import these in services and UI. */
export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",

  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_UPDATE: "users.update",

  STUDENTS_VIEW: "students.view",
  STUDENTS_CREATE: "students.create",
  STUDENTS_UPDATE: "students.update",
  STUDENTS_CHANGE_STATUS: "students.change_status",

  RELATIONSHIPS_VIEW: "relationships.view",
  RELATIONSHIPS_CREATE: "relationships.create",
  RELATIONSHIPS_UPDATE: "relationships.update",

  SUBJECTS_VIEW: "subjects.view",
  SUBJECTS_CREATE: "subjects.create",
  SUBJECTS_UPDATE: "subjects.update",
  SUBJECTS_DELETE: "subjects.delete",

  INSTRUCTORS_VIEW: "instructors.view",
  INSTRUCTORS_CREATE: "instructors.create",
  INSTRUCTORS_DELETE: "instructors.delete",
  INSTRUCTORS_CAPABILITIES_UPDATE: "instructors.capabilities.update",

  CLASSES_VIEW: "classes.view",
  CLASSES_CREATE: "classes.create",
  CLASSES_UPDATE: "classes.update",
  CLASSES_CHANGE_STATUS: "classes.change_status",
  CLASSES_ASSIGN_TEACHER: "classes.assign_teacher",
  CLASSES_UNASSIGN_TEACHER: "classes.unassign_teacher",
  CLASSES_ADD_STUDENT: "classes.add_student",
  CLASSES_REMOVE_STUDENT: "classes.remove_student",
  CLASSES_VIEW_ANALYTICS: "classes.view_analytics",

  SESSIONS_VIEW: "sessions.view",
  SESSIONS_CREATE: "sessions.create",
  SESSIONS_UPDATE: "sessions.update",
  SESSIONS_DELETE: "sessions.delete",
  SESSIONS_UPDATE_SETTINGS: "sessions.update_settings",

  ATTENDANCE_VIEW: "attendance.view",
  ATTENDANCE_UPDATE: "attendance.update",

  TASKS_VIEW: "tasks.view",
  TASKS_CREATE: "tasks.create",
  TASKS_UPDATE_STUDENT: "tasks.update_student",

  FINAL_EXAMS_VIEW: "final_exams.view",
  FINAL_EXAMS_CREATE: "final_exams.create",
  FINAL_EXAMS_UPDATE: "final_exams.update",
  FINAL_EXAMS_UPDATE_STUDENT: "final_exams.update_student",

  GRADES_VIEW: "grades.view",
  GRADES_COMPUTE: "grades.compute",
  GRADES_COMPUTE_ALL: "grades.compute_all",
  GRADES_COMPUTE_CUSTOM: "grades.compute_custom",
  GRADES_DELETE: "grades.delete",
  GRADES_EXPORT_CERTIFICATES: "grades.export_certificates",
  GRADES_EXPORT_FAST_CERTIFICATE: "grades.export_fast_certificate",
  GRADES_PREVIEW_CERTIFICATE: "grades.preview_certificate",

  SEMESTERS_VIEW: "semesters.view",
  SEMESTERS_CREATE: "semesters.create",
  SEMESTERS_UPDATE: "semesters.update",
  SEMESTERS_ADD_STUDENT: "semesters.add_student",
  SEMESTERS_CONNECT_CLASS: "semesters.connect_class",

  EQUIPMENT_VIEW: "equipment.view",
  EQUIPMENT_CREATE: "equipment.create",
  EQUIPMENT_UPDATE: "equipment.update",
  EQUIPMENT_VIEW_BORROWS: "equipment.view_borrows",
  EQUIPMENT_BORROW_CREATE: "equipment.borrow_create",
  EQUIPMENT_BORROW_UPDATE: "equipment.borrow_update",
  EQUIPMENT_BORROW_RETURN: "equipment.borrow_return",

  GALLERY_VIEW: "gallery.view",
  GALLERY_CREATE: "gallery.create",
  GALLERY_UPDATE: "gallery.update",
  GALLERY_DELETE: "gallery.delete",

  PROJECTS_VIEW: "projects.view",
  PROJECTS_CREATE: "projects.create",
  PROJECTS_UPDATE: "projects.update",
  PROJECTS_DELETE: "projects.delete",

  SCHEDULE_VIEW: "schedule.view",
  SCHEDULE_CREATE: "schedule.create",
  SCHEDULE_UPDATE: "schedule.update",
  SCHEDULE_DELETE: "schedule.delete",

  INSTRUCTOR_SCHEDULES_VIEW: "instructor_schedules.view",
  INSTRUCTOR_SCHEDULES_DETAILS_VIEW: "instructor_schedules.details.view",
  INSTRUCTOR_SCHEDULES_CREATE: "instructor_schedules.create",
  INSTRUCTOR_SCHEDULES_UPDATE: "instructor_schedules.update",
  INSTRUCTOR_SCHEDULES_DELETE: "instructor_schedules.delete",

  WORKSHOPS_VIEW: "workshops.view",
  WORKSHOPS_CREATE: "workshops.create",
  WORKSHOPS_UPDATE: "workshops.update",
  WORKSHOPS_DELETE: "workshops.delete",
  WORKSHOPS_CHANGE_STATUS: "workshops.change_status",
  WORKSHOPS_INSTRUCTORS_CREATE: "workshops.instructors.create",
  WORKSHOPS_INSTRUCTORS_UPDATE: "workshops.instructors.update",
  WORKSHOPS_INSTRUCTORS_DELETE: "workshops.instructors.delete",
  WORKSHOPS_DOCUMENTS_CREATE: "workshops.documents.create",
  WORKSHOPS_DOCUMENTS_UPDATE: "workshops.documents.update",
  WORKSHOPS_DOCUMENTS_DELETE: "workshops.documents.delete",
  WORKSHOPS_SESSIONS_CREATE: "workshops.sessions.create",
  WORKSHOPS_SESSIONS_UPDATE: "workshops.sessions.update",
  WORKSHOPS_SESSIONS_DELETE: "workshops.sessions.delete",
  WORKSHOPS_PAYMENTS_VIEW: "workshops.payments.view",
  WORKSHOPS_PAYMENTS_CREATE: "workshops.payments.create",
  WORKSHOPS_PAYMENTS_UPDATE: "workshops.payments.update",
  WORKSHOPS_PAYMENTS_DELETE: "workshops.payments.delete",

  NOTIFICATIONS_VIEW: "notifications.view",
  NOTIFICATIONS_CREATE: "notifications.create",
  NOTIFICATIONS_UPDATE: "notifications.update",
  NOTIFICATIONS_MARK_READ: "notifications.mark_read",
  NOTIFICATIONS_DELETE: "notifications.delete",

  EMAILING_VIEW: "emailing.view",
  EMAILING_SEND: "emailing.send",
  EMAILING_RESEND: "emailing.resend",

  ACCOUNTING_VIEW: "accounting.view",
  ACCOUNTING_INCOME_STATEMENT_VIEW: "accounting.income_statement.view",
  ACCOUNTING_INCOME_STATEMENT_ANALYTICS_VIEW:
    "accounting.income_statement.analytics.view",
  ACCOUNTING_TRANSACTIONS_CREATE: "accounting.transactions.create",
  ACCOUNTING_TRANSACTIONS_UPDATE: "accounting.transactions.update",
  ACCOUNTING_TRANSACTIONS_DELETE: "accounting.transactions.delete",
  ACCOUNTING_PAYMENT_PHASES_CREATE: "accounting.payment_phases.create",
  ACCOUNTING_PAYMENT_PHASES_UPDATE: "accounting.payment_phases.update",
  ACCOUNTING_PAYMENT_PHASES_CANCEL: "accounting.payment_phases.cancel",
  ACCOUNTING_SPP_TRANSFER: "accounting.spp.transfer",
  ACCOUNTING_SPP_DELETE: "accounting.spp.delete",
  ACCOUNTING_PAYMENTS_CREATE: "accounting.payments.create",
  ACCOUNTING_PAYMENTS_UPDATE: "accounting.payments.update",
  ACCOUNTING_PAYMENTS_DELETE: "accounting.payments.delete",
  ACCOUNTING_ADJUSTMENTS_CREATE: "accounting.adjustments.create",
  ACCOUNTING_ADJUSTMENTS_UPDATE: "accounting.adjustments.update",
  ACCOUNTING_ADJUSTMENTS_DELETE: "accounting.adjustments.delete",

  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",
  REPORTS_PRINT: "reports.print",

  ANALYTICS_VIEW: "analytics.view",

  BACKUP_VIEW: "backup.view",
  BACKUP_EXPORT_TABLE: "backup.export_table",
  BACKUP_EXPORT_FULL: "backup.export_full",
  BACKUP_DOWNLOAD: "backup.download",

  LOGS_VIEW: "logs.view",

  CLOUDFLARE_AI_USAGE_VIEW: "cloudflare_ai_usage.view",

  REGISTRATIONS_VIEW: "registrations.view",
  REGISTRATIONS_UPDATE_STATUS: "registrations.update_status",

  GUESTS_VIEW: "guests.view",
  GUESTS_CREATE: "guests.create",
  GUESTS_UPDATE: "guests.update",
  GUESTS_DELETE: "guests.delete",
  GUESTS_CHANGE_STATUS: "guests.change_status",
  GUESTS_REGISTRATION_MANAGE: "guests.registration.manage",

  CRON_JOBS_VIEW: "cron_jobs.view",

  SETTINGS_VIEW: "settings.view",
  SETTINGS_MAINTENANCE: "settings.maintenance",
  SETTINGS_UPDATE_CREDENTIALS: "settings.update_credentials",

  RBAC_MANAGE: "rbac.manage",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export type PermissionDefinition = {
  key: PermissionKey;
  feature: PermissionFeature;
  label: string;
  access: PermissionAccess;
};

/**
 * Human labels + access for UI / seeds.
 * Must stay 1:1 with `PERMISSIONS` and `docs/[11] RBAC/[02]`.
 */
export const PERMISSION_DEFINITIONS: readonly PermissionDefinition[] = [
  {
    key: PERMISSIONS.DASHBOARD_VIEW,
    feature: "dashboard",
    label: "View dashboard",
    access: PERMISSION_ACCESS.READ,
  },

  {
    key: PERMISSIONS.USERS_VIEW,
    feature: "users",
    label: "View users",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.USERS_CREATE,
    feature: "users",
    label: "Create staff user",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.USERS_UPDATE,
    feature: "users",
    label: "Edit user",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.STUDENTS_VIEW,
    feature: "students",
    label: "View students",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.STUDENTS_CREATE,
    feature: "students",
    label: "Create student",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.STUDENTS_UPDATE,
    feature: "students",
    label: "Edit student",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.STUDENTS_CHANGE_STATUS,
    feature: "students",
    label: "Activate / inactivate student",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.RELATIONSHIPS_VIEW,
    feature: "relationships",
    label: "View relationships",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.RELATIONSHIPS_CREATE,
    feature: "relationships",
    label: "Create relationship",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.RELATIONSHIPS_UPDATE,
    feature: "relationships",
    label: "Edit relationship",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.SUBJECTS_VIEW,
    feature: "subjects",
    label: "View subjects",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.SUBJECTS_CREATE,
    feature: "subjects",
    label: "Create subject",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.SUBJECTS_UPDATE,
    feature: "subjects",
    label: "Edit subject",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.SUBJECTS_DELETE,
    feature: "subjects",
    label: "Delete subject",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.INSTRUCTORS_VIEW,
    feature: "instructors",
    label: "View instructors",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.INSTRUCTORS_CREATE,
    feature: "instructors",
    label: "Add instructors",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.INSTRUCTORS_DELETE,
    feature: "instructors",
    label: "Remove instructors",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.INSTRUCTORS_CAPABILITIES_UPDATE,
    feature: "instructors",
    label: "Update instructor subject capabilities",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.CLASSES_VIEW,
    feature: "classes",
    label: "View classes",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.CLASSES_CREATE,
    feature: "classes",
    label: "Create class",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.CLASSES_UPDATE,
    feature: "classes",
    label: "Edit class",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.CLASSES_CHANGE_STATUS,
    feature: "classes",
    label: "Change class status",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.CLASSES_ASSIGN_TEACHER,
    feature: "classes",
    label: "Assign teacher",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.CLASSES_UNASSIGN_TEACHER,
    feature: "classes",
    label: "Unassign teacher",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.CLASSES_ADD_STUDENT,
    feature: "classes",
    label: "Add student to class",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.CLASSES_REMOVE_STUDENT,
    feature: "classes",
    label: "Remove student from class",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.CLASSES_VIEW_ANALYTICS,
    feature: "classes",
    label: "View class analytics",
    access: PERMISSION_ACCESS.READ,
  },

  {
    key: PERMISSIONS.SESSIONS_VIEW,
    feature: "sessions",
    label: "View sessions",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.SESSIONS_CREATE,
    feature: "sessions",
    label: "Create session",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.SESSIONS_UPDATE,
    feature: "sessions",
    label: "Edit session",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.SESSIONS_DELETE,
    feature: "sessions",
    label: "Delete session",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.SESSIONS_UPDATE_SETTINGS,
    feature: "sessions",
    label: "Update session settings",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.ATTENDANCE_VIEW,
    feature: "attendance",
    label: "View attendance",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.ATTENDANCE_UPDATE,
    feature: "attendance",
    label: "Update attendance",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.TASKS_VIEW,
    feature: "tasks",
    label: "View tasks",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.TASKS_CREATE,
    feature: "tasks",
    label: "Create task",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.TASKS_UPDATE_STUDENT,
    feature: "tasks",
    label: "Edit student task",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.FINAL_EXAMS_VIEW,
    feature: "final_exams",
    label: "View final exam",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.FINAL_EXAMS_CREATE,
    feature: "final_exams",
    label: "Create final exam",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.FINAL_EXAMS_UPDATE,
    feature: "final_exams",
    label: "Edit final exam",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.FINAL_EXAMS_UPDATE_STUDENT,
    feature: "final_exams",
    label: "Edit student final-exam grade",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.GRADES_VIEW,
    feature: "grades",
    label: "View class grades",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.GRADES_COMPUTE,
    feature: "grades",
    label: "Compute student grade",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.GRADES_COMPUTE_ALL,
    feature: "grades",
    label: "Compute all class grades",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.GRADES_COMPUTE_CUSTOM,
    feature: "grades",
    label: "Compute grade with custom weights",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.GRADES_DELETE,
    feature: "grades",
    label: "Delete computed grade",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.GRADES_EXPORT_CERTIFICATES,
    feature: "grades",
    label: "Export grade certificates",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.GRADES_EXPORT_FAST_CERTIFICATE,
    feature: "grades",
    label: "Export fast certificate",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.GRADES_PREVIEW_CERTIFICATE,
    feature: "grades",
    label: "Preview grade certificate",
    access: PERMISSION_ACCESS.READ,
  },

  {
    key: PERMISSIONS.SEMESTERS_VIEW,
    feature: "semesters",
    label: "View semesters",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.SEMESTERS_CREATE,
    feature: "semesters",
    label: "Create semester",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.SEMESTERS_UPDATE,
    feature: "semesters",
    label: "Edit semester",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.SEMESTERS_ADD_STUDENT,
    feature: "semesters",
    label: "Add student to semester",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.SEMESTERS_CONNECT_CLASS,
    feature: "semesters",
    label: "Connect class to semester",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.EQUIPMENT_VIEW,
    feature: "equipment",
    label: "View equipment",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.EQUIPMENT_CREATE,
    feature: "equipment",
    label: "Create equipment",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.EQUIPMENT_UPDATE,
    feature: "equipment",
    label: "Edit equipment",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.EQUIPMENT_VIEW_BORROWS,
    feature: "equipment",
    label: "View borrow history",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.EQUIPMENT_BORROW_CREATE,
    feature: "equipment",
    label: "Create borrow",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.EQUIPMENT_BORROW_UPDATE,
    feature: "equipment",
    label: "Edit borrow",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.EQUIPMENT_BORROW_RETURN,
    feature: "equipment",
    label: "Mark borrow returned / not returned",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.GALLERY_VIEW,
    feature: "gallery",
    label: "View gallery images",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.GALLERY_CREATE,
    feature: "gallery",
    label: "Create gallery image",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.GALLERY_UPDATE,
    feature: "gallery",
    label: "Edit gallery image",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.GALLERY_DELETE,
    feature: "gallery",
    label: "Delete gallery image",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.PROJECTS_VIEW,
    feature: "projects",
    label: "View public projects",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.PROJECTS_CREATE,
    feature: "projects",
    label: "Create public project",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.PROJECTS_UPDATE,
    feature: "projects",
    label: "Edit public project",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.PROJECTS_DELETE,
    feature: "projects",
    label: "Delete public project",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.SCHEDULE_VIEW,
    feature: "schedule",
    label: "View schedule",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.SCHEDULE_CREATE,
    feature: "schedule",
    label: "Create schedule slot",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.SCHEDULE_UPDATE,
    feature: "schedule",
    label: "Edit schedule slot",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.SCHEDULE_DELETE,
    feature: "schedule",
    label: "Delete schedule slot",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW,
    feature: "instructor_schedules",
    label: "View instructor schedules",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.INSTRUCTOR_SCHEDULES_DETAILS_VIEW,
    feature: "instructor_schedules",
    label: "View instructor schedule slot details",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.INSTRUCTOR_SCHEDULES_CREATE,
    feature: "instructor_schedules",
    label: "Create instructor schedule slot",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.INSTRUCTOR_SCHEDULES_UPDATE,
    feature: "instructor_schedules",
    label: "Edit instructor schedule slot",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.INSTRUCTOR_SCHEDULES_DELETE,
    feature: "instructor_schedules",
    label: "Delete instructor schedule slot",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.WORKSHOPS_VIEW,
    feature: "workshops",
    label: "View workshops",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.WORKSHOPS_CREATE,
    feature: "workshops",
    label: "Create workshop",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_UPDATE,
    feature: "workshops",
    label: "Edit workshop",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_DELETE,
    feature: "workshops",
    label: "Delete workshop",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_CHANGE_STATUS,
    feature: "workshops",
    label: "Change workshop status",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_INSTRUCTORS_CREATE,
    feature: "workshops",
    label: "Add workshop instructor",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_INSTRUCTORS_UPDATE,
    feature: "workshops",
    label: "Edit workshop instructor",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_INSTRUCTORS_DELETE,
    feature: "workshops",
    label: "Remove workshop instructor",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_DOCUMENTS_CREATE,
    feature: "workshops",
    label: "Upload workshop document",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_DOCUMENTS_UPDATE,
    feature: "workshops",
    label: "Rename workshop document",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_DOCUMENTS_DELETE,
    feature: "workshops",
    label: "Delete workshop document",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_SESSIONS_CREATE,
    feature: "workshops",
    label: "Create workshop session",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_SESSIONS_UPDATE,
    feature: "workshops",
    label: "Edit workshop session",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_SESSIONS_DELETE,
    feature: "workshops",
    label: "Delete workshop session",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_PAYMENTS_VIEW,
    feature: "workshops",
    label: "View workshop payments",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.WORKSHOPS_PAYMENTS_CREATE,
    feature: "workshops",
    label: "Create workshop payment",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_PAYMENTS_UPDATE,
    feature: "workshops",
    label: "Edit workshop payment",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.WORKSHOPS_PAYMENTS_DELETE,
    feature: "workshops",
    label: "Delete workshop payment",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.NOTIFICATIONS_VIEW,
    feature: "notifications",
    label: "View notifications",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.NOTIFICATIONS_CREATE,
    feature: "notifications",
    label: "Create notification",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.NOTIFICATIONS_UPDATE,
    feature: "notifications",
    label: "Edit notification",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.NOTIFICATIONS_MARK_READ,
    feature: "notifications",
    label: "Mark notification(s) read",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.NOTIFICATIONS_DELETE,
    feature: "notifications",
    label: "Delete notification",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.EMAILING_VIEW,
    feature: "emailing",
    label: "View emailing and sent mail",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.EMAILING_SEND,
    feature: "emailing",
    label: "Compose and send email",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.EMAILING_RESEND,
    feature: "emailing",
    label: "Resend email",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.ACCOUNTING_VIEW,
    feature: "accounting",
    label: "View accounting page",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_VIEW,
    feature: "accounting",
    label: "View income statement",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.ACCOUNTING_INCOME_STATEMENT_ANALYTICS_VIEW,
    feature: "accounting",
    label: "View income statement analytics",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.ACCOUNTING_TRANSACTIONS_CREATE,
    feature: "accounting",
    label: "Record external transaction",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_TRANSACTIONS_UPDATE,
    feature: "accounting",
    label: "Edit external transaction",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_TRANSACTIONS_DELETE,
    feature: "accounting",
    label: "Delete external transaction",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE,
    feature: "accounting",
    label: "Create payment phase",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_UPDATE,
    feature: "accounting",
    label: "Edit payment phase",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CANCEL,
    feature: "accounting",
    label: "Cancel payment phase",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_SPP_TRANSFER,
    feature: "accounting",
    label: "Transfer student payment phase",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_SPP_DELETE,
    feature: "accounting",
    label: "Delete student payment phase",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_PAYMENTS_CREATE,
    feature: "accounting",
    label: "Record student payment",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_PAYMENTS_UPDATE,
    feature: "accounting",
    label: "Edit student payment",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_PAYMENTS_DELETE,
    feature: "accounting",
    label: "Delete student payment",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_ADJUSTMENTS_CREATE,
    feature: "accounting",
    label: "Create financial adjustment",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE,
    feature: "accounting",
    label: "Edit financial adjustment",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE,
    feature: "accounting",
    label: "Delete financial adjustment",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.REPORTS_VIEW,
    feature: "reports",
    label: "View reports",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.REPORTS_EXPORT,
    feature: "reports",
    label: "Export report CSV",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.REPORTS_PRINT,
    feature: "reports",
    label: "Print report",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.ANALYTICS_VIEW,
    feature: "analytics",
    label: "View analytics",
    access: PERMISSION_ACCESS.READ,
  },

  {
    key: PERMISSIONS.BACKUP_VIEW,
    feature: "backup",
    label: "View backup history",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.BACKUP_EXPORT_TABLE,
    feature: "backup",
    label: "Export table backup",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.BACKUP_EXPORT_FULL,
    feature: "backup",
    label: "Export full backup",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.BACKUP_DOWNLOAD,
    feature: "backup",
    label: "Download backup file",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.LOGS_VIEW,
    feature: "logs",
    label: "View audit logs",
    access: PERMISSION_ACCESS.READ,
  },

  {
    key: PERMISSIONS.CLOUDFLARE_AI_USAGE_VIEW,
    feature: "cloudflare_ai_usage",
    label: "View Cloudflare AI usage logs",
    access: PERMISSION_ACCESS.READ,
  },

  {
    key: PERMISSIONS.REGISTRATIONS_VIEW,
    feature: "registrations",
    label: "View registration applications",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.REGISTRATIONS_UPDATE_STATUS,
    feature: "registrations",
    label: "Update registration application status and notes",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.GUESTS_VIEW,
    feature: "guests",
    label: "View guests and status history",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.GUESTS_CREATE,
    feature: "guests",
    label: "Create guests",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.GUESTS_UPDATE,
    feature: "guests",
    label: "Update guest intake fields and notes",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.GUESTS_DELETE,
    feature: "guests",
    label: "Hard-delete guests",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.GUESTS_CHANGE_STATUS,
    feature: "guests",
    label: "Set guest status",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.GUESTS_REGISTRATION_MANAGE,
    feature: "guests",
    label: "Open registration; stop invite; cancel or hard-delete application; staff-fill",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.CRON_JOBS_VIEW,
    feature: "cron_jobs",
    label: "View cron jobs",
    access: PERMISSION_ACCESS.READ,
  },

  {
    key: PERMISSIONS.SETTINGS_VIEW,
    feature: "settings",
    label: "View settings",
    access: PERMISSION_ACCESS.READ,
  },
  {
    key: PERMISSIONS.SETTINGS_MAINTENANCE,
    feature: "settings",
    label: "Toggle maintenance mode",
    access: PERMISSION_ACCESS.WRITE,
  },
  {
    key: PERMISSIONS.SETTINGS_UPDATE_CREDENTIALS,
    feature: "settings",
    label: "Update own email or password",
    access: PERMISSION_ACCESS.WRITE,
  },

  {
    key: PERMISSIONS.RBAC_MANAGE,
    feature: "rbac",
    label: "Manage role permissions",
    access: PERMISSION_ACCESS.WRITE,
  },
] as const;

export const PERMISSION_KEYS = Object.values(PERMISSIONS) as PermissionKey[];

export const PERMISSION_KEY_SET: ReadonlySet<PermissionKey> = new Set(
  PERMISSION_KEYS
);

export const PERMISSION_LABELS: Record<PermissionKey, string> =
  Object.fromEntries(
    PERMISSION_DEFINITIONS.map((definition) => [
      definition.key,
      definition.label,
    ])
  ) as Record<PermissionKey, string>;

export const PERMISSION_ACCESS_BY_KEY: Record<PermissionKey, PermissionAccess> =
  Object.fromEntries(
    PERMISSION_DEFINITIONS.map((definition) => [
      definition.key,
      definition.access,
    ])
  ) as Record<PermissionKey, PermissionAccess>;

/**
 * Agreed key pattern: `{feature}.{action}` or `{feature}.{resource}.{action}`
 * with snake_case segments (one or more dotted action segments after feature).
 */
export const PERMISSION_KEY_PATTERN =
  /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;

export function isPermissionKey(value: string): value is PermissionKey {
  return PERMISSION_KEY_SET.has(value as PermissionKey);
}

export function getPermissionDefinition(
  key: PermissionKey
): PermissionDefinition {
  const definition = PERMISSION_DEFINITIONS.find((item) => item.key === key);
  if (!definition) {
    throw new Error(`Missing permission definition for key: ${key}`);
  }
  return definition;
}

export function getPermissionsByFeature(
  feature: PermissionFeature
): PermissionDefinition[] {
  return PERMISSION_DEFINITIONS.filter(
    (definition) => definition.feature === feature
  );
}

export function getPermissionKeysByFeature(
  feature: PermissionFeature
): PermissionKey[] {
  return getPermissionsByFeature(feature).map((definition) => definition.key);
}
