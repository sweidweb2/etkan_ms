"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PencilIcon, PresentationIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { EditWorkshopDialog } from "@/components/manager/workshops/edit-workshop-dialog";
import { WorkshopStatusBadge } from "@/components/manager/workshops/workshop-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WORKSHOP_OFFERING_TYPE_LABELS } from "@/lib/constants/manager-workshop-display";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { getManagerWorkshopDetailRoute } from "@/lib/constants/routes";
import type { ManagerWorkshopRow } from "@/types/manager-workshop";

type WorkshopCardProps = {
  workshop: ManagerWorkshopRow;
};

export function WorkshopCard({ workshop: initialWorkshop }: WorkshopCardProps) {
  const router = useRouter();
  const [workshop, setWorkshop] = useState(initialWorkshop);
  const [prevWorkshop, setPrevWorkshop] = useState(initialWorkshop);
  const [isEditOpen, setIsEditOpen] = useState(false);

  if (initialWorkshop !== prevWorkshop) {
    setPrevWorkshop(initialWorkshop);
    setWorkshop(initialWorkshop);
  }

  const detailHref = getManagerWorkshopDetailRoute(workshop.id);

  return (
    <>
      {isEditOpen ? (
        <EditWorkshopDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          workshop={workshop}
          onWorkshopUpdated={(updated) => {
            setWorkshop(updated);
            router.refresh();
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
