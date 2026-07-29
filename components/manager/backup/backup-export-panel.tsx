"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Download, MessageSquareTextIcon } from "lucide-react";
import { FieldLabel } from "@/components/auth/field-label";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BACKUP_TABLE_LABELS,
  BACKUP_TABLES,
  type BackupTableName,
} from "@/lib/constants/backup-tables";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import type { BackupHistoryEntry } from "@/types/backup-history";

type PendingExportScope = "table" | "all" | null;
type BackupExportPanelProps = {
  initialHistory: BackupHistoryEntry[];
};

function getFilenameFromDisposition(headerValue: string | null) {
  if (!headerValue) {
    return null;
  }

  const match = headerValue.match(/filename="(.+)"/i);
  return match?.[1] ?? null;
}

async function downloadBackupFile(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    let message = "Unable to export backup.";

    try {
      const errorBody = (await response.json()) as { message?: string };
      if (errorBody.message) {
        message = errorBody.message;
      }
    } catch {
      // Ignore malformed error payloads and fall back to the generic message.
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const filename =
    getFilenameFromDisposition(response.headers.get("content-disposition")) ??
    "backup.json";
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);

  return filename;
}

function formatBackupDate(value: string) {
  return format(new Date(value), "MMM d, yyyy 'at' h:mm a");
}

export function BackupExportPanel({ initialHistory }: BackupExportPanelProps) {
  const router = useRouter();
  const [selectedTable, setSelectedTable] = useState<BackupTableName>(
    BACKUP_TABLES[0]
  );
  const [pendingScope, setPendingScope] = useState<PendingExportScope>(null);
  const [pendingHistoryExportId, setPendingHistoryExportId] = useState<
    string | null
  >(null);
  const [detailsEntry, setDetailsEntry] = useState<BackupHistoryEntry | null>(
    null
  );
  const [scopeFilter, setScopeFilter] = useState<"all" | "table" | "full">(
    "all"
  );
  const [keywordFilter, setKeywordFilter] = useState<string>("");
  const [pageSize, setPageSize] = useState<5 | 8 | 12>(8);
  const [page, setPage] = useState(1);

  const dummyHistory: BackupHistoryEntry[] = [
    {
      id: "dummy-1",
      scope: "table",
      tableName: "student_profiles",
      fileName: "backup-student_profiles-2026-07-08T12-00-00Z.json",
      rowCount: 42,
      tableCount: 1,
      createdAt: "2026-07-08T12:00:00.000Z",
      createdByLabel: "Manager",
    },
    {
      id: "dummy-2",
      scope: "table",
      tableName: "subjects",
      fileName: "backup-subjects-2026-07-08T13-15-00Z.json",
      rowCount: 18,
      tableCount: 1,
      createdAt: "2026-07-08T13:15:00.000Z",
      createdByLabel: "Admin",
    },
    {
      id: "dummy-3",
      scope: "all",
      tableName: null,
      fileName: "backup-all-tables-2026-07-08T14-30-00Z.json",
      rowCount: 320,
      tableCount: BACKUP_TABLES.length,
      createdAt: "2026-07-08T14:30:00.000Z",
      createdByLabel: "Manager",
    },
  ];

  const displayHistory = initialHistory.length ? initialHistory : dummyHistory;

  const filteredHistory = displayHistory.filter((entry) => {
    const scopeMatches =
      scopeFilter === "all"
        ? true
        : scopeFilter === "table"
          ? entry.scope === "table"
          : entry.scope === "all";

    if (!scopeMatches) {
      return false;
    }

    const keyword = keywordFilter.trim().toLowerCase();
    if (!keyword) {
      return true;
    }

    const tableLabel = entry.tableName
      ? BACKUP_TABLE_LABELS[entry.tableName as BackupTableName] ??
        entry.tableName
      : "all tables";

    return (
      entry.fileName.toLowerCase().includes(keyword) ||
      entry.createdByLabel.toLowerCase().includes(keyword) ||
      tableLabel.toLowerCase().includes(keyword)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedHistory = filteredHistory.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  function truncateText(value: string, maxChars: number) {
    const normalized = value ?? "";
    if (normalized.length <= maxChars) {
      return normalized;
    }

    return `${normalized.slice(0, maxChars - 1)}…`;
  }

  const tableOptions = useMemo(
    () =>
      BACKUP_TABLES.map((tableName) => ({
        value: tableName,
        label: BACKUP_TABLE_LABELS[tableName],
      })),
    []
  );

  async function handleTableExport() {
    try {
      setPendingScope("table");
      const fileName = await downloadBackupFile(
        `/api/manager/backup?table=${selectedTable}`
      );

      showSuccessToast("Table export completed.", fileName);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to export table.";
      showErrorToast(message);
    } finally {
      setPendingScope(null);
    }
  }

  async function handleDatabaseExport() {
    try {
      setPendingScope("all");
      const fileName = await downloadBackupFile("/api/manager/backup");

      showSuccessToast("Full database export completed.", fileName);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to export database.";
      showErrorToast(message);
    } finally {
      setPendingScope(null);
    }
  }

  function getEntryReexportUrl(entry: BackupHistoryEntry) {
    if (entry.scope === "table") {
      if (!entry.tableName) {
        return `/api/manager/backup`;
      }

      return `/api/manager/backup?table=${entry.tableName}`;
    }

    return `/api/manager/backup`;
  }

  async function handleHistoryExport(entry: BackupHistoryEntry) {
    try {
      setPendingHistoryExportId(entry.id);
      const url = getEntryReexportUrl(entry);
      const fileName = await downloadBackupFile(url);

      showSuccessToast("Backup re-export completed.", fileName);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to re-export backup.";
      showErrorToast(message);
    } finally {
      setPendingHistoryExportId(null);
    }
  }

  const isTableExportPending = pendingScope === "table";
  const isDatabaseExportPending = pendingScope === "all";

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Backup</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Export one table when you need a focused backup, or export every table
          in one file for a full database snapshot.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(28rem,1fr)_minmax(0,22rem)]">
        <Card className="h-fit py-0">
          <CardHeader className="border-b bg-muted/40 py-3">
            <CardTitle>Backup History</CardTitle>
            <CardDescription>
              Recent export activity for this backup page.
            </CardDescription>
          </CardHeader>
          <CardContent className="py-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex flex-col gap-2 w-full">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Filter
                  </span>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Select value={scopeFilter} onValueChange={(v) => {
                      if (!v) return;
                      setScopeFilter(v as "all" | "table" | "full");
                      setPage(1);
                    }}>
                      <SelectTrigger className="w-full sm:w-36">
                        <SelectValue placeholder="Scope" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="table">Tables</SelectItem>
                        <SelectItem value="full">Full DB</SelectItem>
                      </SelectContent>
                    </Select>

                    <Input
                      value={keywordFilter}
                      onChange={(e) => {
                        setKeywordFilter(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Search filename / creator / table"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {filteredHistory.length ? (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-muted-foreground">
                      <th className="px-3 py-1 font-medium">Export</th>
                      <th className="px-1 py-1 font-medium text-right">Re-export</th>
                      <th className="px-1 py-1 font-medium text-right">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/80">
                    {pagedHistory.map((entry) => {
                      const tableLabel = entry.tableName
                        ? BACKUP_TABLE_LABELS[
                            entry.tableName as BackupTableName
                          ] ?? entry.tableName
                        : "All tables";

                      const fileNameShort = truncateText(entry.fileName, 44);
                      const scopeLineShort =
                        entry.scope === "table"
                          ? truncateText(
                              `Table export: ${tableLabel}`,
                              52
                            )
                          : "Full database export";

                      return (
                        <tr key={entry.id} className="bg-muted/20">
                          <td className="px-3 py-2 align-top">
                            <p className="font-medium">
                              {scopeLineShort}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {truncateText(entry.createdByLabel, 28)} •{" "}
                              {formatBackupDate(entry.createdAt)}
                            </p>
                            <p className="mt-1 text-[12px] text-muted-foreground">
                              {fileNameShort}
                            </p>
                          </td>
                          <td className="px-1 py-2 align-middle text-right">
                            <Can permission={PERMISSIONS.BACKUP_DOWNLOAD}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-xs"
                                aria-label="Re-export backup"
                                onClick={() => handleHistoryExport(entry)}
                                disabled={pendingHistoryExportId !== null}
                                className="text-primary hover:bg-primary/10 hover:text-primary"
                              >
                                {pendingHistoryExportId === entry.id ? (
                                  <InlineSpinner />
                                ) : (
                                  <Download className="size-4" aria-hidden />
                                )}
                              </Button>
                            </Can>
                          </td>
                          <td className="px-1 py-2 align-middle text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              aria-label="View export details"
                              onClick={() => setDetailsEntry(entry)}
                              className="text-primary hover:bg-primary/10 hover:text-primary"
                            >
                              <MessageSquareTextIcon className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4">
                <p className="text-sm font-medium">No backups yet</p>
              </div>
              )}

              {filteredHistory.length ? (
                <div className="-mx-4 -mb-4 flex flex-col gap-2 border-t bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Showing{" "}
                    {Math.min((safePage - 1) * pageSize + 1, filteredHistory.length)} -
                    {Math.min(safePage * pageSize, filteredHistory.length)} of{" "}
                    {filteredHistory.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Select value={String(pageSize)} onValueChange={(v) => {
                      if (!v) return;
                      const next = Number(v) as 5 | 8 | 12;
                      setPageSize(next);
                      setPage(1);
                    }}>
                      <SelectTrigger className="w-20">
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="8">8</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      type="button"
                      variant="default"
                      size="xs"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                    >
                      Prev
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="xs"
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safePage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="py-0">
            <CardHeader className="border-b bg-muted/40 py-3">
              <CardTitle>Export One Table</CardTitle>
              <CardDescription>
                Download a JSON backup for a single table from the database.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 py-4">
              <div className="flex flex-col gap-2">
                <FieldLabel
                  htmlFor="backup-table"
                  label="Table"
                  hint="Choose one table to export"
                />
                <Select
                  value={selectedTable}
                  onValueChange={(value) => {
                    if (!value) {
                      return;
                    }

                    setSelectedTable(value as BackupTableName);
                  }}
                >
                  <SelectTrigger id="backup-table" className="w-full">
                    <SelectValue placeholder="Select a table" />
                  </SelectTrigger>
                  <SelectContent>
                    {tableOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/40">
              <Can permission={PERMISSIONS.BACKUP_EXPORT_TABLE}>
                <Button
                  type="button"
                  onClick={handleTableExport}
                  disabled={pendingScope !== null}
                >
                  {isTableExportPending ? (
                    <InlineSpinner />
                  ) : (
                    <Download aria-hidden />
                  )}
                  Export selected table
                </Button>
              </Can>
            </CardFooter>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b bg-muted/40 py-3">
              <CardTitle>Export All Tables</CardTitle>
              <CardDescription>
                Download one JSON file that contains every backup-enabled table.
              </CardDescription>
            </CardHeader>
            <CardFooter className="bg-muted/40">
              <Can permission={PERMISSIONS.BACKUP_EXPORT_FULL}>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleDatabaseExport}
                  disabled={pendingScope !== null}
                >
                  {isDatabaseExportPending ? (
                    <InlineSpinner />
                  ) : (
                    <Download aria-hidden />
                  )}
                  Export full database
                </Button>
              </Can>
            </CardFooter>
          </Card>
        </div>
      </div>

      <Dialog
        open={detailsEntry !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailsEntry(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareTextIcon className="size-4 text-muted-foreground" />
              Export details
            </DialogTitle>
            <DialogDescription>
              Full information about this backup export transaction.
            </DialogDescription>
          </DialogHeader>

          {detailsEntry ? (
            <div className="max-h-[min(60vh,28rem)] overflow-y-auto pr-1">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Scope
                  </dt>
                  <dd className="text-sm text-foreground">
                    {detailsEntry.scope === "table"
                      ? "Single table"
                      : "All tables"}
                  </dd>
                </div>

                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Created by
                  </dt>
                  <dd className="text-sm text-foreground">
                    {detailsEntry.createdByLabel}
                  </dd>
                </div>

                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Created at
                  </dt>
                  <dd className="text-sm text-foreground">
                    {formatBackupDate(detailsEntry.createdAt)}
                  </dd>
                </div>

                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    File name
                  </dt>
                  <dd className="text-sm text-foreground break-all">
                    {detailsEntry.fileName}
                  </dd>
                </div>

                <div className="flex flex-col gap-1 sm:col-span-2">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Table information
                  </dt>
                  <dd className="text-sm text-foreground">
                    {detailsEntry.scope === "table" ? (
                      <>
                        Table: {detailsEntry.tableName ?? "—"}
                        <br />
                        Rows: {detailsEntry.rowCount}
                      </>
                    ) : (
                      <>
                        Tables: {detailsEntry.tableCount}
                        <br />
                        Rows: {detailsEntry.rowCount}
                      </>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          ) : null}

          <DialogFooter className="mt-4 bg-muted/40 sm:justify-end">
            <Button
              type="button"
              onClick={() => setDetailsEntry(null)}
              variant="default"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
