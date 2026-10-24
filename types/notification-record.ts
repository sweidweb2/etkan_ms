/** Raw notifications table row used by repositories and browser Realtime. */
export type NotificationRecord = {
  id: string;
  recipient_id: string | null;
  audience: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  action_href: string | null;
  is_read: boolean;
  read_at: string | null;
  created_by: string | null;
  created_at: string;
  suppress_live_toast: boolean;
};
