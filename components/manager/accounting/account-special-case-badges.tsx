import {
  ACCOUNT_SPECIAL_CASE_NO_MONEY_BADGE_CLASS,
  ACCOUNT_SPECIAL_CASE_TYPE_BADGE_CLASSES,
  ACCOUNT_SPECIAL_CASE_TYPE_LABELS,
  type AccountSpecialCaseTypeValue,
} from "@/lib/constants/manager-account-special-case";
import { cn } from "@/lib/utils";

export function AccountSpecialCaseTypeBadge({
  caseType,
  className,
}: {
  caseType: AccountSpecialCaseTypeValue;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        ACCOUNT_SPECIAL_CASE_TYPE_BADGE_CLASSES[caseType],
        className
      )}
    >
      {ACCOUNT_SPECIAL_CASE_TYPE_LABELS[caseType]}
    </span>
  );
}

export function AccountSpecialCaseNoMoneyBadge({
  className,
}: {
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        ACCOUNT_SPECIAL_CASE_NO_MONEY_BADGE_CLASS,
        className
      )}
    >
      No money
    </span>
  );
}
