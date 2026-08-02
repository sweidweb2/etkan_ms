"use client";

import Link from "next/link";
import { format } from "date-fns";
import { CalendarIcon, MapPinIcon, PresentationIcon } from "lucide-react";
import { WorkshopStatusBadge } from "@/components/manager/workshops/workshop-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getManagerWorkshopDetailRoute } from "@/lib/constants/routes";
import type { ManagerWorkshopRow } from "@/types/manager-workshop";

type WorkshopCardProps = {
  workshop: ManagerWorkshopRow;
};

function formatMoney(value: number | null) {
  if (value == null) {
    return "—";
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) {
    return "Dates TBD";
  }
  const startLabel = start ? format(new Date(start), "MMM d, yyyy") : "—";
  const endLabel = end ? format(new Date(end), "MMM d, yyyy") : "—";
  return `${startLabel} → ${endLabel}`;
}

export function WorkshopCard({ workshop }: WorkshopCardProps) {
  const detailHref = getManagerWorkshopDetailRoute(workshop.id);

  return (
    <Card className="group relative flex h-full cursor-pointer flex-col overflow-hidden gap-0 py-0 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-400/60 hover:shadow-[0_16px_36px_rgba(14,165,233,0.22)]">
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
              {workshop.subject ?? "No subject"}
            </p>
          </div>
          <WorkshopStatusBadge
            status={workshop.status}
            className="shrink-0 text-[10px]"
          />
        </div>
      </CardHeader>

      <CardContent className="relative z-10 flex flex-1 flex-col gap-1.5 px-3 py-2.5 pointer-events-none">
        <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px]">
          <CalendarIcon className="size-3 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            Schedule
          </span>
          <span className="shrink-0 font-medium text-foreground">
            {formatDateRange(workshop.start_date, workshop.end_date)}
          </span>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5 text-[11px]">
          <MapPinIcon className="size-3 shrink-0 text-primary" />
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            Place
          </span>
          <span className="max-w-[9rem] shrink-0 truncate font-medium text-foreground">
            {workshop.delivery_place ?? "—"}
          </span>
        </div>
        <div className="rounded-md border border-border bg-background px-2 py-1.5 text-[11px]">
          <span className="text-muted-foreground">Price </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatMoney(workshop.price)}
          </span>
        </div>
      </CardContent>

      <CardFooter className="relative z-10 mt-auto flex items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2 pointer-events-none">
        <span className="text-[11px] text-muted-foreground">
          {format(new Date(workshop.created_at), "MMM d, yyyy")}
        </span>
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
  );
}
