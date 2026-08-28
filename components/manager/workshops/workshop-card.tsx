"use client";

import Link from "next/link";
import { useState } from "react";
import { BanknoteIcon, PencilIcon, PresentationIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddWorkshopPaymentDialog } from "@/components/manager/workshops/add-workshop-payment-dialog";
import { EditWorkshopDialog } from "@/components/manager/workshops/edit-workshop-dialog";
import { WorkshopStatusBadge } from "@/components/manager/workshops/workshop-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatPaymentPhaseMoney } from "@/lib/constants/manager-payment-phase-display";
import {
  WORKSHOP_OFFERING_TYPE_LABELS,
  WORKSHOP_PAYMENT_TYPES,
} from "@/lib/constants/manager-workshop-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerWorkshopDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerWorkshopRow } from "@/types/manager-workshop";

type WorkshopCardProps = {
  workshop: ManagerWorkshopRow;
};

const PAYMENT_BADGE_CLASSES = {
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  partial: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  unpaid: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  unpriced: "bg-muted text-muted-foreground",
} as const;

type PaymentState = keyof typeof PAYMENT_BADGE_CLASSES;

function resolvePaymentState(
  price: number | null,
  paidNet: number
): { state: PaymentState; label: string } {
  if (price == null || price <= 0) {
    return { state: "unpriced", label: "No price" };
  }
  if (paidNet >= price) {
    return { state: "paid", label: "Paid" };
  }
  if (paidNet > 0) {
    return { state: "partial", label: "Partially paid" };
  }
  return { state: "unpaid", label: "Unpaid" };
}

export function WorkshopCard({ workshop: initialWorkshop }: WorkshopCardProps) {
  const [workshop, setWorkshop] = useState(initialWorkshop);
  const [prevWorkshop, setPrevWorkshop] = useState(initialWorkshop);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [paidNet, setPaidNet] = useState(initialWorkshop.paid_net ?? 0);

  if (initialWorkshop !== prevWorkshop) {
    setPrevWorkshop(initialWorkshop);
    setWorkshop(initialWorkshop);
    setPaidNet(initialWorkshop.paid_net ?? 0);
  }

  const detailHref = getManagerWorkshopDetailRoute(workshop.id);
  const payment = resolvePaymentState(workshop.price, paidNet);

  return (
    <>
      {isEditOpen ? (
        <EditWorkshopDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          workshop={workshop}
          onWorkshopUpdated={(updated) => {
            setWorkshop(updated);
          }}
        />
      ) : null}
      {isPayOpen ? (
        <AddWorkshopPaymentDialog
          open={isPayOpen}
          onOpenChange={setIsPayOpen}
          workshopId={workshop.id}
          defaultAmount={workshop.price}
          onCreated={(created) => {
            setPaidNet((current) =>
              created.type === WORKSHOP_PAYMENT_TYPES.CREDIT
                ? current + created.amount
                : current - created.amount
            );
          }}
        />
      ) : null}
      <Card className="group relative flex h-full flex-col overflow-hidden gap-0 py-0 transition-all duration-200 hover:border-sky-400/45 hover:shadow-[0_12px_32px_rgba(14,165,233,0.16)]">
        <Link
          href={detailHref}
          aria-label={`View ${workshop.name}`}
          className="absolute inset-0 z-0 rounded-xl"
        />
        <CardHeader className="relative z-10 gap-2 border-b bg-muted/20 px-3 py-2.5 pointer-events-none">
          <div className="flex min-w-0 items-start gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300">
              <PresentationIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate text-sm leading-snug">
                {workshop.name}
              </CardTitle>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                {WORKSHOP_OFFERING_TYPE_LABELS[workshop.type]}
              </p>
            </div>
            <WorkshopStatusBadge
              status={workshop.status}
              className="shrink-0"
            />
          </div>
        </CardHeader>

        <CardContent className="relative z-10 flex items-center justify-between gap-2 px-3 py-2 pointer-events-none">
          <span
            className={cn(
              "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium",
              PAYMENT_BADGE_CLASSES[payment.state]
            )}
          >
            {payment.label}
          </span>
          <span className="truncate text-[11px] tabular-nums text-muted-foreground">
            {workshop.price == null
              ? formatPaymentPhaseMoney(paidNet)
              : `${formatPaymentPhaseMoney(paidNet)} / ${formatPaymentPhaseMoney(workshop.price)}`}
          </span>
        </CardContent>

        <CardFooter className="relative z-10 mt-auto flex items-center justify-end gap-1.5 border-t bg-muted/20 px-3 py-2 pointer-events-none">
          <Can permission={PERMISSIONS.WORKSHOPS_UPDATE}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs pointer-events-auto relative z-10 bg-background"
              aria-label={`Edit ${workshop.name}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsEditOpen(true);
              }}
            >
              <PencilIcon data-icon="inline-start" />
              Edit
            </Button>
          </Can>
          <Can permission={PERMISSIONS.WORKSHOPS_PAYMENTS_CREATE}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2.5 text-xs pointer-events-auto relative z-10 bg-background"
              aria-label={`Record payment for ${workshop.name}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsPayOpen(true);
              }}
            >
              <BanknoteIcon data-icon="inline-start" />
              Pay
            </Button>
          </Can>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs pointer-events-auto relative z-10 bg-background"
            nativeButton={false}
            render={<Link href={detailHref} />}
          >
            View
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}
