"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { WorkshopPaymentsTotalsSection } from "@/components/manager/workshops/workshop-payments-totals-section";
import { ROUTES } from "@/lib/constants/routes";
import type {
  ManagerWorkshopPaymentLedgerRow,
  ManagerWorkshopPaymentsTotals,
} from "@/types/manager-workshop";

type WorkshopPaymentsOverviewPanelProps = {
  payments: ManagerWorkshopPaymentLedgerRow[];
  totals: ManagerWorkshopPaymentsTotals;
  totalCount: number;
  page: number;
  pageSize: number;
};

export function WorkshopPaymentsOverviewPanel({
  payments,
  totals,
  totalCount,
  page,
  pageSize,
}: WorkshopPaymentsOverviewPanelProps) {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_WORKSHOPS}>
              Workshops
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Total payments</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <WorkshopPaymentsTotalsSection
        payments={payments}
        totals={totals}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
