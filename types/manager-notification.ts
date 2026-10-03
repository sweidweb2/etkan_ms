import type {
  NotificationAudienceValue,
  NotificationCategoryValue,
  NotificationPriorityValue,
} from "@/lib/constants/manager-notification-display";

import type { FieldErrors } from "@/types/auth";

export interface ManagerNotificationRow {
  id: string;
  recipient_id: string | null;
  audience: NotificationAudienceValue;
  category: NotificationCategoryValue;
  priority: NotificationPriorityValue;
  title: string;
  body: string;
  action_href: string | null;
  is_read: boolean;
  read_at: string | null;
  created_by: string | null;
  created_at: string;
  suppress_live_toast: boolean;
}

export type CreateNotificationActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  notification?: ManagerNotificationRow;
};

export type UpdateNotificationActionState = {
  success?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: FieldErrors;
  notification?: ManagerNotificationRow;
};

export type MarkNotificationReadActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};

export type DeleteNotificationActionState = {
  success?: boolean;
  error?: string;
  message?: string;
};
