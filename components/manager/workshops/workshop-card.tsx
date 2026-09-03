"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BanknoteIcon,
  CalendarDaysIcon,
  PencilIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddWorkshopPaymentDialog } from "@/components/manager/workshops/add-workshop-payment-dialog";
import { EditWorkshopDialog } from "@/components/manager/workshops/edit-workshop-dialog";
import { WorkshopSchedulesDialog } from "@/components/manager/workshops/workshop-schedules-dialog";
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
import {
  getWorkshopPaymentRemainingCap,
  isWorkshopFullyPaid,
} from "@/lib/validators/manager/workshop-payment";
import type { ManagerWorkshopRow } from "@/types/manager-workshop";

type WorkshopCardProps = {
  workshop: ManagerWorkshopRow;
};

function resolvePaymentLabel(price: number | null, paidNet: number): string {
  if (price == null || price <= 0) {
    return "No price";
  }
  if (paidNet >= price) {
    return "Paid";
  }
  if (paidNet > 0) {
    return "Partially paid";
  }
  return "Unpaid";
}

export function WorkshopCard({ workshop: initialWorkshop }: WorkshopCardProps) {
  const [workshop, setWorkshop] = useState(initialWorkshop);
  const [prevWorkshop, setPrevWorkshop] = useState(initialWorkshop);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [isSchedulesOpen, setIsSchedulesOpen] = useState(false);
  const [paidNet, setPaidNet] = useState(initialWorkshop.paid_net ?? 0);

  if (initialWorkshop !== prevWorkshop) {
    setPrevWorkshop(initialWorkshop);
    setWorkshop(initialWorkshop);
    setPaidNet(initialWorkshop.paid_net ?? 0);
  }

  const detailHref = getManagerWorkshopDetailRoute(workshop.id);
  const paymentLabel = resolvePaymentLabel(workshop.price, paidNet);
  const remainingCap = getWorkshopPaymentRemainingCap(workshop.price, paidNet);
  const fullyPaid = isWorkshopFullyPaid(workshop.price, paidNet);

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
      {isPayOpen && !fullyPaid ? (
        <AddWorkshopPaymentDialog
          open={isPayOpen}
          onOpenChange={setIsPayOpen}
          workshopId={workshop.id}
          defaultAmount={remainingCap ?? workshop.price}
          maxAmount={remainingCap}
          onCreated={(created) => {
            setPaidNet((current) =>
              created.type === WORKSHOP_PAYMENT_TYPES.CREDIT
                ? current + created.amount
                : current - created.amount
            );
          }}
        />
      ) : null}
      {isSchedulesOpen ? (
        <WorkshopSchedulesDialog
          open={isSchedulesOpen}
          onOpenChange={setIsSchedulesOpen}
          workshopId={workshop.id}
          workshopName={workshop.name}
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
          <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {paymentLabel}
          </span>
          <span className="truncate text-[11px] tabular-nums text-muted-foreground">
            {workshop.price == null
              ? formatPaymentPhaseMoney(paidNet)
              : `${formatPaymentPhaseMoney(paidNet)} / ${formatPaymentPhaseMoney(workshop.price)}`}
          </span>
        </CardContent>

        <CardFooter className="relative z-10 mt-auto flex items-center gap-1.5 border-t bg-muted/20 px-3 py-2 pointer-events-none">
          <Can permission={PERMISSIONS.WORKSHOPS_UPDATE}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 flex-1 px-2.5 text-xs pointer-events-auto relative z-10 bg-background"
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
          <Can permission={PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 flex-1 px-2.5 text-xs pointer-events-auto relative z-10 bg-background"
              aria-label={`View schedules for ${workshop.name}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setIsSchedulesOpen(true);
              }}
            >
              <CalendarDaysIcon data-icon="inline-start" />
              Schedules
            </Button>
          </Can>
          <Can permission={PERMISSIONS.WORKSHOPS_PAYMENTS_CREATE}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 flex-1 px-2.5 text-xs pointer-events-auto relative z-10 bg-background"
              aria-label={
                fullyPaid
                  ? `${workshop.name} is already paid`
                  : `Record payment for ${workshop.name}`
              }
              disabled={fullyPaid}
              title={fullyPaid ? "Already paid" : undefined}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (fullyPaid) {
                  return;
                }
                setIsPayOpen(true);
              }}
            >
              <BanknoteIcon data-icon="inline-start" />
              {fullyPaid ? "Paid" : "Pay"}
            </Button>
          </Can>
        </CardFooter>
      </Card>
    </>
  );
}
