import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import type { DropStudentConsoleHotSignals } from "@/types/manager-drop-student-console";
import { cn } from "@/lib/utils";

type DropStudentHotRowProps = {
  hot: DropStudentConsoleHotSignals;
};

type Chip = {
  key: string;
  label: string;
  tone: "amber" | "neutral" | "danger";
};

export function DropStudentHotRow({ hot }: DropStudentHotRowProps) {
  const chips: Chip[] = [];

  if (hot.has_pending_drop) {
    chips.push({
      key: "pending",
      label: `Pending drop ×${hot.pending_drop_count}`,
      tone: "amber",
    });
  }
  if (hot.needs_immediate_drop) {
    chips.push({
      key: "paid-spp",
      label: `Paid open SPP semesters ×${hot.droppable_paid_semester_count} (immediate drop on inactivate)`,
      tone: "amber",
    });
  }
  if (hot.unpaid_open_spp_count > 0) {
    chips.push({
      key: "unpaid",
      label: `Unpaid open SPPs ×${hot.unpaid_open_spp_count}`,
      tone: "neutral",
    });
  }
  if (hot.eligible_class_count > 0) {
    chips.push({
      key: "classes",
      label: `Eligible classes ×${hot.eligible_class_count}`,
      tone: "neutral",
    });
  }
  if (hot.refund_owed_count > 0) {
    chips.push({
      key: "refund",
      label: `Refund owed ${formatPaymentPhaseMoney(hot.refund_owed_remaining_total)}`,
      tone: "danger",
    });
  }
  if (!hot.can_inactivate && hot.inactivate_blocked_reason) {
    chips.push({
      key: "block",
      label: "Inactivate blocked",
      tone: "danger",
    });
  }

  if (chips.length === 0) {
    return (
      <div className="rounded-xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        No hot blockers. Review the summary before choosing an action.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className={cn(
              "rounded-md border px-2.5 py-1 text-xs font-medium",
              chip.tone === "amber" &&
                "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100",
              chip.tone === "danger" &&
                "border-destructive/40 bg-destructive/10 text-destructive",
              chip.tone === "neutral" && "bg-muted text-foreground"
            )}
          >
            {chip.label}
          </span>
        ))}
      </div>
      {hot.inactivate_blocked_reason ? (
        <p className="text-xs text-amber-800 dark:text-amber-200">
          {hot.inactivate_blocked_reason}
        </p>
      ) : null}
    </div>
  );
}
