"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDaysIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoreHorizontalIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
} from "lucide-react";
import {
  Tabs as TabsPrimitive,
  TabsList as TabsListPrimitive,
  TabsTrigger as TabsTriggerPrimitive,
} from "@/components/animate-ui/primitives/animate/tabs";
import { Can } from "@/components/auth/can";
import { AddWorkshopDialog } from "@/components/manager/workshops/add-workshop-dialog";
import { WorkshopCard } from "@/components/manager/workshops/workshop-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  WORKSHOP_OFFERING_TYPE_LABELS,
  WORKSHOP_OFFERING_TYPES,
  type WorkshopOfferingType,
} from "@/lib/constants/manager-workshop-display";
import {
  WORKSHOP_STATUS_VALUES,
  type WorkshopStatusValue,
} from "@/lib/constants/manager-workshop-status";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { ManagerWorkshopRow } from "@/types/manager-workshop";

const PAGE_SIZE = 12;
const STATUS_ALL = "all";

const TYPE_TAB_ORDER = [
  WORKSHOP_OFFERING_TYPES.WORKSHOP,
  WORKSHOP_OFFERING_TYPES.ONLINE,
  WORKSHOP_OFFERING_TYPES.COURSE,
] as const satisfies readonly WorkshopOfferingType[];

type StatusFilter = typeof STATUS_ALL | WorkshopStatusValue;

const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

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
    workshop.phone ?? "",
    workshop.type,
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
  const [typeTab, setTypeTab] = useState<WorkshopOfferingType>(
    WORKSHOP_OFFERING_TYPES.WORKSHOP
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(STATUS_ALL);
  const [page, setPage] = useState(1);

  const typeCounts = useMemo(() => {
    const counts: Record<WorkshopOfferingType, number> = {
      workshop: 0,
      online: 0,
      course: 0,
    };
    for (const workshop of initialWorkshops) {
      counts[workshop.type] += 1;
    }
    return counts;
  }, [initialWorkshops]);

  const filtered = useMemo(() => {
    return initialWorkshops.filter((workshop) => {
      if (workshop.type !== typeTab) {
        return false;
      }
      if (statusFilter !== STATUS_ALL && workshop.status !== statusFilter) {
        return false;
      }
      return matchesSearch(workshop, search);
    });
  }, [initialWorkshops, search, statusFilter, typeTab]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const typeLabel = WORKSHOP_OFFERING_TYPE_LABELS[typeTab];
  const typeLabelPlural =
    typeTab === WORKSHOP_OFFERING_TYPES.ONLINE
      ? "online offerings"
      : `${typeLabel.toLowerCase()}s`;

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Workshop actions"
            >
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <Can permission={PERMISSIONS.WORKSHOPS_PAYMENTS_VIEW}>
              <DropdownMenuItem asChild>
                <Link href={ROUTES.MANAGER_WORKSHOPS_PAYMENTS}>
                  <ReceiptIcon />
                  Total payments
                </Link>
              </DropdownMenuItem>
            </Can>
            <Can permission={PERMISSIONS.INSTRUCTOR_SCHEDULES_VIEW}>
              <DropdownMenuItem asChild>
                <Link href={ROUTES.MANAGER_INSTRUCTOR_SCHEDULES}>
                  <CalendarDaysIcon />
                  View schedule
                </Link>
              </DropdownMenuItem>
            </Can>
            <Can permission={PERMISSIONS.WORKSHOPS_CREATE}>
              <DropdownMenuItem onClick={() => setIsCreateOpen(true)}>
                <PlusIcon />
                Create workshop
              </DropdownMenuItem>
            </Can>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TabsPrimitive
        value={typeTab}
        onValueChange={(value) => {
          setTypeTab(value as WorkshopOfferingType);
          setPage(1);
        }}
        className="flex flex-col gap-3"
      >
        <TabsListPrimitive className="mx-auto flex h-auto w-full flex-wrap items-center justify-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 sm:w-fit">
          {TYPE_TAB_ORDER.map((type) => (
            <TabsTriggerPrimitive
              key={type}
              value={type}
              className={TAB_TRIGGER_CLASS}
            >
              {type === WORKSHOP_OFFERING_TYPES.WORKSHOP
                ? "Workshops"
                : WORKSHOP_OFFERING_TYPE_LABELS[type]}
              <span className="ml-1.5 rounded-md bg-muted px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                {typeCounts[type]}
              </span>
            </TabsTriggerPrimitive>
          ))}
        </TabsListPrimitive>
      </TabsPrimitive>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder={`Search ${typeLabelPlural}…`}
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
          {typeCounts[typeTab] === 0 ? (
            <>
              <p>No {typeLabelPlural} yet.</p>
              <Can permission={PERMISSIONS.WORKSHOPS_CREATE}>
                <p className="mt-1">
                  Create a {typeLabel.toLowerCase()} to get started.
                </p>
              </Can>
            </>
          ) : (
            <p>No {typeLabelPlural} match your filters.</p>
          )}
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
