"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronDownIcon, Download, FolderArchive, MessageSquareTextIcon } from "lucide-react";
import { FieldLabel } from "@/components/auth/field-label";
import { Can } from "@/components/auth/can";
import { ExportStorageImagesDialog } from "@/components/manager/backup/export-storage-images-dialog";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  BACKUP_EXPORT_FORMAT_LABELS,
  BACKUP_EXPORT_FORMAT_VALUES,
  type BackupExportFormat,
} from "@/lib/constants/backup-formats";
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
    "backup";
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

function buildBackupExportUrl(
  format: BackupExportFormat,
  tableName?: string | null
) {
  const params = new URLSearchParams({ format });
  if (tableName) {
    params.set("table", tableName);
  }

  return `/api/manager/backup?${params.toString()}`;
}

function BackupExportMenu({
  label,
  pending,
  disabled,
  align = "start",
  variant = "default",
  size,
  iconOnly = false,
  ariaLabel,
  className,
  onSelectFormat,
}: {
  label?: string;
  pending: boolean;
  disabled: boolean;
  align?: "start" | "end";
  variant?: "default" | "ghost";
  size?: "icon-xs";
  iconOnly?: boolean;
  ariaLabel: string;
  className?: string;
  onSelectFormat: (format: BackupExportFormat) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size={size}
          disabled={disabled}
          aria-label={ariaLabel}
          aria-haspopup="menu"
          className={className}
        >
          {pending ? (
            <InlineSpinner />
          ) : (
            <Download className={iconOnly ? "size-4" : undefined} aria-hidden />
          )}
          {label}
          {iconOnly ? null : <ChevronDownIcon data-icon="inline-end" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-44">
        <DropdownMenuLabel>File format</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {BACKUP_EXPORT_FORMAT_VALUES.map((format) => (
          <DropdownMenuItem
            key={format}
            disabled={disabled}
            onSelect={() => onSelectFormat(format)}
          >
            {BACKUP_EXPORT_FORMAT_LABELS[format]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
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
  const [isStorageExportOpen, setIsStorageExportOpen] = useState(false);
  const [scopeFilter, setScopeFilter] = useState<"all" | "table" | "full">(
    "all"
  );
  const [keywordFilter, setKeywordFilter] = useState<string>("");
  const [pageSize, setPageSize] = useState<5 | 8 | 12>(8);
  const [page, setPage] = useState(1);

  const filteredHistory = initialHistory.filter((entry) => {
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

  async function handleTableExport(format: BackupExportFormat) {
    try {
      setPendingScope("table");
      const fileName = await downloadBackupFile(
        buildBackupExportUrl(format, selectedTable)
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

  async function handleDatabaseExport(format: BackupExportFormat) {
    try {
      setPendingScope("all");
      const fileName = await downloadBackupFile(buildBackupExportUrl(format));

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

  async function handleHistoryExport(
    entry: BackupHistoryEntry,
    format: BackupExportFormat
  ) {
    try {
      setPendingHistoryExportId(entry.id);
      const fileName = await downloadBackupFile(
        buildBackupExportUrl(
          format,
          entry.scope === "table" ? entry.tableName : null
        )
      );

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
          Export tables as JSON, SQL, or CSV, or collect every image in
          Supabase storage into a ZIP.
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
                              <BackupExportMenu
                                pending={pendingHistoryExportId === entry.id}
                                disabled={pendingHistoryExportId !== null}
                                variant="ghost"
                                size="icon-xs"
                                iconOnly
                                align="end"
                                ariaLabel="Re-export backup"
                                className="text-primary hover:bg-primary/10 hover:text-primary"
                                onSelectFormat={(format) =>
                                  handleHistoryExport(entry, format)
                                }
                              />
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
                Download a JSON, SQL, or CSV backup for a single table.
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
                <BackupExportMenu
                  label="Export selected table"
                  pending={isTableExportPending}
                  disabled={pendingScope !== null}
                  ariaLabel="Export selected table"
                  onSelectFormat={handleTableExport}
                />
              </Can>
            </CardFooter>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b bg-muted/40 py-3">
              <CardTitle>Export All Tables</CardTitle>
              <CardDescription>
                Download every public table row as JSON, SQL inserts, or a ZIP
                of CSVs.
              </CardDescription>
            </CardHeader>
            <CardFooter className="bg-muted/40">
              <Can permission={PERMISSIONS.BACKUP_EXPORT_FULL}>
                <BackupExportMenu
                  label="Export full database"
                  pending={isDatabaseExportPending}
                  disabled={pendingScope !== null}
                  ariaLabel="Export full database"
                  onSelectFormat={handleDatabaseExport}
                />
              </Can>
            </CardFooter>
          </Card>

          <Card className="gap-0 py-0">
            <CardHeader className="border-b bg-muted/40 py-3">
              <CardTitle>Export Storage Files</CardTitle>
              <CardDescription>
                Download every file from projects, blogs, authors, workshops,
                registration, and student task uploads.
              </CardDescription>
            </CardHeader>
            <CardFooter className="bg-muted/40">
              <Can
                anyOf={[
                  PERMISSIONS.BACKUP_EXPORT_STORAGE,
                  PERMISSIONS.BACKUP_EXPORT_FULL,
                ]}
              >
                <Button
                  type="button"
                  variant="default"
                  onClick={() => setIsStorageExportOpen(true)}
                  disabled={pendingScope !== null}
                >
                  <FolderArchive aria-hidden />
                  Export storage files
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

      <ExportStorageImagesDialog
        open={isStorageExportOpen}
        onOpenChange={setIsStorageExportOpen}
      />
    </div>
  );
}
