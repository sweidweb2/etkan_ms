import {
  NOTIFICATION_CATEGORY_BADGE_CLASSES,
  NOTIFICATION_CATEGORY_LABELS,
  type NotificationCategoryValue,
} from "@/lib/constants/manager-notification-display";
import { cn } from "@/lib/utils";

type NotificationCategoryBadgeProps = {
  category: NotificationCategoryValue;
  className?: string;
};

export function NotificationCategoryBadge({
  category,
  className,
}: NotificationCategoryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
        NOTIFICATION_CATEGORY_BADGE_CLASSES[category],
        className
      )}
    >
      {NOTIFICATION_CATEGORY_LABELS[category]}
    </span>
  );
}
