import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { cn } from "@/lib/utils";
import type { ManagerSppDetail } from "@/types/manager-student-payment";

type SppDetailsStatsProps = {
  spp: ManagerSppDetail;
};

export function SppDetailsStats({ spp }: SppDetailsStatsProps) {
  return (
    <div className="grid gap-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-5">
      <UserStatCard
        label="Original"
        value={formatPaymentPhaseMoney(spp.original_amount)}
        accentClassName="border-l-sky-500"
      />
      <UserStatCard
        label="Adjustment"
        value={formatPaymentPhaseMoney(spp.adjustment_amount)}
        accentClassName="border-l-violet-500"
      />
      <UserStatCard
        label="Due"
        value={formatPaymentPhaseMoney(spp.final_amount_due)}
        accentClassName="border-l-amber-500"
      />
      <UserStatCard
        label="Paid"
        value={formatPaymentPhaseMoney(spp.total_paid)}
        accentClassName="border-l-emerald-500"
      />
      <div
        className={cn(
          "rounded-xl bg-card py-4 pl-4 pr-5 ring-1 ring-foreground/10 border-l-4 border-l-rose-500"
        )}
      >
        <p className="text-sm text-muted-foreground">Remaining</p>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight tabular-nums">
          {formatPaymentPhaseMoney(spp.remaining_amount)}
          {spp.has_credit ? (
            <span className="inline-flex items-center rounded-md bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
              Credit
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}
