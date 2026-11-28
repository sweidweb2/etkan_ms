import { Can } from "@/components/auth/can";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { SppCurrentBadge } from "@/components/manager/accounting/spp-current-badge";
import { SppStatusBadge } from "@/components/manager/accounting/spp-status-badge";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerAccountingPhaseDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { resolveSppDisplayStatus } from "@/lib/manager/accounting/spp-display-status";
import type { ManagerSppDetail } from "@/types/manager-student-payment";
import { Trash2Icon } from "lucide-react";

type SppDetailsHeaderProps = {
  spp: ManagerSppDetail;
  hasPayments: boolean;
  sppDeleteBlockedReason: string | undefined;
  isDeleteSppActionPending: boolean;
  onDeleteSppOpen: () => void;
};

export function SppDetailsHeader({
  spp,
  hasPayments,
  sppDeleteBlockedReason,
  isDeleteSppActionPending,
  onDeleteSppOpen,
}: SppDetailsHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_ACCOUNTING}>
              Accounting
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              href={getManagerAccountingPhaseDetailRoute(spp.payment_phase_id)}
            >
              {spp.payment_phase_name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{spp.student_label}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <SppStatusBadge
          status={resolveSppDisplayStatus(
            { status: spp.status, totalPaid: spp.total_paid },
            {
              upfrontWindowActive: spp.upfront_window_active,
              upfrontAmount: spp.phase_upfront_amount,
            }
          )}
        />
        <SppCurrentBadge clearance={spp.current_clearance} />
        <PaymentPhaseStatusBadge status={spp.payment_phase_status} />
        <Can permission={PERMISSIONS.ACCOUNTING_SPP_DELETE}>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={hasPayments || isDeleteSppActionPending}
            title={sppDeleteBlockedReason}
            onClick={onDeleteSppOpen}
          >
            <Trash2Icon data-icon="inline-start" />
            Delete SPP
          </Button>
        </Can>
      </div>
    </div>
  );
}
