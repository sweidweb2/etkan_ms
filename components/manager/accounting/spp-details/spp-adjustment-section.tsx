import { format } from "date-fns";
import { ImportIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { formatAdjustmentValue } from "@/components/manager/accounting/spp-details/spp-details-helpers";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  FINANCIAL_ADJUSTMENT_TYPE_LABELS,
  FINANCIAL_ADJUSTMENT_VALUE_TYPE_LABELS,
  type FinancialAdjustmentType,
  type FinancialAdjustmentValueType,
} from "@/lib/manager/accounting/constants";
import type { ManagerFinancialAdjustmentRow } from "@/types/manager-financial-adjustment";
import type { ManagerSppDetail } from "@/types/manager-student-payment";

type SppAdjustmentSectionProps = {
  spp: ManagerSppDetail;
  adjustment: ManagerFinancialAdjustmentRow | null;
  importableCount: number;
  onCreate: () => void;
  onImport: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

export function SppAdjustmentSection({
  spp,
  adjustment,
  importableCount,
  onCreate,
  onImport,
  onEdit,
  onDelete,
}: SppAdjustmentSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial adjustment</CardTitle>
        {!spp.adjustments_blocked && !adjustment ? (
          <CardAction className="flex flex-wrap gap-2">
            <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_CREATE}>
              <Button type="button" size="sm" onClick={onCreate}>
                <PlusIcon data-icon="inline-start" />
                Add adjustment
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={importableCount === 0}
                title={
                  importableCount === 0
                    ? "No prior adjustments for this student."
                    : undefined
                }
                onClick={onImport}
              >
                <ImportIcon data-icon="inline-start" />
                Import adjustment
              </Button>
            </Can>
          </CardAction>
        ) : null}
        {!spp.adjustments_blocked && adjustment ? (
          <CardAction className="flex flex-wrap gap-2">
            <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE}>
              <Button type="button" size="sm" variant="outline" onClick={onEdit}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
            </Can>
            <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE}>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onDelete}
              >
                <Trash2Icon data-icon="inline-start" />
                Delete
              </Button>
            </Can>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {!adjustment ? (
          <p className="text-sm text-muted-foreground">
            No financial adjustment on this student payment phase.
          </p>
        ) : (
          <dl className="grid gap-3 text-sm @lg/panel:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Type</dt>
              <dd className="font-medium">
                {
                  FINANCIAL_ADJUSTMENT_TYPE_LABELS[
                    adjustment.type as FinancialAdjustmentType
                  ]
                }
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Value type</dt>
              <dd className="font-medium">
                {
                  FINANCIAL_ADJUSTMENT_VALUE_TYPE_LABELS[
                    adjustment.value_type as FinancialAdjustmentValueType
                  ]
                }
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Value</dt>
              <dd className="font-medium tabular-nums">
                {formatAdjustmentValue(
                  adjustment.value_type as FinancialAdjustmentValueType,
                  adjustment.value
                )}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Effective date</dt>
              <dd className="font-medium">
                {format(new Date(adjustment.effective_date), "MMM d, yyyy")}
              </dd>
            </div>
            <div className="@lg/panel:col-span-2">
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="font-medium">{adjustment.reason ?? "—"}</dd>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
