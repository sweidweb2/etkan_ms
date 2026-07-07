import { MANAGER_USER_ROLE_BADGE_CLASSES, MANAGER_USER_ROLE_LABELS } from "@/lib/constants/manager-user-display";
import type { RoleValue } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";

type UserRoleBadgeProps = {
  role: RoleValue;
  className?: string;
};

export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-medium capitalize",
        MANAGER_USER_ROLE_BADGE_CLASSES[role],
        className
      )}
    >
      {MANAGER_USER_ROLE_LABELS[role]}
    </span>
  );
}
