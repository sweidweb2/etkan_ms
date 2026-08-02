"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react";
import { Can } from "@/components/auth/can";
import { AddWorkshopDialog } from "@/components/manager/workshops/add-workshop-dialog";
import { WorkshopCard } from "@/components/manager/workshops/workshop-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MANAGER_WORKSHOP_STATUS_LABELS,
} from "@/lib/constants/manager-workshop-display";
import {
  WORKSHOP_STATUS_VALUES,
  type WorkshopStatusValue,
} from "@/lib/constants/manager-workshop-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import type { ManagerWorkshopRow } from "@/types/manager-workshop";

const PAGE_SIZE = 12;
const STATUS_ALL = "all";

type StatusFilter = typeof STATUS_ALL | WorkshopStatusValue;

function matchesSearch(workshop: ManagerWorkshopRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    workshop.name,
    workshop.subject ?? "",
    workshop.delivery_place ?? "",
    workshop.target_audience ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

type ManageWorkshopsPanelProps = {
  initialWorkshops: ManagerWorkshopRow[];
};

export function ManageWorkshopsPanel({
  initialWorkshops,
}: ManageWorkshopsPanelProps) {
  const router = useRouter();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(STATUS_ALL);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return initialWorkshops.filter((workshop) => {
      if (statusFilter !== STATUS_ALL && workshop.status !== statusFilter) {
        return false;
      }
      return matchesSearch(workshop, search);
    });
  }, [initialWorkshops, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Manage workshops
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create and manage workshop offerings.
          </p>
        </div>
        <Can permission={PERMISSIONS.WORKSHOPS_CREATE}>
          <Button
            type="button"
            className="shrink-0"
            onClick={() => setIsCreateOpen(true)}
          >
            <PlusIcon data-icon="inline-start" />
            Create workshop
          </Button>
        </Can>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search workshops…"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter((value as StatusFilter) ?? STATUS_ALL);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
            {WORKSHOP_STATUS_VALUES.map((status) => (
              <SelectItem key={status} value={status}>
                {MANAGER_WORKSHOP_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {pageItems.length === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
          No workshops match your filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {pageItems.map((workshop) => (
            <WorkshopCard key={workshop.id} workshop={workshop} />
          ))}
        </div>
      )}

      {filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {(safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filtered.length)} of{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Next
              <ChevronRightIcon data-icon="inline-end" />
            </Button>
          </div>
        </div>
      ) : null}

      <AddWorkshopDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onWorkshopCreated={() => router.refresh()}
      />
    </div>
  );
}
