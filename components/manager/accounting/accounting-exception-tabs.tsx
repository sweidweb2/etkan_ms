"use client";

import Link from "next/link";
import { useState } from "react";
import { BanknoteIcon, EyeIcon, UsersIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import {
  Tabs as TabsPrimitive,
  TabsContent as TabsContentPrimitive,
  TabsContents as TabsContentsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { PaymentPhaseStatusBadge } from "@/components/manager/accounting/payment-phase-status-badge";
import { SppStatusBadge } from "@/components/manager/accounting/spp-status-badge";
import { StudentStatusBadge } from "@/components/manager/students/student-status-badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PERMISSIONS } from "@/lib/constants/permissions";
import {
  getManagerAccountingPhaseDetailRoute,
  getManagerAccountingSppDetailRoute,
  getManagerClassDetailRoute,
  getManagerStudentDetailRoute,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  ManagerBilledWithoutClassRow,
  ManagerMissingSppRow,
  ManagerSppSemesterMismatchRow,
} from "@/types/manager-payment-phase";
import type { ManagerNeedRefundRow } from "@/types/manager-semester-drop";
import type { ManagerStudentWithoutActiveClassRow } from "@/types/manager-student";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";

export type AccountingExceptionTabValue =
  | "billed-no-class"
  | "no-class-no-phase"
  | "semester-mismatch"
  | "in-class-no-phase"
  | "need-refund";

type AccountingExceptionTabsProps = {
  billedWithoutClass: ManagerBilledWithoutClassRow[];
  withoutClassOrPhase: ManagerStudentWithoutActiveClassRow[];
  semesterMismatches: ManagerSppSemesterMismatchRow[];
  missingSpp: ManagerMissingSppRow[];
  needRefund: ManagerNeedRefundRow[];
  onAssignMissing: (row: ManagerMissingSppRow) => void;
  onProcessRefund: (row: ManagerNeedRefundRow) => void;
};

function TruncatedCell({
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
    <span className={cn("block truncate", className)} title={value}>
      {display}
    </span>
  );
}

const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

function CountBadge({ count }: { count: number }) {
  return (
    <span className="ml-1.5 rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground data-[state=active]:bg-background">
      {count}
    </span>
  );
}

export function AccountingExceptionTabs({
  billedWithoutClass,
  withoutClassOrPhase,
  semesterMismatches,
  missingSpp,
  needRefund,
  onAssignMissing,
  onProcessRefund,
}: AccountingExceptionTabsProps) {
  const [activeTab, setActiveTab] =
    useState<AccountingExceptionTabValue>("billed-no-class");

  return (
    <TabsPrimitive
      value={activeTab}
      onValueChange={(value) =>
        setActiveTab(value as AccountingExceptionTabValue)
      }
      className="flex flex-col gap-4"
    >
      <TabsListPrimitive className="flex h-auto w-full flex-wrap items-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 @lg/panel:w-fit">
        <TabsTriggerPrimitive
          value="billed-no-class"
          className={TAB_TRIGGER_CLASS}
        >
          Billed, no class
          <CountBadge count={billedWithoutClass.length} />
        </TabsTriggerPrimitive>
        <TabsTriggerPrimitive
          value="no-class-no-phase"
          className={TAB_TRIGGER_CLASS}
        >
          No class, no phase
          <CountBadge count={withoutClassOrPhase.length} />
        </TabsTriggerPrimitive>
        <TabsTriggerPrimitive
          value="semester-mismatch"
          className={TAB_TRIGGER_CLASS}
        >
          Semester mismatch
          <CountBadge count={semesterMismatches.length} />
        </TabsTriggerPrimitive>
        <TabsTriggerPrimitive
          value="in-class-no-phase"
          className={TAB_TRIGGER_CLASS}
        >
          In class, no phase
          <CountBadge count={missingSpp.length} />
        </TabsTriggerPrimitive>
        <TabsTriggerPrimitive
          value="need-refund"
          className={TAB_TRIGGER_CLASS}
        >
          Need refund
          <CountBadge count={needRefund.length} />
        </TabsTriggerPrimitive>
      </TabsListPrimitive>

      <TabsContentsPrimitive>
          <TabsContentPrimitive value="billed-no-class" className="px-0 py-0">
            {billedWithoutClass.length === 0 ? (
              <EmptyState
                size="sm"
                icon={UsersIcon}
                title="No billed students without an in-progress class"
                description="Everyone currently billed is also in an in-progress class."
              />
            ) : (
              <div className="overflow-x-auto overflow-hidden rounded-xl border">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Phase / semester</th>
                      <th className="px-4 py-3 font-medium">SPP</th>
                      <th className="px-4 py-3 font-medium text-right">Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billedWithoutClass.map((row) => (
                      <tr
                        key={row.spp_id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="max-w-[14rem] px-4 py-3 font-medium">
                          <TruncatedCell
                            value={row.student_label}
                            maxLength={32}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {row.student_status ? (
                            <StudentStatusBadge status={row.student_status} />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="max-w-[16rem] px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <TruncatedCell
                                value={row.payment_phase_name}
                                maxLength={28}
                              />
                              <PaymentPhaseStatusBadge status={row.phase_status} />
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {row.phase_semester_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <SppStatusBadge status={row.spp_status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {row.student_profile_id ? (
                              <Button
                                render={
                                  <Link
                                    href={getManagerStudentDetailRoute(
                                      row.student_profile_id
                                    )}
                                  />
                                }
                                nativeButton={false}
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`View ${row.student_label}`}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <EyeIcon />
                              </Button>
                            ) : null}
                            <Button
                              render={
                                <Link
                                  href={getManagerAccountingPhaseDetailRoute(
                                    row.payment_phase_id
                                  )}
                                />
                              }
                              nativeButton={false}
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              Phase
                            </Button>
                            <Button
                              render={
                                <Link
                                  href={getManagerAccountingSppDetailRoute(
                                    row.payment_phase_id,
                                    row.spp_id
                                  )}
                                />
                              }
                              nativeButton={false}
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              SPP
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContentPrimitive>

          <TabsContentPrimitive value="no-class-no-phase" className="px-0 py-0">
            {withoutClassOrPhase.length === 0 ? (
              <EmptyState
                size="sm"
                icon={UsersIcon}
                title="No students are outside both classes and billing"
                description="Every student is in a class or on a payment phase."
              />
            ) : (
              <div className="overflow-x-auto overflow-hidden rounded-xl border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {withoutClassOrPhase.map((row) => (
                      <tr
                        key={row.user_id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="max-w-[16rem] px-4 py-3 font-medium">
                          <TruncatedCell value={row.full_name} maxLength={36} />
                        </td>
                        <td className="px-4 py-3">
                          <StudentStatusBadge status={row.status} />
                        </td>
                        <td className="max-w-[12rem] px-4 py-3 text-muted-foreground">
                          {row.phone ? (
                            <TruncatedCell value={row.phone} maxLength={24} />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Button
                              render={
                                <Link
                                  href={getManagerStudentDetailRoute(
                                    row.student_profile_id
                                  )}
                                />
                              }
                              nativeButton={false}
                              variant="outline"
                              size="sm"
                            >
                              <EyeIcon data-icon="inline-start" />
                              View
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContentPrimitive>

          <TabsContentPrimitive value="semester-mismatch" className="px-0 py-0">
            {semesterMismatches.length === 0 ? (
              <EmptyState
                size="sm"
                icon={UsersIcon}
                title="No semester mismatches"
                description="Active SPPs and current classes share the same semester."
              />
            ) : (
              <div className="overflow-x-auto overflow-hidden rounded-xl border">
                <table className="w-full min-w-[800px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">
                        SPP phase / semester
                      </th>
                      <th className="px-4 py-3 font-medium">
                        Current class / semester
                      </th>
                      <th className="px-4 py-3 font-medium text-right">Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {semesterMismatches.map((row) => (
                      <tr
                        key={row.spp_id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="max-w-[14rem] px-4 py-3 font-medium">
                          <TruncatedCell
                            value={row.student_label}
                            maxLength={32}
                          />
                        </td>
                        <td className="max-w-[16rem] px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <TruncatedCell
                              value={row.payment_phase_name}
                              maxLength={28}
                            />
                            <span className="text-xs text-muted-foreground">
                              {row.phase_semester_name}
                            </span>
                          </div>
                        </td>
                        <td className="max-w-[16rem] px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <TruncatedCell
                              value={row.current_class_name}
                              maxLength={28}
                            />
                            <span className="text-xs text-muted-foreground">
                              {row.current_semester_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {row.student_profile_id ? (
                              <Button
                                render={
                                  <Link
                                    href={getManagerStudentDetailRoute(
                                      row.student_profile_id
                                    )}
                                  />
                                }
                                nativeButton={false}
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`View ${row.student_label}`}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <EyeIcon />
                              </Button>
                            ) : null}
                            <Button
                              render={
                                <Link
                                  href={getManagerAccountingPhaseDetailRoute(
                                    row.payment_phase_id
                                  )}
                                />
                              }
                              nativeButton={false}
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              Phase
                            </Button>
                            <Button
                              render={
                                <Link
                                  href={getManagerAccountingSppDetailRoute(
                                    row.payment_phase_id,
                                    row.spp_id
                                  )}
                                />
                              }
                              nativeButton={false}
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              SPP
                            </Button>
                            <Button
                              render={
                                <Link
                                  href={getManagerClassDetailRoute(
                                    row.current_class_id
                                  )}
                                />
                              }
                              nativeButton={false}
                              variant="ghost"
                              size="sm"
                              className="text-muted-foreground hover:text-foreground"
                            >
                              Class
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContentPrimitive>

          <TabsContentPrimitive value="in-class-no-phase" className="px-0 py-0">
            {missingSpp.length === 0 ? (
              <EmptyState
                size="sm"
                icon={UsersIcon}
                title="No missing assignments"
                description="All members of billing classes on opened phases have an assignment."
              />
            ) : (
              <div className="overflow-x-auto overflow-hidden rounded-xl border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Semester</th>
                      <th className="px-4 py-3 font-medium">Billing class</th>
                      <th className="px-4 py-3 font-medium">Phase</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {missingSpp.map((row) => (
                      <tr
                        key={`${row.payment_phase_id}:${row.student_id}`}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="max-w-[14rem] px-4 py-3 font-medium">
                          <TruncatedCell
                            value={row.student_label}
                            maxLength={32}
                          />
                        </td>
                        <td className="max-w-[12rem] px-4 py-3">
                          <TruncatedCell
                            value={row.semester_name}
                            maxLength={28}
                          />
                        </td>
                        <td className="max-w-[12rem] px-4 py-3">
                          <TruncatedCell
                            value={row.billing_class_name}
                            maxLength={28}
                          />
                        </td>
                        <td className="max-w-[12rem] px-4 py-3">
                          <TruncatedCell
                            value={row.payment_phase_name}
                            maxLength={28}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Can
                              permission={
                                PERMISSIONS.ACCOUNTING_PAYMENT_PHASES_CREATE
                              }
                            >
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => onAssignMissing(row)}
                              >
                                Assign
                              </Button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContentPrimitive>

          <TabsContentPrimitive value="need-refund" className="px-0 py-0">
            {needRefund.length === 0 ? (
              <EmptyState
                size="sm"
                icon={BanknoteIcon}
                title="No drop refunds owed"
                description="Completed semester drops with excess payment will appear here."
              />
            ) : (
              <div className="overflow-x-auto overflow-hidden rounded-xl border">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-left">
                      <th className="px-4 py-3 font-medium">Student</th>
                      <th className="px-4 py-3 font-medium">Phase</th>
                      <th className="px-4 py-3 font-medium text-right">Owed</th>
                      <th className="px-4 py-3 font-medium text-right">
                        Refunded
                      </th>
                      <th className="px-4 py-3 font-medium text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {needRefund.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="max-w-[14rem] px-4 py-3 font-medium">
                          <TruncatedCell
                            value={row.student_label}
                            maxLength={32}
                          />
                        </td>
                        <td className="max-w-[14rem] px-4 py-3">
                          <TruncatedCell
                            value={row.phase_name ?? "—"}
                            maxLength={28}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                          {formatPaymentPhaseMoney(row.remaining_refund)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground">
                          {formatPaymentPhaseMoney(row.refunded_amount)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Can
                              permission={
                                PERMISSIONS.ACCOUNTING_DROP_REFUNDS_PROCESS
                              }
                            >
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => onProcessRefund(row)}
                              >
                                Mark refunded
                              </Button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContentPrimitive>
      </TabsContentsPrimitive>
    </TabsPrimitive>
  );
}
