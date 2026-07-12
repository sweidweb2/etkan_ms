"use client";

import {
  AccountSpecialCaseNoMoneyBadge,
  AccountSpecialCaseTypeBadge,
} from "@/components/manager/accounting/account-special-case-badges";
import type { AccountSpecialCaseTypeValue } from "@/lib/constants/manager-account-special-case";
import { cn } from "@/lib/utils";

type AccountingSpecialCaseAlertBadgeProps = {
  caseType: AccountSpecialCaseTypeValue;
  noMoney: boolean;
  className?: string;
};

export function AccountingSpecialCaseAlertBadge({
  caseType,
  noMoney,
  className,
}: AccountingSpecialCaseAlertBadgeProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <AccountSpecialCaseTypeBadge caseType={caseType} />
      {noMoney ? <AccountSpecialCaseNoMoneyBadge /> : null}
    </div>
  );
}
