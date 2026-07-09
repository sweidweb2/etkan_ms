import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { AccountingAnalysisSemesterTabs } from "@/components/manager/accounting/accounting-analysis-semester-tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/routes";

export function ManageAccountingAnalysisPanel() {
  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href={ROUTES.MANAGER_ACCOUNTING}>
              Manage accounting
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Analysis</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Accounting analysis
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revenue, collections, and payment activity by semester.
          </p>
        </div>
        <Button
          render={<Link href={ROUTES.MANAGER_ACCOUNTING} />}
          nativeButton={false}
          variant="outline"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Back to accounting
        </Button>
      </div>

      <AccountingAnalysisSemesterTabs />
    </div>
  );
}
