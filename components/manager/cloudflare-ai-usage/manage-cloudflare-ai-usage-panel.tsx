"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MessageSquareTextIcon,
  RefreshCwIcon,
  SearchIcon,
} from "lucide-react";
import { CloudflareAiUsageAnalytics } from "@/components/manager/cloudflare-ai-usage/cloudflare-ai-usage-analytics";
import { CloudflareAiUsageDetailsDialog } from "@/components/manager/cloudflare-ai-usage/cloudflare-ai-usage-details-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { ManagerCloudflareAiUsageRow } from "@/types/manager-cloudflare-ai-usage";

const PAGE_SIZE = 10;
const STATUS_ALL = "all";

type ManageCloudflareAiUsagePanelProps = {
  initialRecords: ManagerCloudflareAiUsageRow[];
};

function formatTokens(value: number | null) {
  if (value == null) {
    return "—";
  }
  return value.toLocaleString();
}

function statusClassName(status: ManagerCloudflareAiUsageRow["status"]) {
  if (status === "success") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  }
  if (status === "refused") {
    return "bg-amber-500/15 text-amber-800 dark:text-amber-300";
  }
  return "bg-rose-500/15 text-rose-700 dark:text-rose-400";
}

export function ManageCloudflareAiUsagePanel({
  initialRecords,
}: ManageCloudflareAiUsagePanelProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_ALL);
  const [page, setPage] = useState(1);
  const [selected, setSelected] =
    useState<ManagerCloudflareAiUsageRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return initialRecords.filter((record) => {
      if (statusFilter !== STATUS_ALL && record.status !== statusFilter) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = [
        record.user_label,
        record.feature,
        record.model,
        record.error_message ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [initialRecords, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  function handleRefresh() {
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cloudflare Workers AI requests logged from manager assistants.
        </p>
      </div>

      <CloudflareAiUsageAnalytics records={initialRecords} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search user, feature, model…"
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value: string | null) => {
            setStatusFilter(value ?? STATUS_ALL);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_ALL}>All statuses</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="refused">Refused</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Refresh usage table"
          title="Refresh"
          disabled={isRefreshing}
          onClick={handleRefresh}
        >
          <RefreshCwIcon className={cn(isRefreshing && "animate-spin")} />
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left text-muted-foreground">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Feature</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Tokens</th>
                <th className="px-4 py-3 font-medium">
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {initialRecords.length === 0
                      ? "No AI usage recorded yet."
                      : "No records match your filters."}
                  </td>
                </tr>
              ) : (
                pageItems.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-4 py-3 align-top whitespace-nowrap text-foreground">
                      {format(
                        new Date(record.created_at),
                        "MMM d, yyyy h:mm a"
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {record.user_label}
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-xs">
                      {record.feature}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          statusClassName(record.status)
                        )}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top tabular-nums text-muted-foreground">
                      {formatTokens(record.total_tokens)}
                      <span className="mt-0.5 block text-[11px]">
                        in {formatTokens(record.prompt_tokens)} / out{" "}
                        {formatTokens(record.completion_tokens)}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="View usage details"
                        onClick={() => setSelected(record)}
                      >
                        <MessageSquareTextIcon />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

      <CloudflareAiUsageDetailsDialog
        record={selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
      />
    </div>
  );
}
