import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import { FINANCIAL_ADJUSTMENT_VALUE_TYPES } from "@/lib/manager/accounting/constants";
import type { FinancialAdjustmentValueType } from "@/lib/manager/accounting/constants";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  CreateFinancialFormInviteActionState,
  DeleteFinancialAdjustmentActionState,
  DeleteFinancialFormActionState,
  DeleteFinancialFormInviteActionState,
  ManagerFinancialAdjustmentRow,
  ManagerFinancialFormInviteRow,
  ManagerFinancialFormRow,
  ManagerImportableAdjustmentRow,
} from "@/types/manager-financial-adjustment";
import type {
  DeleteStudentPaymentActionState,
  DeleteStudentPaymentPhaseActionState,
  ManagerSppDetail,
  ManagerStudentPaymentRow,
} from "@/types/manager-student-payment";
import type { ManagerStudentPaymentScheduleRow } from "@/types/manager-student-payment-schedule";

export const initialDeletePaymentState: DeleteStudentPaymentActionState = {};
export const initialDeleteAdjustmentState: DeleteFinancialAdjustmentActionState =
  {};
export const initialDeleteSppState: DeleteStudentPaymentPhaseActionState = {};
export const initialDeleteFormState: DeleteFinancialFormActionState = {};
export const initialDeleteInviteState: DeleteFinancialFormInviteActionState =
  {};
export const initialInviteState: CreateFinancialFormInviteActionState = {};

export const SPP_HAS_PAYMENTS_DELETE_ERROR =
  "Delete all payments on this SPP first.";

export type SppDetailsPanelProps = {
  spp: ManagerSppDetail;
  initialPayments: ManagerStudentPaymentRow[];
  initialSchedules: ManagerStudentPaymentScheduleRow[];
  initialAdjustment: ManagerFinancialAdjustmentRow | null;
  initialImportableAdjustments: ManagerImportableAdjustmentRow[];
  initialForms: ManagerFinancialFormRow[];
  initialInvites: ManagerFinancialFormInviteRow[];
};

export const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

export function TruncatedCell({
  value,
  maxLength,
  className,
}: {
  value: string;
  maxLength: number;
  className?: string;
}) {
  const { display, isTruncated } = truncateText(value, maxLength);

  if (!isTruncated) {
    return <span className={cn("block truncate", className)}>{display}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn("block cursor-default truncate", className)}
            tabIndex={0}
          />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

export function formatAdjustmentValue(
  valueType: FinancialAdjustmentValueType,
  value: number
) {
  if (valueType === FINANCIAL_ADJUSTMENT_VALUE_TYPES.PERCENTAGE) {
    return `${value}%`;
  }
  return formatPaymentPhaseMoney(value);
}

export function sortPayments(rows: ManagerStudentPaymentRow[]) {
  return [...rows].sort(
    (a, b) =>
      b.payment_date.localeCompare(a.payment_date) ||
      b.created_at.localeCompare(a.created_at)
  );
}
