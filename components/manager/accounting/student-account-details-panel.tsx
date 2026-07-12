"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ExternalLinkIcon, PencilIcon, TriangleAlertIcon } from "lucide-react";
import {
  Tabs as TabsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { SubscribedSemesterPaymentsSection } from "@/components/manager/accounting/subscribed-semester-payments-section";
import { ScheduledPaymentsSection } from "@/components/manager/accounting/scheduled-payments-section";
import { SubscribedSemesterFinancialSection } from "@/components/manager/accounting/subscribed-semester-financial-section";
import { AccountSpecialCaseSection } from "@/components/manager/accounting/account-special-case-section";
import { EditSubscribedSemesterDialog } from "@/components/manager/accounting/edit-subscribed-semester-dialog";
import { SubscribedSemesterStatusBadge } from "@/components/manager/accounting/subscribed-semester-status-badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HorizontalScrollCarousel } from "@/components/ui/horizontal-scroll-carousel";
import {
  ACCOUNTING_PAYMENT_ALERT_MIN_AMOUNT,
  ACCOUNTING_PAYMENT_ALERT_REASON_LABELS,
  isOpenBillingSubscriptionStatus,
  resolveManageAccountingAlert,
} from "@/lib/constants/manager-accounting-payment-alert";
import {
  ACCOUNT_SPECIAL_CASE_STATUSES,
} from "@/lib/constants/manager-account-special-case";
import {
  SCHEDULED_PAYMENT_STATUSES,
} from "@/lib/constants/manager-scheduled-payment-status";
import {
  getSubscriptionBillingGate,
} from "@/lib/manager/subscribed-semester-billing";
import {
  formatAccountCurrency,
} from "@/lib/constants/manager-subscribed-semester-display";
import { SUBSCRIBED_SEMESTER_STATUSES } from "@/lib/constants/manager-subscribed-semester-status";
import {
  getManagerStudentDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type {
  ManagerStudentAccountDetails,
  ManagerStudentPaymentRow,
} from "@/types/manager-student-account";
import type { ManagerAccountSpecialCaseRow } from "@/types/manager-account-special-case";
import type { ManagerScheduledPaymentRow } from "@/types/manager-scheduled-payment";
import type { ManagerAccountingPaymentAlertReason } from "@/types/manager-student-semester";

type StudentAccountDetailsPanelProps = {
  accountDetails: ManagerStudentAccountDetails;
};

function DetailField({
  label,
  value,
  children,
}: {
  label: string;
  value?: string | number | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children ?? value ?? "—"}</dd>
    </div>
  );
}

function SubscriptionPaymentAlertBox({
  reasons,
  paymentAlert,
}: {
  reasons: ManagerAccountingPaymentAlertReason[];
  paymentAlert: boolean;
}) {
  if (reasons.length === 0) {
    return null;
  }

  const attentionReasons = reasons.filter(
    (reason) => reason !== "done" && reason !== "scheduled"
  );
  const hasDone = reasons.includes("done");
  const hasScheduled = reasons.includes("scheduled");
  const isInformationalOnly = attentionReasons.length === 0 && !paymentAlert;

  if (isInformationalOnly || (hasDone && attentionReasons.length === 0 && !hasScheduled)) {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3"
      >
        <div className="flex gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              Billing status
            </p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-emerald-900/90 dark:text-emerald-100/90">
              {reasons.map((reason) => (
                <li key={reason}>
                  {ACCOUNTING_PAYMENT_ALERT_REASON_LABELS[reason]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (hasScheduled && attentionReasons.length === 0) {
    return (
      <div
        role="status"
        className="rounded-xl border border-slate-500/30 bg-slate-500/10 px-4 py-3"
      >
        <div className="flex gap-3">
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Scheduled reminders
            </p>
            <ul className="list-disc space-y-0.5 pl-4 text-xs text-slate-900/90 dark:text-slate-100/90">
              {reasons.map((reason) => (
                <li key={reason}>
                  {ACCOUNTING_PAYMENT_ALERT_REASON_LABELS[reason]}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3"
    >
      <div className="flex gap-3">
        <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Payment alert
          </p>
          <p className="text-xs text-amber-900/80 dark:text-amber-100/80">
            Manage accounting flags this subscription using open-billing status,
            special cases, schedules, under-${ACCOUNTING_PAYMENT_ALERT_MIN_AMOUNT}
            paid, and missed-month levels (L1–L6).
          </p>
          <ul className="list-disc space-y-0.5 pl-4 text-xs text-amber-900/90 dark:text-amber-100/90">
            {reasons.map((reason) => (
              <li key={reason}>
                {ACCOUNTING_PAYMENT_ALERT_REASON_LABELS[reason]}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SubscribedSemesterTabPanel({
  subscription,
  payments,
  scheduledPayments,
  specialCase,
  openBillingCount,
  isFocusOpenSubscription,
  onMutationSuccess,
}: {
  subscription: ManagerStudentAccountDetails["subscriptions"][number];
  payments: ManagerStudentPaymentRow[];
  scheduledPayments: ManagerScheduledPaymentRow[];
  specialCase: ManagerAccountSpecialCaseRow | null;
  openBillingCount: number;
  isFocusOpenSubscription: boolean;
  onMutationSuccess: () => void;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const activeSpecial =
    specialCase?.status === ACCOUNT_SPECIAL_CASE_STATUSES.ACTIVE
      ? specialCase
      : null;
  const billingGate = getSubscriptionBillingGate({
    status: subscription.status,
    subscriptionAmount: subscription.amount,
    totalPaid: subscription.paid_amount,
    activeSpecialCaseTotalAmount: activeSpecial
      ? activeSpecial.total_amount
      : null,
  });
  const hasMissedScheduledPayment = scheduledPayments.some(
    (row) => row.status === SCHEDULED_PAYMENT_STATUSES.MISSED
  );
  const paymentAlert = resolveManageAccountingAlert({
    openBillingCount,
    isFocusOpenSubscription,
    totalPaid: subscription.paid_amount,
    paidAts: payments.map((payment) => payment.paid_at),
    semesterAmount: subscription.amount,
    activeSpecialCaseTotalAmount: activeSpecial
      ? activeSpecial.total_amount
      : null,
    hasScheduledPayments: scheduledPayments.length > 0,
    hasMissedScheduledPayment,
  });

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <EditSubscribedSemesterDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        subscription={subscription}
        onSubscriptionSaved={onMutationSuccess}
      />

      <SubscriptionPaymentAlertBox
        reasons={paymentAlert.payment_alert_reasons}
        paymentAlert={paymentAlert.payment_alert}
      />

      <SubscribedSemesterFinancialSection
        subscription={subscription}
        payments={payments}
        scheduledPayments={scheduledPayments}
        activeSpecialCaseTotalAmount={
          activeSpecial ? activeSpecial.total_amount : null
        }
      />

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Subscription details</CardTitle>
          <CardAction className="self-center">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(true)}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="py-6">
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DetailField label="Subscription ID" value={subscription.id} />
        <DetailField label="Account ID" value={subscription.account_id} />
        <DetailField label="Semester" value={subscription.semester_name} />
        <DetailField label="Semester ID" value={subscription.semester_id} />
        <DetailField
          label="Amount"
          value={formatAccountCurrency(subscription.amount)}
        />
        <DetailField label="Status">
          <SubscribedSemesterStatusBadge status={subscription.status} />
        </DetailField>
        <DetailField
          label="Subscribed"
          value={format(new Date(subscription.created_at), "MMM d, yyyy 'at' h:mm a")}
        />
          </dl>
        </CardContent>
      </Card>

      <AccountSpecialCaseSection
        accountId={subscription.account_id}
        semesterId={subscription.semester_id}
        semesterName={subscription.semester_name}
        semesterAmount={subscription.amount}
        specialCase={specialCase}
        onSpecialCaseSaved={onMutationSuccess}
      />

      <SubscribedSemesterPaymentsSection
        subscribedSemesterId={subscription.id}
        semesterName={subscription.semester_name}
        payments={payments}
        canCreate={billingGate.canCreatePayments}
        canEdit={billingGate.canEditPayments}
        canDelete={billingGate.canDeletePayments}
        remainingDue={billingGate.remainingDue}
        owedAmount={billingGate.owedAmount}
        createLockReason={billingGate.createLockReason}
        editLockReason={billingGate.editLockReason}
        onPaymentSaved={onMutationSuccess}
      />

      <ScheduledPaymentsSection
        subscribedSemesterId={subscription.id}
        semesterName={subscription.semester_name}
        balanceDue={billingGate.remainingDue}
        canMutate={billingGate.canMutateSchedules}
        lockReason={billingGate.lockReason}
        scheduledPayments={scheduledPayments}
        onScheduledPaymentSaved={onMutationSuccess}
      />
    </div>
  );
}

export function StudentAccountDetailsPanel({
  accountDetails,
}: StudentAccountDetailsPanelProps) {
  const router = useRouter();
  const { overview, subscriptions, payments, scheduledPayments, specialCases } =
    accountDetails;
  const [activeTab, setActiveTab] = useState<string | null>(
    () => subscriptions[0]?.id ?? null
  );
  const resolvedActiveTab =
    subscriptions.length === 0
      ? null
      : activeTab && subscriptions.some((row) => row.id === activeTab)
        ? activeTab
        : subscriptions[0]!.id;
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  const handleMutationSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  const openedText = useMemo(
    () => format(new Date(overview.opened_at), "MMM d, yyyy 'at' h:mm a"),
    [overview.opened_at]
  );

  const activeSubscription =
    subscriptions.find((row) => row.id === resolvedActiveTab) ??
    subscriptions[0] ??
    null;

  const openBillingSubscriptions = useMemo(
    () =>
      subscriptions.filter((row) =>
        isOpenBillingSubscriptionStatus(row.status)
      ),
    [subscriptions]
  );
  const openBillingCount = openBillingSubscriptions.length;
  const singleOpenSubscription =
    openBillingCount === 1 ? openBillingSubscriptions[0] : undefined;
  const isFocusOpenSubscription =
    !activeSubscription ||
    openBillingCount !== 1 ||
    singleOpenSubscription?.id === activeSubscription.id;

  const paymentsBySubscription = useMemo(() => {
    const grouped = new Map<string, ManagerStudentPaymentRow[]>();

    for (const payment of payments) {
      const existing = grouped.get(payment.subscribed_semester_id) ?? [];
      existing.push(payment);
      grouped.set(payment.subscribed_semester_id, existing);
    }

    for (const [key, rows] of grouped) {
      grouped.set(
        key,
        rows.sort(
          (left, right) =>
            new Date(right.paid_at).getTime() - new Date(left.paid_at).getTime()
        )
      );
    }

    return grouped;
  }, [payments]);

  const scheduledPaymentsBySubscription = useMemo(() => {
    const grouped = new Map<string, ManagerScheduledPaymentRow[]>();

    for (const row of scheduledPayments) {
      const existing = grouped.get(row.subscribed_semester_id) ?? [];
      existing.push(row);
      grouped.set(row.subscribed_semester_id, existing);
    }

    for (const [key, rows] of grouped) {
      grouped.set(
        key,
        rows.sort(
          (left, right) =>
            new Date(left.payment_date).getTime() -
            new Date(right.payment_date).getTime()
        )
      );
    }

    return grouped;
  }, [scheduledPayments]);

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [resolvedActiveTab]);

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
            <BreadcrumbPage>{overview.full_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {overview.full_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Student account and subscribed semester billing.
          </p>
        </div>
        <Button
          render={
            <Link href={getManagerStudentDetailRoute(overview.student_profile_id)} />
          }
          nativeButton={false}
          variant="outline"
        >
          <ExternalLinkIcon data-icon="inline-start" />
          View student profile
        </Button>
      </div>

      <Card className="gap-0 py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Account overview</CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <DetailField label="Student" value={overview.full_name} />
            <DetailField label="Email" value={overview.email} />
            <DetailField label="Phone" value={overview.phone ?? "—"} />
            <DetailField label="Account ID" value={overview.account_id} />
            <DetailField label="Opened" value={openedText} />
            <DetailField label="User ID" value={overview.user_id} />
          </dl>
        </CardContent>
      </Card>

      <Card className="min-w-0 max-w-full overflow-hidden gap-0 py-0">
        <CardHeader className="border-b bg-muted/40 py-3">
          <CardTitle>Subscribed semesters</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each tab is one subscription record for this student account.
          </p>
        </CardHeader>
        <CardContent className="min-w-0 max-w-full overflow-hidden px-0 pb-0">
          {subscriptions.length === 0 ? (
            <div className="min-w-0 max-w-full overflow-hidden border-b bg-muted/25 px-4 py-3">
              <p className="rounded-xl bg-muted/60 px-4 py-8 text-center text-sm text-muted-foreground ring-1 ring-foreground/8">
                No subscribed semesters for this student yet.
              </p>
            </div>
          ) : (
            <TabsPrimitive
              value={resolvedActiveTab ?? subscriptions[0]!.id}
              onValueChange={setActiveTab}
              className="flex min-w-0 max-w-full flex-col gap-0"
            >
              <div className="min-w-0 max-w-full overflow-hidden border-b bg-muted/25 px-5 py-3 sm:px-6">
                <HorizontalScrollCarousel
                  ariaLabel="Subscribed semester tabs"
                  className="mx-1 rounded-xl bg-muted/60 p-2 ring-1 ring-foreground/8"
                  contentClassName="px-2"
                  navButtonClassName="size-8 rounded-full text-muted-foreground hover:bg-background/80 hover:text-foreground disabled:opacity-30"
                >
                  <TabsListPrimitive className="my-1 inline-flex h-auto w-max max-w-none flex-nowrap items-center gap-2 bg-transparent px-1 py-0">
                    {subscriptions.map((subscription) => (
                      <TabsTriggerPrimitive
                        key={subscription.id}
                        ref={
                          resolvedActiveTab === subscription.id
                            ? activeTabRef
                            : undefined
                        }
                        value={subscription.id}
                        className={cn(
                          "group inline-flex max-w-none shrink-0 flex-none items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all duration-200",
                          "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
                          "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md data-[state=active]:ring-2 data-[state=active]:ring-offset-2 data-[state=active]:ring-offset-muted/60",
                          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        )}
                      >
                        <span
                          className={cn(
                            "size-2 shrink-0 rounded-full",
                            subscription.status ===
                              SUBSCRIBED_SEMESTER_STATUSES.PENDING
                              ? "bg-amber-500"
                              : subscription.status ===
                                  SUBSCRIBED_SEMESTER_STATUSES.PAID
                                ? "bg-emerald-500"
                                : subscription.status ===
                                    SUBSCRIBED_SEMESTER_STATUSES.PAUSED
                                  ? "bg-sky-500"
                                  : subscription.status ===
                                      SUBSCRIBED_SEMESTER_STATUSES.REFUNDED
                                    ? "bg-rose-500"
                                    : "bg-muted-foreground"
                          )}
                          aria-hidden="true"
                        />
                        <span className="flex flex-col items-start leading-tight">
                          <span className="max-w-[12rem] truncate whitespace-nowrap">
                            {subscription.semester_name}
                          </span>
                          <span className="text-[10px] font-normal text-muted-foreground group-data-[state=active]:text-foreground/70">
                            {formatAccountCurrency(subscription.amount)}
                          </span>
                        </span>
                      </TabsTriggerPrimitive>
                    ))}
                  </TabsListPrimitive>
                </HorizontalScrollCarousel>
              </div>

              {activeSubscription ? (
                <div className="min-w-0 px-4 py-6">
                  <SubscribedSemesterTabPanel
                    subscription={activeSubscription}
                    payments={
                      paymentsBySubscription.get(activeSubscription.id) ?? []
                    }
                    scheduledPayments={
                      scheduledPaymentsBySubscription.get(activeSubscription.id) ??
                      []
                    }
                    specialCase={
                      specialCases.find(
                        (row) => row.semester_id === activeSubscription.semester_id
                      ) ?? null
                    }
                    openBillingCount={openBillingCount}
                    isFocusOpenSubscription={isFocusOpenSubscription}
                    onMutationSuccess={handleMutationSuccess}
                  />
                </div>
              ) : null}
            </TabsPrimitive>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
