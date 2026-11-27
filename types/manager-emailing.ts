import type { EmailLocale } from "@/lib/email/templates";
import type { RoleValue } from "@/lib/constants/roles";
import type { FieldErrors } from "@/types/auth";
import type { ManagerUserRow } from "@/types/manager-user";

export type EmailDeliveryStatus = "pending" | "sent" | "failed" | "skipped";

export type EmailingClassOption = {
  id: string;
  name: string;
};

export type ManagerEmailingRecipientsListQuery = {
  page?: number;
  pageSize?: number;
  /** When set, only this role (includes students). */
  role?: RoleValue | null;
  search?: string;
  /** Restrict to these user IDs (e.g. class members). */
  userIds?: string[] | null;
};

export type ManagerEmailingRecipientsListStats = {
  total: number;
  students: number;
};

export type ManagerEmailingRecipientsListData = {
  users: ManagerUserRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  /** Global counts (not filtered by the current query). */
  stats: ManagerEmailingRecipientsListStats;
};

export type SendManagerEmailActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  sentCount?: number;
  skippedCount?: number;
  failedCount?: number;
};

export interface ManagerEmailSentListRow {
  id: string;
  reference_code: string;
  title: string;
  locale: EmailLocale;
  template_id: string;
  template_label: string;
  created_at: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
}

export interface ManagerEmailSentDetail {
  id: string;
  reference_code: string;
  reference_number: number;
  year: number;
  title: string;
  body: string;
  locale: EmailLocale;
  template_id: string;
  template_label: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagerEmailUserRow {
  id: string;
  email_sent_id: string;
  student_id: string | null;
  email_address: string;
  sent_at: string | null;
  delivery_status: EmailDeliveryStatus;
  opened_at: string | null;
  mailtrap_message_id: string | null;
  created_at: string;
}
