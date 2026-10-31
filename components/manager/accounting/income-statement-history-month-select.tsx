"use client";

import { useRouter } from "next/navigation";
import { CalendarIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROUTES } from "@/lib/constants/routes";
import type { IncomeStatementMonthOption } from "@/types/manager-income-statement";

type IncomeStatementHistoryMonthSelectProps = {
  months: IncomeStatementMonthOption[];
  selectedMonthKey: string | null;
};

export function IncomeStatementHistoryMonthSelect({
  months,
  selectedMonthKey,
}: IncomeStatementHistoryMonthSelectProps) {
  const router = useRouter();

  const monthItems = months.map((month) => ({
    value: month.key,
    label: month.label,
  }));

  function handleMonthChange(value: string | null) {
    if (!value) {
      return;
    }

    router.push(
      `${ROUTES.MANAGER_INCOME_STATEMENT_HISTORY}?month=${encodeURIComponent(value)}`
    );
  }

  if (months.length === 0) {
    return (
      <EmptyState
        size="sm"
        icon={CalendarIcon}
        title="No past months with data yet"
        description="History months appear once income statement data exists."
      />
    );
  }

  return (
    <Select
      value={selectedMonthKey ?? undefined}
      items={monthItems}
      onValueChange={handleMonthChange}
    >
      <SelectTrigger
        id="income-statement-history-month"
        className="w-full"
        aria-label="Select month"
      >
        <SelectValue placeholder="Select a month" />
      </SelectTrigger>
      <SelectContent>
        {months.map((month) => (
          <SelectItem key={month.key} value={month.key}>
            {month.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
