"use client";

import { useMemo, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  MessageSquareTextIcon,
  SearchIcon,
} from "lucide-react";
import { CronJobDetailsDialog } from "@/components/manager/cron-jobs/cron-job-details-dialog";
import { UserStatCard } from "@/components/manager/users/user-stat-card";
import { PanelPageHeader } from "@/components/panels/panel-page-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CRON_JOB_FREQUENCY_LABELS,
  CRON_JOB_STATUS_BADGE_CLASSES,
  CRON_JOB_STATUS_LABELS,
  CRON_JOB_TABLE_LIMITS,
} from "@/lib/constants/manager-cron-job-display";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import { truncateText } from "@/lib/utils/truncate-text";
import {
  CRON_JOB_FREQUENCIES,
  CRON_JOB_FREQUENCY_VALUES,
  CRON_JOB_STATUSES,
  type ManagerCronJobRow,
} from "@/types/manager-cron-job";

const PAGE_SIZE = 10;
const FREQUENCY_FILTER_ALL = "all";

type ManageCronJobsPanelProps = {
  initialJobs: ManagerCronJobRow[];
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
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            className={cn("block cursor-default truncate", className)}
            tabIndex={0}
          />
        }
      >
        {display}
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  );
}

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  for (let offset = -1; offset <= 1; offset += 1) {
    const page = currentPage + offset;
    if (page > 1 && page < totalPages) {
      pages.add(page);
    }
  }

  const sortedPages = [...pages].sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];

  sortedPages.forEach((page, index) => {
    const previousPage = sortedPages[index - 1];
    if (previousPage !== undefined && page - previousPage > 1) {
      result.push("ellipsis");
    }
    result.push(page);
  });

  return result;
}

function matchesSearch(job: ManagerCronJobRow, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    job.job_name,
    job.summary,
    job.function_name,
    job.schedule,
    job.schedule_label,
    ...job.tables,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

export function ManageCronJobsPanel({ initialJobs }: ManageCronJobsPanelProps) {
  const [jobs] = useState(initialJobs);
  const [searchQuery, setSearchQuery] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState(FREQUENCY_FILTER_ALL);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<ManagerCronJobRow | null>(
    null
  );

  const stats = useMemo(
    () => ({
      total: jobs.length,
      active: jobs.filter((job) => job.status === CRON_JOB_STATUSES.ACTIVE)
        .length,
      daily: jobs.filter((job) => job.frequency === CRON_JOB_FREQUENCIES.DAILY)
        .length,
      other: jobs.filter((job) => job.frequency !== CRON_JOB_FREQUENCIES.DAILY)
        .length,
    }),
    [jobs]
  );

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesFrequency =
        frequencyFilter === FREQUENCY_FILTER_ALL ||
        job.frequency === frequencyFilter;

      return matchesFrequency && matchesSearch(job, searchQuery);
    });
  }, [jobs, searchQuery, frequencyFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedJobs = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredJobs.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredJobs, safeCurrentPage]);

  const pageNumbers = getPageNumbers(safeCurrentPage, totalPages);
  const rangeStart =
    filteredJobs.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(
    safeCurrentPage * PAGE_SIZE,
    filteredJobs.length
  );

  const frequencySelectItems = [
    { value: FREQUENCY_FILTER_ALL, label: "All frequencies" },
    ...CRON_JOB_FREQUENCY_VALUES.map((frequency) => ({
      value: frequency,
      label: CRON_JOB_FREQUENCY_LABELS[frequency],
    })),
  ];

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFrequencyFilterChange = (value: string | null) => {
    setFrequencyFilter(value ?? FREQUENCY_FILTER_ALL);
    setCurrentPage(1);
  };

  return (
    <TooltipProvider>
      <CronJobDetailsDialog
        job={selectedJob}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJob(null);
          }
        }}
      />

      <div className="flex flex-col gap-6">
        <PanelPageHeader title="Cron jobs" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href={ROUTES.MANAGER_SETTINGS}>
                Settings
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Cron jobs</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid gap-4 @lg/panel:grid-cols-2 @4xl/panel:grid-cols-4">
          <UserStatCard
            label="Total jobs"
            value={stats.total}
            accentClassName="border-l-sky-500"
          />
          <UserStatCard
            label="Active"
            value={stats.active}
            accentClassName="border-l-emerald-500"
          />
          <UserStatCard
            label="Daily"
            value={stats.daily}
            accentClassName="border-l-violet-500"
          />
          <UserStatCard
            label="Other frequencies"
            value={stats.other}
            accentClassName="border-l-amber-500"
          />
        </div>

        <Card className="py-0">
          <CardHeader className="border-b bg-muted/40 py-3">
            <CardTitle>Scheduled jobs</CardTitle>
            <CardDescription>
              {filteredJobs.length} job{filteredJobs.length === 1 ? "" : "s"}
              {searchQuery || frequencyFilter !== FREQUENCY_FILTER_ALL
                ? " matching filters"
                : " in catalog"}
              .
            </CardDescription>
          </CardHeader>

          <CardContent className="px-0 pb-0">
            <div className="flex flex-col gap-3 border-b px-4 py-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
              <div className="relative w-full @lg/panel:max-w-sm">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search name, summary, function, tables…"
                  className="pl-8"
                  aria-label="Search cron jobs"
                />
              </div>

              <Select
                value={frequencyFilter}
                items={frequencySelectItems}
                onValueChange={handleFrequencyFilterChange}
              >
                <SelectTrigger
                  className="w-full @lg/panel:w-44"
                  aria-label="Filter by frequency"
                >
                  <SelectValue placeholder="All frequencies" />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value={FREQUENCY_FILTER_ALL}>
                    All frequencies
                  </SelectItem>
                  {CRON_JOB_FREQUENCY_VALUES.map((frequency) => (
                    <SelectItem key={frequency} value={frequency}>
                      {CRON_JOB_FREQUENCY_LABELS[frequency]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {paginatedJobs.length === 0 ? (
              <EmptyState
                size="sm"
                className="m-4"
                icon={jobs.length === 0 ? ClockIcon : SearchIcon}
                title={
                  jobs.length === 0
                    ? "No cron jobs yet"
                    : "No cron jobs match the current filters"
                }
                description={
                  jobs.length === 0
                    ? "Scheduled jobs will appear here."
                    : "Try a different search or frequency filter."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[52rem] text-left text-sm">
                  <thead className="border-b bg-muted/30 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Job name</th>
                      <th className="px-4 py-3 font-medium">Schedule</th>
                      <th className="px-4 py-3 font-medium">Summary</th>
                      <th className="px-4 py-3 font-medium">Tables</th>
                      <th className="px-4 py-3 font-medium">Frequency</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="border-b last:border-b-0 hover:bg-muted/20"
                      >
                        <td className="max-w-[12rem] px-4 py-3 font-mono text-xs">
                          <TruncatedCell
                            value={job.job_name}
                            maxLength={CRON_JOB_TABLE_LIMITS.jobName}
                          />
                        </td>
                        <td className="max-w-[9rem] px-4 py-3">
                          <TruncatedCell
                            value={job.schedule_label}
                            maxLength={CRON_JOB_TABLE_LIMITS.schedule}
                          />
                        </td>
                        <td className="max-w-[16rem] px-4 py-3 text-muted-foreground">
                          <TruncatedCell
                            value={job.summary}
                            maxLength={CRON_JOB_TABLE_LIMITS.summary}
                          />
                        </td>
                        <td className="max-w-[12rem] px-4 py-3 text-muted-foreground">
                          <TruncatedCell
                            value={job.tables.join(", ")}
                            maxLength={CRON_JOB_TABLE_LIMITS.tables}
                          />
                        </td>
                        <td className="px-4 py-3">
                          {CRON_JOB_FREQUENCY_LABELS[job.frequency]}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                              CRON_JOB_STATUS_BADGE_CLASSES[job.status]
                            )}
                          >
                            {CRON_JOB_STATUS_LABELS[job.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`View details for ${job.job_name}`}
                            onClick={() => setSelectedJob(job)}
                          >
                            <MessageSquareTextIcon className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredJobs.length > 0 ? (
              <div className="flex flex-col gap-3 border-t px-4 pt-2 pb-3 @lg/panel:flex-row @lg/panel:items-center @lg/panel:justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {rangeStart}–{rangeEnd} of {filteredJobs.length}
                </p>

                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setCurrentPage((page) => page - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeftIcon />
                  </Button>

                  {pageNumbers.map((page, index) =>
                    page === "ellipsis" ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-1 text-sm text-muted-foreground"
                      >
                        …
                      </span>
                    ) : (
                      <Button
                        key={page}
                        type="button"
                        variant={
                          page === safeCurrentPage ? "default" : "outline"
                        }
                        size="icon-sm"
                        className="min-w-7"
                        onClick={() => setCurrentPage(page)}
                        aria-label={`Page ${page}`}
                        aria-current={
                          page === safeCurrentPage ? "page" : undefined
                        }
                      >
                        {page}
                      </Button>
                    )
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setCurrentPage((page) => page + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRightIcon />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
