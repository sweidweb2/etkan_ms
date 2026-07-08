import type {
  NotificationAudienceValue,
  NotificationCategoryValue,
  NotificationPriorityValue,
} from "@/lib/constants/manager-notification-display";

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
}
