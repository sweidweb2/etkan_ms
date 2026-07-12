"use client";

import { useState } from "react";
import { format } from "date-fns";
import { PencilIcon, PlusIcon } from "lucide-react";
import { AccountSpecialCaseTypeBadge } from "@/components/manager/accounting/account-special-case-badges";
import { AddAccountSpecialCaseDialog } from "@/components/manager/accounting/add-account-special-case-dialog";
import { EditAccountSpecialCaseDialog } from "@/components/manager/accounting/edit-account-special-case-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCOUNT_SPECIAL_CASE_STATUS_LABELS } from "@/lib/constants/manager-account-special-case";
import { formatAccountCurrency } from "@/lib/constants/manager-subscribed-semester-display";
import type { ManagerAccountSpecialCaseRow } from "@/types/manager-account-special-case";

type AccountSpecialCaseSectionProps = {
  accountId: string;
  semesterId: string;
  semesterName: string;
  semesterAmount: number;
  specialCase: ManagerAccountSpecialCaseRow | null;
  onSpecialCaseSaved: () => void;
};

export function AccountSpecialCaseSection({
  accountId,
  semesterId,
  semesterName,
  semesterAmount,
  specialCase,
  onSpecialCaseSaved,
}: AccountSpecialCaseSectionProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  return (
    <>
      <AddAccountSpecialCaseDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        accountId={accountId}
        semesterId={semesterId}
        semesterName={semesterName}
        semesterAmount={semesterAmount}
        onSpecialCaseSaved={onSpecialCaseSaved}
      />
      <EditAccountSpecialCaseDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        specialCase={specialCase}
        semesterAmount={semesterAmount}
        onSpecialCaseSaved={onSpecialCaseSaved}
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Special case</CardTitle>
          <CardAction className="self-center">
            {specialCase ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
              >
                <PencilIcon data-icon="inline-start" />
                Edit
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddOpen(true)}
              >
                <PlusIcon data-icon="inline-start" />
                Add special case
              </Button>
            )}
          </CardAction>
        </CardHeader>
        <CardContent className="py-6">
          {specialCase ? (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Case type
                </dt>
                <dd className="flex flex-wrap items-center gap-1.5">
                  <AccountSpecialCaseTypeBadge caseType={specialCase.case_type} />
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </dt>
                <dd className="text-sm">
                  {ACCOUNT_SPECIAL_CASE_STATUS_LABELS[specialCase.status]}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total amount
                </dt>
                <dd className="text-sm">
                  {formatAccountCurrency(specialCase.total_amount)}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Discount
                </dt>
                <dd className="text-sm">{specialCase.percentage_discount}%</dd>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Explanation
                </dt>
                <dd className="text-sm whitespace-pre-wrap">
                  {specialCase.explanation}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Updated
                </dt>
                <dd className="text-sm text-muted-foreground">
                  {format(
                    new Date(specialCase.updated_at),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No special case for this semester yet.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
