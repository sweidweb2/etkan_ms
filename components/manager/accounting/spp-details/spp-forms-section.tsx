import { format } from "date-fns";
import { FileTextIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { ManagerFinancialFormRow } from "@/types/manager-financial-adjustment";
import type { ManagerSppDetail } from "@/types/manager-student-payment";

type SppFormsSectionProps = {
  spp: ManagerSppDetail;
  forms: ManagerFinancialFormRow[];
  onCreate: () => void;
  onEdit: (form: ManagerFinancialFormRow) => void;
  onDelete: (form: ManagerFinancialFormRow) => void;
};

export function SppFormsSection({
  spp,
  forms,
  onCreate,
  onEdit,
  onDelete,
}: SppFormsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial forms</CardTitle>
        {!spp.adjustments_blocked ? (
          <CardAction>
            <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE}>
              <Button type="button" size="sm" onClick={onCreate}>
                <PlusIcon data-icon="inline-start" />
                Add financial form
              </Button>
            </Can>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {forms.length === 0 ? (
          <EmptyState
            size="sm"
            icon={FileTextIcon}
            title="No financial forms yet"
            description="Forms do not change amounts."
          />
        ) : (
          <div className="grid gap-3 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-3">
            {forms.map((formRow) => (
              <div
                key={formRow.id}
                className="rounded-lg border bg-card px-3 py-3 shadow-sm"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">
                    {formRow.full_name}
                  </p>
                  {!spp.adjustments_blocked ? (
                    <div className="flex shrink-0 gap-1">
                      <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_UPDATE}>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Edit financial form"
                          onClick={() => onEdit(formRow)}
                        >
                          <PencilIcon />
                        </Button>
                      </Can>
                      <Can permission={PERMISSIONS.ACCOUNTING_ADJUSTMENTS_DELETE}>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          aria-label="Delete financial form"
                          onClick={() => onDelete(formRow)}
                        >
                          <Trash2Icon />
                        </Button>
                      </Can>
                    </div>
                  ) : null}
                </div>
                <dl className="grid gap-2 text-xs sm:text-sm">
                  <div>
                    <dt className="text-muted-foreground">Agreed to rules</dt>
                    <dd className="font-medium">
                      {formRow.agreed_to_rules ? "Yes" : "No"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      School / university
                    </dt>
                    <dd className="font-medium">
                      {formRow.school_or_university ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Phone</dt>
                    <dd className="font-medium">{formRow.phone ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Submitted</dt>
                    <dd className="font-medium">
                      {format(new Date(formRow.created_at), "MMM d, yyyy")}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
