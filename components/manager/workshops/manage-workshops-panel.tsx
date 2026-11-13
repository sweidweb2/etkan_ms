"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  CalendarDaysIcon,
  CalendarIcon,
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
import { loadWorkshopsPageAction } from "@/app/manager/workshops/actions";
import { AddWorkshopDialog } from "@/components/manager/workshops/add-workshop-dialog";
import { WorkshopCard } from "@/components/manager/workshops/workshop-card";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
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
import { showErrorToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import type {
  ManagerWorkshopsListData,
  ManagerWorkshopsListQuery,
  ManagerWorkshopTypeCounts,
} from "@/types/manager-workshop";

const PAGE_SIZE = 12;
const STATUS_ALL = "all";

const TYPE_TAB_ORDER = [
  WORKSHOP_OFFERING_TYPES.WORKSHOP,
  WORKSHOP_OFFERING_TYPES.COURSE,
  WORKSHOP_OFFERING_TYPES.PRIVATE,
] as const satisfies readonly WorkshopOfferingType[];

type StatusFilter = typeof STATUS_ALL | WorkshopStatusValue;

const INITIAL_SHOW_COMPLETED: Record<WorkshopOfferingType, boolean> = {
  workshop: true,
  private: true,
  course: true,
};

const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 sm:px-4 sm:text-sm",
  "border-transparent text-muted-foreground hover:border-border/60 hover:bg-background/80 hover:text-foreground hover:shadow-sm",
  "data-[state=active]:border-border data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-md",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
);

function listQueryKey(query: {
  type: WorkshopOfferingType;
  status: StatusFilter;
  showCompleted: boolean;
  search: string;
  page: number;
}) {
  return `${query.type}|${query.status}|${query.showCompleted}|${query.search}|${query.page}`;
}

type ManageWorkshopsPanelProps = {
  initialData: ManagerWorkshopsListData;
};

export function ManageWorkshopsPanel({
  initialData,
}: ManageWorkshopsPanelProps) {
  const [workshops, setWorkshops] = useState(initialData.workshops);
  const [totalCount, setTotalCount] = useState(initialData.totalCount);
  const [typeCounts, setTypeCounts] = useState<ManagerWorkshopTypeCounts>(
    initialData.typeCounts
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [typeTab, setTypeTab] = useState<WorkshopOfferingType>(
    WORKSHOP_OFFERING_TYPES.WORKSHOP
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(STATUS_ALL);
  const [showCompletedByType, setShowCompletedByType] = useState(
    INITIAL_SHOW_COMPLETED
  );
  const [page, setPage] = useState(initialData.page);
  const loadedKeyRef = useRef(
    listQueryKey({
      type: WORKSHOP_OFFERING_TYPES.WORKSHOP,
      status: STATUS_ALL,
      showCompleted: true,
      search: "",
      page: initialData.page,
    })
  );

  const showCompleted = showCompletedByType[typeTab];
  const pageSize = initialData.pageSize || PAGE_SIZE;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const listQuery = useMemo<ManagerWorkshopsListQuery>(
    () => ({
      page,
      pageSize,
      type: typeTab,
      status: statusFilter === STATUS_ALL ? null : statusFilter,
      showCompleted,
      search: debouncedSearch,
    }),
    [debouncedSearch, page, pageSize, showCompleted, statusFilter, typeTab]
  );

  useEffect(() => {
    const key = listQueryKey({
      type: typeTab,
      status: statusFilter,
      showCompleted,
      search: debouncedSearch,
      page,
    });
    if (key === loadedKeyRef.current) {
      return;
    }
    loadedKeyRef.current = key;
    let cancelled = false;
    setIsLoading(true);
    void loadWorkshopsPageAction(listQuery).then((data) => {
      if (cancelled) {
        return;
      }
      setIsLoading(false);
      if (!data) {
        showErrorToast("Unable to load workshops.");
        return;
      }
      setWorkshops(data.workshops);
      setTotalCount(data.totalCount);
      setTypeCounts(data.typeCounts);
    });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, listQuery, page, showCompleted, statusFilter, typeTab]);

  const showCompletedCheckboxId = `show-completed-${typeTab}`;
  const typeLabel = WORKSHOP_OFFERING_TYPE_LABELS[typeTab];
  const typeLabelPlural =
    typeTab === WORKSHOP_OFFERING_TYPES.PRIVATE
      ? "private offerings"
      : `${typeLabel.toLowerCase()}s`;

  return (
    <div className="flex flex-col gap-6">
      <PanelPageHeader title="Manage workshops" />
      <div className="flex flex-wrap items-center justify-end gap-2 empty:hidden">
        <Can permission={PERMISSIONS.WORKSHOPS_CREATE}>
          <Button type="button" onClick={() => setIsCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add workshop
          </Button>
        </Can>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
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
        <TabsListPrimitive className="mx-auto flex h-auto w-full flex-wrap items-center justify-center gap-2 rounded-full bg-muted/60 p-1 ring-1 ring-foreground/8 @lg/panel:w-fit">
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

      <div className="flex flex-col gap-3 @lg/panel:flex-row @lg/panel:items-center">
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
          <SelectTrigger className="w-full @lg/panel:w-48">
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
        <label
          htmlFor={showCompletedCheckboxId}
          className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-muted-foreground"
        >
          <Checkbox
            id={showCompletedCheckboxId}
            checked={showCompleted}
            onCheckedChange={(checked) => {
              setShowCompletedByType((current) => ({
                ...current,
                [typeTab]: checked,
              }));
              setPage(1);
            }}
            aria-label={`Show completed ${typeLabelPlural}`}
          />
          Show completed
        </label>
      </div>

      {workshops.length === 0 ? (
        <EmptyState
          icon={typeCounts[typeTab] === 0 ? CalendarIcon : SearchIcon}
          title={
            typeCounts[typeTab] === 0
              ? `No ${typeLabelPlural} yet`
              : `No ${typeLabelPlural} match your filters`
          }
          description={
            typeCounts[typeTab] === 0
              ? `Create a ${typeLabel.toLowerCase()} to get started.`
              : "Try a different search or status."
          }
        >
          {typeCounts[typeTab] === 0 ? (
            <Can permission={PERMISSIONS.WORKSHOPS_CREATE}>
              <Button type="button" onClick={() => setIsCreateOpen(true)}>
                <PlusIcon data-icon="inline-start" />
                Add {typeLabel.toLowerCase()}
              </Button>
            </Can>
          ) : null}
        </EmptyState>
      ) : (
        <div
          className={cn(
            "grid gap-3 @lg/panel:grid-cols-2 @2xl/panel:grid-cols-3 @4xl/panel:grid-cols-4",
            isLoading && "opacity-60"
          )}
        >
          {workshops.map((workshop) => (
            <WorkshopCard key={workshop.id} workshop={workshop} />
          ))}
        </div>
      )}

      {totalCount > pageSize ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {(page - 1) * pageSize + 1}–
            {Math.min(page * pageSize, totalCount)} of {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeftIcon data-icon="inline-start" />
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isLoading || page * pageSize >= totalCount}
              onClick={() =>
                setPage((current) => current + 1)
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
        onWorkshopCreated={(workshop) => {
          const nextShowCompleted = showCompletedByType[workshop.type];
          setTypeTab(workshop.type);
          setSearch("");
          setDebouncedSearch("");
          setStatusFilter(STATUS_ALL);
          setPage(1);
          loadedKeyRef.current = listQueryKey({
            type: workshop.type,
            status: STATUS_ALL,
            showCompleted: nextShowCompleted,
            search: "",
            page: 1,
          });
          setIsLoading(true);
          void loadWorkshopsPageAction({
            page: 1,
            pageSize,
            type: workshop.type,
            status: null,
            showCompleted: nextShowCompleted,
            search: "",
          }).then((data) => {
            setIsLoading(false);
            if (!data) {
              showErrorToast("Unable to load workshops.");
              return;
            }
            setWorkshops(data.workshops);
            setTotalCount(data.totalCount);
            setTypeCounts(data.typeCounts);
          });
        }}
      />
    </div>
  );
}
