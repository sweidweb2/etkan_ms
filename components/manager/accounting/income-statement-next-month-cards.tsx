import {
  BadgeDollarSignIcon,
  CalendarClockIcon,
  HandCoinsIcon,
} from "lucide-react";
import { AnalyticsStatCard } from "@/components/manager/accounting/analytics-stat-card";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import type { ManagerNextMonthIncomeForecast } from "@/types/manager-income-statement-analytics";

type IncomeStatementNextMonthCardsProps = {
  forecast: ManagerNextMonthIncomeForecast;
};

function studentsDescription(forecast: ManagerNextMonthIncomeForecast): string {
  const students =
    forecast.student_count === 1
      ? "1 student"
      : `${forecast.student_count} students`;
  const phases =
    forecast.phase_count === 1
      ? "1 open phase"
      : `${forecast.phase_count} open phases`;

  return `Estimated from ${students} across ${phases}: one monthly installment each, or the upfront in a phase's first month, capped by what they still owe.`;
}

export function IncomeStatementNextMonthCards({
  forecast,
}: IncomeStatementNextMonthCardsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="text-sm font-medium">Next month forecast</h2>
        <p className="text-xs text-muted-foreground">
          Approximate money expected in {forecast.month_label}. Independent of
          the selected period.
        </p>
      </div>

      <div className="grid gap-4 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-3">
        <AnalyticsStatCard
          label={`Expected in ${forecast.month_label}`}
          value={formatPaymentPhaseMoney(forecast.expected_total)}
          description="Expected student payments plus expected external credits. An estimate, not committed revenue."
          icon={CalendarClockIcon}
          iconClassName="text-sky-500"
        />
        <AnalyticsStatCard
          label="Expected student payments"
          value={formatPaymentPhaseMoney(forecast.expected_student_payments)}
          description={studentsDescription(forecast)}
          icon={BadgeDollarSignIcon}
          iconClassName="text-emerald-500"
        />
        <AnalyticsStatCard
          label="Expected external credits"
          value={formatPaymentPhaseMoney(forecast.expected_credits)}
          description={`Average credit inflow over the last ${forecast.credits_months_sampled} completed months.`}
          icon={HandCoinsIcon}
          iconClassName="text-teal-500"
        />
      </div>
    </div>
  );
}
