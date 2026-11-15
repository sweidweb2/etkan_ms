import { CLASS_CATEGORY_STATUS_LABELS } from "@/lib/constants/class-category-status";
import { EXERCISE_STATUS_LABELS } from "@/lib/constants/exercise-status";
import { GUEST_STATUS_LABELS } from "@/lib/constants/guest";
import { BLOG_STATUS_LABELS } from "@/lib/constants/manager-blog";
import { MANAGER_CLASS_STATUS_LABELS } from "@/lib/constants/manager-class-display";
import {
  PAYMENT_PHASE_STATUS_LABELS,
  SPP_STATUS_LABELS,
} from "@/lib/constants/manager-payment-phase-display";
import { MANAGER_STUDENT_STATUS_LABELS } from "@/lib/constants/manager-student-display";
import { MANAGER_STUDENT_SEMESTER_STATUS_LABELS } from "@/lib/constants/manager-student-semester-display";
import { MANAGER_STUDENT_TASK_STATUS_LABELS } from "@/lib/constants/manager-student-task-display";
import {
  MANAGER_WORKSHOP_STATUS_LABELS,
  WORKSHOP_INSTRUCTOR_ROLE_LABELS,
  WORKSHOP_OFFERING_TYPE_LABELS,
  WORKSHOP_PAYMENT_METHOD_LABELS,
  WORKSHOP_PAYMENT_TYPE_LABELS,
  WORKSHOP_SESSION_STATUS_LABELS,
  WORKSHOP_WAGE_TYPE_LABELS,
} from "@/lib/constants/manager-workshop-display";
import { SESSION_ATTENDEE_STATUS_LABELS } from "@/lib/constants/manager-attendee-status";
import { REGISTRATION_APPLICATION_STATUS_LABELS } from "@/lib/constants/public-registration";
import { TEAM_STATUS_LABELS } from "@/lib/constants/team";
import type { BackupTableName } from "@/lib/constants/backup-tables";
import {
  FINANCIAL_ADJUSTMENT_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/manager/accounting/constants";
import type {
  BusinessCsvColumn,
  BusinessCsvTableConfig,
} from "@/lib/export/backup-business-csv-types";

function raw(
  column: string,
  header: string,
  labels?: Readonly<Record<string, string>>
): BusinessCsvColumn {
  return labels
    ? { kind: "raw", column, header, labels }
    : { kind: "raw", column, header };
}

function fk(
  column: string,
  header: string,
  from: BackupTableName,
  labelColumn: string,
  idColumn?: string
): BusinessCsvColumn {
  return idColumn
    ? { kind: "fk", column, header, from, labelColumn, idColumn }
    : { kind: "fk", column, header, from, labelColumn };
}

function via(
  column: string,
  header: string,
  through: BackupTableName,
  throughColumn: string,
  from?: BackupTableName,
  labelColumn?: string
): BusinessCsvColumn {
  return {
    kind: "via",
    column,
    header,
    through,
    throughColumn,
    from,
    labelColumn,
  };
}

function viaParts(
  column: string,
  through: BackupTableName,
  parts: readonly {
    header: string;
    throughColumn: string;
    from: BackupTableName;
    labelColumn: string;
  }[]
): BusinessCsvColumn {
  return { kind: "via_parts", column, through, parts };
}

const sppParts = viaParts("student_payment_phase_id", "student_payment_phases", [
  {
    header: "Student",
    throughColumn: "student_id",
    from: "profiles",
    labelColumn: "full_name",
  },
  {
    header: "Payment phase",
    throughColumn: "payment_phase_id",
    from: "payment_phases",
    labelColumn: "name",
  },
]);

export const BACKUP_BUSINESS_CSV_CONFIG: Record<
  BackupTableName,
  BusinessCsvTableConfig
> = {
  app_settings: {
    columns: [raw("maintenance_mode", "Maintenance mode")],
  },
  permissions: {
    columns: [
      raw("key", "Key"),
      raw("label", "Label"),
      raw("feature_group", "Feature group"),
      raw("access", "Access"),
    ],
  },
  role_permissions: {
    columns: [
      raw("role", "Role"),
      fk("permission_key", "Permission", "permissions", "label", "key"),
    ],
  },
  profiles: {
    columns: [
      raw("full_name", "Full name"),
      raw("role", "Role"),
      raw("is_instructor", "Is instructor"),
    ],
  },
  student_profiles: {
    columns: [
      raw("full_name", "Full name"),
      fk("user_id", "User", "profiles", "full_name"),
      raw("phone", "Phone"),
      raw("birth_date", "Birth date"),
      raw("status", "Status", MANAGER_STUDENT_STATUS_LABELS),
    ],
  },
  semesters: {
    columns: [raw("name", "Name"), raw("semester_code", "Semester code")],
  },
  student_semester: {
    columns: [
      fk("student_profile_id", "Student", "student_profiles", "full_name"),
      fk("semester_id", "Semester", "semesters", "name"),
      raw("status", "Status", MANAGER_STUDENT_SEMESTER_STATUS_LABELS),
    ],
  },
  stages: {
    columns: [
      raw("name", "Name"),
      raw("level", "Level"),
      raw("period", "Period"),
      raw("sort_order", "Sort order"),
    ],
  },
  subjects: {
    columns: [
      raw("name", "Name"),
      fk("stage_id", "Stage", "stages", "name"),
      raw("nb_sessions", "Sessions"),
      raw("sort_order", "Sort order"),
      raw("handout_link", "Handout link"),
      raw("reference_link", "Reference link"),
      raw("syllabus_link", "Syllabus link"),
    ],
  },
  categories: {
    columns: [
      raw("name", "Name"),
      fk("parent_id", "Parent category", "categories", "name"),
    ],
  },
  exercises: {
    columns: [
      raw("title", "Title"),
      raw("level", "Level"),
      raw("status", "Status", EXERCISE_STATUS_LABELS),
      raw("categories", "Categories"),
    ],
  },
  category_exercises: {
    columns: [
      fk("category_id", "Category", "categories", "name"),
      fk("exercise_id", "Exercise", "exercises", "title"),
    ],
  },
  subject_categories: {
    columns: [
      fk("subject_id", "Subject", "subjects", "name"),
      fk("category_id", "Category", "categories", "name"),
    ],
  },
  subject_exercises: {
    columns: [
      fk("subject_id", "Subject", "subjects", "name"),
      fk("exercise_id", "Exercise", "exercises", "title"),
    ],
  },
  instructor_subject_capability: {
    columns: [
      fk("user_id", "Instructor", "profiles", "full_name"),
      fk("subject_id", "Subject", "subjects", "name"),
    ],
  },
  classes: {
    columns: [
      raw("name", "Name"),
      fk("semester_id", "Semester", "semesters", "name"),
      fk("subject_id", "Subject", "subjects", "name"),
      raw("status", "Status", MANAGER_CLASS_STATUS_LABELS),
    ],
  },
  class_categories: {
    columns: [
      fk("class_id", "Class", "classes", "name"),
      fk("category_id", "Category", "categories", "name"),
      raw("status", "Status", CLASS_CATEGORY_STATUS_LABELS),
    ],
  },
  class_teacher: {
    columns: [
      fk("class_id", "Class", "classes", "name"),
      fk("teacher_id", "Teacher", "profiles", "full_name"),
      fk("assigned_by", "Assigned by", "profiles", "full_name"),
      raw("assigned_at", "Assigned at"),
    ],
  },
  student_class: {
    columns: [
      fk("class_id", "Class", "classes", "name"),
      fk("user_id", "Student", "profiles", "full_name"),
      raw("is_team_leader", "Team leader"),
      raw("joined_at", "Joined at"),
    ],
  },
  sessions: {
    columns: [
      fk("class_id", "Class", "classes", "name"),
      raw("nb_order", "Order"),
      raw("topic", "Topic"),
      raw("starts_at", "Starts at"),
      raw("ends_at", "Ends at"),
      raw("group_grade_level", "Group grade level"),
      raw("session_report", "Session report"),
    ],
  },
  class_session_skips: {
    columns: [
      fk("class_id", "Class", "classes", "name"),
      raw("skip_date", "Skip date"),
      raw("reason", "Reason"),
      fk("created_by", "Created by", "profiles", "full_name"),
    ],
  },
  weekly_schedule_slots: {
    columns: [
      raw("name", "Name"),
      raw("type", "Type"),
      raw("slot_date", "Date"),
      raw("start_time", "Start time"),
      raw("end_time", "End time"),
      raw("color", "Color"),
    ],
  },
  workshops: {
    columns: [
      raw("name", "Name"),
      raw("subject", "Subject"),
      raw("type", "Type", WORKSHOP_OFFERING_TYPE_LABELS),
      raw("status", "Status", MANAGER_WORKSHOP_STATUS_LABELS),
      raw("price", "Price"),
      raw("phone", "Phone"),
      raw("start_date", "Start date"),
      raw("end_date", "End date"),
      raw("nb_participants", "Participants"),
      raw("number_of_sessions", "Sessions"),
      raw("delivery_place", "Delivery place"),
      raw("target_audience", "Target audience"),
      raw("proposal_notes", "Proposal notes"),
      fk("created_by", "Created by", "profiles", "full_name"),
    ],
  },
  instructor_schedule_slots: {
    columns: [
      raw("name", "Name"),
      raw("entity_type", "Entity type"),
      raw("type", "Type"),
      raw("day_of_week", "Day of week"),
      raw("slot_date", "Date"),
      raw("start_time", "Start time"),
      raw("end_time", "End time"),
      fk("source_workshop_id", "Source workshop", "workshops", "name"),
    ],
  },
  workshop_instructors: {
    columns: [
      fk("workshop_id", "Workshop", "workshops", "name"),
      fk("user_id", "Instructor", "profiles", "full_name"),
      raw("role", "Role", WORKSHOP_INSTRUCTOR_ROLE_LABELS),
      raw("wage_type", "Wage type", WORKSHOP_WAGE_TYPE_LABELS),
      raw("wage_amount", "Wage amount"),
      raw("notes", "Notes"),
    ],
  },
  workshop_documents: {
    columns: [
      fk("workshop_id", "Workshop", "workshops", "name"),
      raw("name", "Document name"),
      fk("uploaded_by", "Uploaded by", "profiles", "full_name"),
      raw("created_at", "Uploaded at"),
    ],
  },
  workshop_payments: {
    columns: [
      fk("workshop_id", "Workshop", "workshops", "name"),
      raw("amount", "Amount"),
      raw("type", "Type", WORKSHOP_PAYMENT_TYPE_LABELS),
      raw("payment_date", "Payment date"),
      raw("payment_method", "Payment method", WORKSHOP_PAYMENT_METHOD_LABELS),
      raw("notes", "Notes"),
      fk("transaction_id", "Transaction", "transactions", "description"),
      fk("created_by", "Created by", "profiles", "full_name"),
    ],
  },
  workshop_sessions: {
    columns: [
      fk("workshop_id", "Workshop", "workshops", "name"),
      raw("nb_order", "Order"),
      raw("topic", "Topic"),
      raw("session_date", "Session date"),
      raw("start_time", "Start time"),
      raw("end_time", "End time"),
      raw("nb_hours", "Hours"),
      raw("status", "Status", WORKSHOP_SESSION_STATUS_LABELS),
      raw("session_eval", "Session eval"),
      raw("participants_eval", "Participants eval"),
      raw("notes", "Notes"),
      raw("suggestions", "Suggestions"),
    ],
  },
  attendee: {
    columns: [
      via(
        "session_id",
        "Class",
        "sessions",
        "class_id",
        "classes",
        "name"
      ),
      fk("session_id", "Session", "sessions", "topic"),
      fk("student_id", "Student", "profiles", "full_name"),
      raw("status", "Status", SESSION_ATTENDEE_STATUS_LABELS),
      fk("updated_by", "Updated by", "profiles", "full_name"),
    ],
  },
  subject_tasks: {
    columns: [
      fk("subject_id", "Subject", "subjects", "name"),
      raw("title", "Title"),
      raw("description", "Description"),
      raw("period", "Period"),
      raw("max_grade", "Max grade"),
      raw("is_yes_no", "Yes/no"),
      raw("sort_order", "Sort order"),
    ],
  },
  class_tasks: {
    columns: [
      fk("class_id", "Class", "classes", "name"),
      raw("title", "Title"),
      raw("description", "Description"),
      raw("period", "Period"),
      raw("due_date", "Due date"),
      raw("max_grade", "Max grade"),
      raw("is_yes_no", "Yes/no"),
      raw("started", "Started"),
      raw("started_at", "Started at"),
      raw("sort_order", "Sort order"),
      fk("source_subject_task_id", "Source subject task", "subject_tasks", "title"),
      fk("created_by", "Created by", "profiles", "full_name"),
      fk("updated_by", "Updated by", "profiles", "full_name"),
    ],
  },
  student_tasks: {
    columns: [
      fk("student_id", "Student", "profiles", "full_name"),
      fk("task_id", "Task", "class_tasks", "title"),
      raw("status", "Status", MANAGER_STUDENT_TASK_STATUS_LABELS),
      raw("grade", "Grade"),
      raw("notes", "Notes"),
      raw("student_report", "Student report"),
      raw("submitted_at", "Submitted at"),
      raw("graded_at", "Graded at"),
    ],
  },
  student_task_uploads: {
    columns: [
      viaParts("student_task_id", "student_tasks", [
        {
          header: "Student",
          throughColumn: "student_id",
          from: "profiles",
          labelColumn: "full_name",
        },
        {
          header: "Task",
          throughColumn: "task_id",
          from: "class_tasks",
          labelColumn: "title",
        },
      ]),
      raw("file_name", "File name"),
      fk("uploaded_by", "Uploaded by", "profiles", "full_name"),
      raw("created_at", "Uploaded at"),
    ],
  },
  task_attachments: {
    columns: [
      raw("entity", "Entity"),
      raw("entity_id", "Entity id"),
      raw("file_name", "File name"),
      fk("uploaded_by", "Uploaded by", "profiles", "full_name"),
      raw("created_at", "Uploaded at"),
    ],
  },
  task_attachment_clone_jobs: {
    columns: [
      fk("class_task_id", "Class task", "class_tasks", "title"),
      fk("source_subject_task_id", "Source subject task", "subject_tasks", "title"),
      raw("status", "Status"),
      raw("error_message", "Error"),
      raw("created_at", "Created at"),
      raw("completed_at", "Completed at"),
    ],
  },
  student_course_grade: {
    columns: [
      fk("class_id", "Class", "classes", "name"),
      fk("user_id", "Student", "profiles", "full_name"),
      raw("type", "Type"),
      raw("task_weight", "Task weight"),
      raw("final_exam_weight", "Final exam weight"),
      raw("task_total_grade", "Task total grade"),
      raw("final_exam_grade", "Final exam grade"),
    ],
  },
  final_exam: {
    columns: [
      fk("class_id", "Class", "classes", "name"),
      raw("title", "Title"),
      raw("description", "Description"),
      raw("due_date", "Due date"),
      raw("max_grade", "Max grade"),
    ],
  },
  student_finalexam_grade: {
    columns: [
      fk("final_exam_id", "Final exam", "final_exam", "title"),
      fk("student_id", "Student", "profiles", "full_name"),
      raw("status", "Status"),
      raw("grade", "Grade"),
      raw("notes", "Notes"),
      raw("submitted_at", "Submitted at"),
      raw("graded_at", "Graded at"),
    ],
  },
  student_takeouts: {
    columns: [
      fk("user_id", "Student", "profiles", "full_name"),
      raw("value", "Value"),
      raw("created_at", "Created at"),
    ],
  },
  payment_phases: {
    columns: [
      raw("name", "Name"),
      fk("semester_id", "Semester", "semesters", "name"),
      raw("semester_code", "Semester code"),
      raw("amount", "Amount"),
      raw("upfront_amount", "Upfront amount"),
      raw("duration_months", "Duration (months)"),
      raw("start_date", "Start date"),
      raw("end_date", "End date"),
      raw("status", "Status", PAYMENT_PHASE_STATUS_LABELS),
    ],
  },
  student_payment_phases: {
    columns: [
      fk("student_id", "Student", "profiles", "full_name"),
      fk("payment_phase_id", "Payment phase", "payment_phases", "name"),
      raw("original_amount", "Original amount"),
      raw("adjustment_amount", "Adjustment amount"),
      raw("final_amount_due", "Final amount due"),
      raw("total_paid", "Total paid"),
      raw("remaining_amount", "Remaining amount"),
      raw("status", "Status", SPP_STATUS_LABELS),
      raw("assigned_at", "Assigned at"),
    ],
  },
  semester_drop_requests: {
    columns: [
      fk("student_id", "Student", "profiles", "full_name"),
      fk("semester_id", "Semester", "semesters", "name"),
      fk("class_id", "Class", "classes", "name"),
      fk("payment_phase_id", "Payment phase", "payment_phases", "name"),
      viaParts("spp_id", "student_payment_phases", [
        {
          header: "SPP student",
          throughColumn: "student_id",
          from: "profiles",
          labelColumn: "full_name",
        },
        {
          header: "SPP phase",
          throughColumn: "payment_phase_id",
          from: "payment_phases",
          labelColumn: "name",
        },
      ]),
      raw("status", "Status"),
      raw("required_percent", "Required percent"),
      raw("required_amount", "Required amount"),
      raw("phase_amount_snapshot", "Phase amount snapshot"),
      raw("requested_at", "Requested at"),
      raw("deadline_at", "Deadline at"),
      raw("completed_at", "Completed at"),
      raw("refund_owed", "Refund owed"),
      raw("refund_status", "Refund status"),
      raw("refunded_amount", "Refunded amount"),
      fk("requested_by", "Requested by", "profiles", "full_name"),
      raw("notes", "Notes"),
    ],
  },
  student_payments: {
    columns: [
      sppParts,
      raw("amount", "Amount"),
      raw("type", "Type", TRANSACTION_TYPE_LABELS),
      raw("payment_date", "Payment date"),
      raw("payment_method", "Payment method", PAYMENT_METHOD_LABELS),
      raw("receipt_number", "Receipt number"),
      raw("received_by", "Received by"),
      raw("received_by_management", "Received by management"),
      raw("notes", "Notes"),
      via(
        "semester_drop_request_id",
        "Drop request student",
        "semester_drop_requests",
        "student_id",
        "profiles",
        "full_name"
      ),
    ],
  },
  student_payment_schedules: {
    columns: [
      sppParts,
      raw("label", "Label"),
      raw("amount", "Amount"),
      raw("due_date", "Due date"),
      raw("status", "Status"),
      raw("notes", "Notes"),
      fk("created_by", "Created by", "profiles", "full_name"),
    ],
  },
  student_payment_phase_clearances: {
    columns: [
      sppParts,
      raw("duration_days", "Duration (days)"),
      raw("notes", "Notes"),
      fk("created_by", "Created by", "profiles", "full_name"),
      fk("updated_by", "Updated by", "profiles", "full_name"),
    ],
  },
  student_financial_adjustments: {
    columns: [
      sppParts,
      raw("type", "Type", FINANCIAL_ADJUSTMENT_TYPE_LABELS),
      raw("value_type", "Value type", FINANCIAL_ADJUSTMENT_VALUE_TYPE_LABELS),
      raw("value", "Value"),
      raw("reason", "Reason"),
      raw("effective_date", "Effective date"),
    ],
  },
  student_financial_form_invites: {
    columns: [
      sppParts,
      via("form_id", "Form name", "student_financial_forms", "full_name"),
      fk("created_by", "Created by", "profiles", "full_name"),
      raw("used_at", "Used at"),
      raw("created_at", "Created at"),
    ],
  },
  student_financial_forms: {
    columns: [
      sppParts,
      raw("full_name", "Full name"),
      raw("date_of_birth", "Date of birth"),
      raw("phone", "Phone"),
      raw("parent_phone", "Parent phone"),
      raw("school_or_university", "School or university"),
      raw("current_gpa", "Current GPA"),
      raw("student_works", "Student works"),
      raw("student_monthly_income", "Student monthly income"),
      raw("both_parents_work", "Both parents work"),
      raw("working_family_members", "Working family members"),
      raw("total_family_income", "Total family income"),
      raw("family_members", "Family members"),
      raw("has_deceased_parent", "Has deceased parent"),
      raw("family_chronic_disease", "Family chronic disease"),
      raw("family_hardship", "Family hardship"),
      raw("received_financial_aid_before", "Received aid before"),
      raw("children_currently_learning", "Children currently learning"),
      raw("certificates", "Certificates"),
      raw("affordable_monthly_payment", "Affordable monthly payment"),
      raw("agreed_to_rules", "Agreed to rules"),
    ],
  },
  email_sent: {
    columns: [
      raw("title", "Title"),
      raw("reference_code", "Reference code"),
      raw("reference_number", "Reference number"),
      raw("locale", "Locale"),
      raw("year", "Year"),
      raw("template_id", "Template"),
      fk("created_by", "Created by", "profiles", "full_name"),
      raw("created_at", "Created at"),
    ],
  },
  email_users: {
    columns: [
      fk("email_sent_id", "Email", "email_sent", "title"),
      fk("student_id", "Student", "profiles", "full_name"),
      raw("email_address", "Email address"),
      raw("delivery_status", "Delivery status"),
      raw("sent_at", "Sent at"),
      raw("opened_at", "Opened at"),
    ],
  },
  guests: {
    columns: [
      raw("full_name", "Full name"),
      raw("phone", "Phone"),
      raw("age", "Age"),
      raw("status", "Status", GUEST_STATUS_LABELS),
      raw("education_level", "Education level"),
      raw("school_or_university", "School or university"),
      raw("interested_service", "Interested service"),
      raw("referred_from", "Referred from"),
      raw("referred_from_other", "Referred from (other)"),
      raw("notes", "Notes"),
      fk("created_by", "Created by", "profiles", "full_name"),
    ],
  },
  teams: {
    columns: [
      raw("name", "Name"),
      raw("status", "Status", TEAM_STATUS_LABELS),
      raw("expected_start_date", "Expected start date"),
      fk("created_by", "Created by", "profiles", "full_name"),
    ],
  },
  team_guests: {
    columns: [
      fk("team_id", "Team", "teams", "name"),
      fk("guest_id", "Guest", "guests", "full_name"),
      fk("created_by", "Created by", "profiles", "full_name"),
      raw("created_at", "Added at"),
    ],
  },
  guest_status_events: {
    columns: [
      fk("guest_id", "Guest", "guests", "full_name"),
      raw("status", "Status", GUEST_STATUS_LABELS),
      raw("note", "Note"),
      fk("created_by", "Created by", "profiles", "full_name"),
      raw("created_at", "Created at"),
    ],
  },
  student_registration_applications: {
    columns: [
      raw("full_name", "Full name"),
      raw("email", "Email"),
      raw("phone", "Phone"),
      raw("additional_phone", "Additional phone"),
      raw("status", "Status", REGISTRATION_APPLICATION_STATUS_LABELS),
      raw("preferred_program", "Preferred program"),
      raw("learning_status", "Learning status"),
      raw("learning_goal", "Learning goal"),
      raw("job_status", "Job status"),
      raw("education_level", "Education level"),
      raw("speciality", "Speciality"),
      raw("graduation_year", "Graduation year"),
      raw("gender", "Gender"),
      raw("date_of_birth", "Date of birth"),
      raw("blood_type", "Blood type"),
      raw("city", "City"),
      raw("full_address", "Full address"),
      raw("guardian_name", "Guardian name"),
      raw("guardian_phone", "Guardian phone"),
      raw("has_transportation", "Has transportation"),
      raw("preferred_shifts", "Preferred shifts"),
      raw("available_days", "Available days"),
      raw("weekly_available_hours", "Weekly available hours"),
      raw("skills", "Skills"),
      raw("skills_other", "Skills (other)"),
      raw("referral_source", "Referral source"),
      raw("referral_other", "Referral (other)"),
      raw("organization_name", "Organization"),
      raw("id_document_type", "ID document type"),
      raw("self_learning_notes", "Self-learning notes"),
      raw("notes", "Notes"),
      raw("consent_privacy", "Consent privacy"),
      raw("consent_terms", "Consent terms"),
      fk("guest_id", "Guest", "guests", "full_name"),
      fk("user_id", "User", "profiles", "full_name"),
      raw("created_at", "Created at"),
    ],
  },
  student_registration_documents: {
    columns: [
      via(
        "application_id",
        "Applicant",
        "student_registration_applications",
        "full_name"
      ),
      raw("file_name", "File name"),
      raw("sort_order", "Sort order"),
      raw("created_at", "Uploaded at"),
    ],
  },
  guest_registration_invites: {
    columns: [
      fk("guest_id", "Guest", "guests", "full_name"),
      via(
        "application_id",
        "Applicant",
        "student_registration_applications",
        "full_name"
      ),
      fk("created_by", "Created by", "profiles", "full_name"),
      raw("used_at", "Used at"),
      raw("cancelled_at", "Cancelled at"),
      raw("created_at", "Created at"),
    ],
  },
  gallery_images: {
    columns: [raw("name", "Name"), raw("created_at", "Created at")],
  },
  public_projects: {
    columns: [
      raw("title", "Title"),
      raw("author", "Author"),
      raw("category", "Category"),
      raw("classification", "Classification"),
      raw("body", "Body"),
      raw("href", "Link"),
      raw("created_at", "Created at"),
    ],
  },
  blogs: {
    columns: [
      raw("title", "Title"),
      raw("slug", "Slug"),
      raw("summary", "Summary"),
      raw("categories", "Categories"),
      raw("author_name", "Author"),
      raw("status", "Status", BLOG_STATUS_LABELS),
      raw("is_featured", "Featured"),
      raw("reading_time_minutes", "Reading time (minutes)"),
      raw("published_at", "Published at"),
      raw("meta_title", "Meta title"),
      raw("meta_description", "Meta description"),
    ],
  },
  transactions: {
    columns: [
      raw("type", "Type", TRANSACTION_TYPE_LABELS),
      raw("amount", "Amount"),
      raw("category", "Category"),
      raw("description", "Description"),
      raw("payment_method", "Payment method", PAYMENT_METHOD_LABELS),
      raw("transaction_date", "Transaction date"),
      raw("recorded_by", "Recorded by"),
      raw("notes", "Notes"),
    ],
  },
  notifications: {
    columns: [
      fk("recipient_id", "Recipient", "profiles", "full_name"),
      raw("title", "Title"),
      raw("body", "Body"),
      raw("category", "Category"),
      raw("audience", "Audience"),
      raw("priority", "Priority"),
      raw("is_read", "Read"),
      raw("read_at", "Read at"),
      fk("created_by", "Created by", "profiles", "full_name"),
      raw("created_at", "Created at"),
    ],
  },
  audit_logs: {
    columns: [
      raw("action", "Action"),
      raw("table_name", "Table"),
      raw("severity", "Severity"),
      raw("user_label", "User"),
      fk("user_id", "User (profile)", "profiles", "full_name"),
      raw("created_at", "Created at"),
    ],
  },
  backup_history: {
    columns: [
      raw("file_name", "File name"),
      raw("scope", "Scope"),
      raw("table_name", "Table"),
      raw("row_count", "Row count"),
      raw("table_count", "Table count"),
      raw("created_by_label", "Created by"),
      raw("created_at", "Created at"),
    ],
  },
};

type MissingBusinessCsvTables = Exclude<
  BackupTableName,
  keyof typeof BACKUP_BUSINESS_CSV_CONFIG
>;
const _assertBusinessCsvConfigComplete: MissingBusinessCsvTables extends never
  ? true
  : MissingBusinessCsvTables = true;
void _assertBusinessCsvConfigComplete;

/** Tables that must be loaded to resolve FKs for a business CSV of `tableName`. */
export function getBusinessCsvLookupTables(
  tableName: BackupTableName
): BackupTableName[] {
  const required = new Set<BackupTableName>();

  for (const column of BACKUP_BUSINESS_CSV_CONFIG[tableName].columns) {
    if (column.kind === "fk") {
      required.add(column.from);
      continue;
    }

    if (column.kind === "via") {
      required.add(column.through);
      if (column.from) {
        required.add(column.from);
      }
      continue;
    }

    if (column.kind === "via_parts") {
      required.add(column.through);
      for (const part of column.parts) {
        required.add(part.from);
      }
    }
  }

  required.delete(tableName);
  return [...required].sort();
}
