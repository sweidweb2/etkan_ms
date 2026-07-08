import {
  NOTIFICATION_PRIORITY_BADGE_CLASSES,
  NOTIFICATION_PRIORITY_LABELS,
  type NotificationPriorityValue,
} from "@/lib/constants/manager-notification-display";
import { cn } from "@/lib/utils";

type NotificationPriorityBadgeProps = {
  priority: NotificationPriorityValue;
  className?: string;
};

export function NotificationPriorityBadge({
  priority,
  className,
}: NotificationPriorityBadgeProps) {
  if (priority !== "high") {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        NOTIFICATION_PRIORITY_BADGE_CLASSES[priority],
        className
      )}
    >
      {NOTIFICATION_PRIORITY_LABELS[priority]}
    </span>
  );
}
