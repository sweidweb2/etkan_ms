"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { ExternalLinkIcon, PencilIcon } from "lucide-react";
import {
  Tabs as TabsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { SubscribedSemesterPaymentsSection } from "@/components/manager/accounting/subscribed-semester-payments-section";
import { ScheduledPaymentsSection } from "@/components/manager/accounting/scheduled-payments-section";
import { SubscribedSemesterFinancialSection } from "@/components/manager/accounting/subscribed-semester-financial-section";
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
  formatAccountCurrency,
} from "@/lib/constants/manager-subscribed-semester-display";
import { getManagerStudentAccountPreview } from "@/lib/manager/get-manager-student-account-preview";
import {
  getManagerStudentDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type {
  ManagerStudentPaymentRow,
  ManagerSubscribedSemesterRow,
} from "@/types/manager-student-account";
import type { ManagerScheduledPaymentRow } from "@/types/manager-scheduled-payment";

type StudentAccountDetailsPanelProps = {
  studentProfileId: string;
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

function sumPaymentsForSubscription(
  paymentsList: ManagerStudentPaymentRow[],
  subscribedSemesterId: string
) {
  return (
    Math.round(
      paymentsList
        .filter((payment) => payment.subscribed_semester_id === subscribedSemesterId)
        .reduce((sum, payment) => sum + payment.amount, 0) * 100
    ) / 100
  );
}

function SubscribedSemesterTabPanel({
  subscription,
  payments,
  scheduledPayments,
  onAddPayment,
  onUpdatePayment,
  onAddScheduledPayment,
  onUpdateScheduledPayment,
  onUpdateSubscription,
}: {
  subscription: ManagerSubscribedSemesterRow;
  payments: ManagerStudentPaymentRow[];
  scheduledPayments: ManagerScheduledPaymentRow[];
  onAddPayment: (payment: ManagerStudentPaymentRow) => void;
  onUpdatePayment: (payment: ManagerStudentPaymentRow) => void;
  onAddScheduledPayment: (row: ManagerScheduledPaymentRow) => void;
  onUpdateScheduledPayment: (row: ManagerScheduledPaymentRow) => void;
  onUpdateSubscription: (subscription: ManagerSubscribedSemesterRow) => void;
}) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const balanceDue = Math.max(subscription.amount - subscription.paid_amount, 0);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <EditSubscribedSemesterDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        subscription={subscription}
        onUpdateSubscription={onUpdateSubscription}
      />

      <SubscribedSemesterFinancialSection
        subscription={subscription}
        payments={payments}
        scheduledPayments={scheduledPayments}
      />

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-4">
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

      <ScheduledPaymentsSection
        subscribedSemesterId={subscription.id}
        semesterName={subscription.semester_name}
        balanceDue={balanceDue}
        scheduledPayments={scheduledPayments}
        onAddScheduledPayment={onAddScheduledPayment}
        onUpdateScheduledPayment={onUpdateScheduledPayment}
      />

      <SubscribedSemesterPaymentsSection
        subscribedSemesterId={subscription.id}
        semesterName={subscription.semester_name}
        payments={payments}
        onAddPayment={onAddPayment}
        onUpdatePayment={onUpdatePayment}
      />
    </div>
  );
}

export function StudentAccountDetailsPanel({
  studentProfileId,
}: StudentAccountDetailsPanelProps) {
  const initialAccount = useMemo(
    () => getManagerStudentAccountPreview(studentProfileId),
    [studentProfileId]
  );
  const [subscriptions, setSubscriptions] = useState<ManagerSubscribedSemesterRow[]>(
    () => initialAccount.subscriptions
  );
  const [payments, setPayments] = useState<ManagerStudentPaymentRow[]>(
    () => initialAccount.payments
  );
  const [scheduledPayments, setScheduledPayments] = useState<
    ManagerScheduledPaymentRow[]
  >(() => initialAccount.scheduledPayments);
  const [activeTab, setActiveTab] = useState<string | null>(
    () => initialAccount.subscriptions[0]?.id ?? null
  );
  const resolvedActiveTab =
    subscriptions.length === 0
      ? null
      : activeTab && subscriptions.some((row) => row.id === activeTab)
        ? activeTab
        : subscriptions[0]!.id;
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  const { overview } = initialAccount;

  const openedText = useMemo(
    () => format(new Date(overview.opened_at), "MMM d, yyyy 'at' h:mm a"),
    [overview.opened_at]
  );

  const activeSubscription =
    subscriptions.find((row) => row.id === resolvedActiveTab) ??
    subscriptions[0] ??
    null;

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

  function handleAddPayment(payment: ManagerStudentPaymentRow) {
    setPayments((current) => {
      const nextPayments = [payment, ...current];
      const paidAmount = sumPaymentsForSubscription(
        nextPayments,
        payment.subscribed_semester_id
      );

      setSubscriptions((currentSubscriptions) =>
        currentSubscriptions.map((subscription) =>
          subscription.id === payment.subscribed_semester_id
            ? { ...subscription, paid_amount: paidAmount }
            : subscription
        )
      );

      return nextPayments;
    });
  }

  function handleUpdatePayment(updated: ManagerStudentPaymentRow) {
    setPayments((current) => {
      const nextPayments = current.map((payment) =>
        payment.id === updated.id ? updated : payment
      );
      const paidAmount = sumPaymentsForSubscription(
        nextPayments,
        updated.subscribed_semester_id
      );

      setSubscriptions((currentSubscriptions) =>
        currentSubscriptions.map((subscription) =>
          subscription.id === updated.subscribed_semester_id
            ? { ...subscription, paid_amount: paidAmount }
            : subscription
        )
      );

      return nextPayments;
    });
  }

  function handleUpdateSubscription(updated: ManagerSubscribedSemesterRow) {
    setSubscriptions((current) =>
      current.map((subscription) =>
        subscription.id === updated.id ? updated : subscription
      )
    );
  }

  function handleAddScheduledPayment(row: ManagerScheduledPaymentRow) {
    setScheduledPayments((current) => [row, ...current]);
  }

  function handleUpdateScheduledPayment(updated: ManagerScheduledPaymentRow) {
    setScheduledPayments((current) =>
      current.map((row) => (row.id === updated.id ? updated : row))
    );
  }

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

      <Card className="py-0">
        <CardHeader className="border-b bg-muted/40 py-4">
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

      <Card className="min-w-0 max-w-full overflow-hidden py-0">
        <CardHeader className="border-b bg-muted/40 py-4">
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
                            subscription.status === "active"
                              ? "bg-emerald-500"
                              : subscription.status === "pending"
                                ? "bg-amber-500"
                                : subscription.status === "overdue"
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
                    onAddPayment={handleAddPayment}
                    onUpdatePayment={handleUpdatePayment}
                    onAddScheduledPayment={handleAddScheduledPayment}
                    onUpdateScheduledPayment={handleUpdateScheduledPayment}
                    onUpdateSubscription={handleUpdateSubscription}
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
