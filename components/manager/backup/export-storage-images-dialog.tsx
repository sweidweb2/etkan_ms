"use client";

import { useRef, useState } from "react";
import JSZip from "jszip";
import { ImagesIcon } from "lucide-react";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { PendingFlowChecklist } from "@/components/loaders/pending-flow-checklist";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePendingAwareOpenChange } from "@/hooks/use-pending-aware-open-change";
import { BACKUP_STORAGE_BUCKET_LABELS } from "@/lib/constants/backup-storage";
import { downloadBlob } from "@/lib/export/download-blob";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { truncateText } from "@/lib/utils/truncate-text";
import type {
  BackupStorageImageFile,
  BackupStorageImageList,
} from "@/types/backup-storage";

const FLOW_STEPS = [
  { id: "scan", label: "Scan storage buckets" },
  { id: "download", label: "Download images" },
  { id: "pack", label: "Pack ZIP archive" },
  { id: "save", label: "Save ZIP to your computer" },
] as const;

const DOWNLOAD_CONCURRENCY = 3;

type ExportStatus = "idle" | "running" | "success" | "error" | "cancelled";

type ExportStorageImagesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function createStorageImagesZipName() {
  const dateStamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `backup-storage-images-${dateStamp}.zip`;
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

export function ExportStorageImagesDialog({
  open,
  onOpenChange,
}: ExportStorageImagesDialogProps) {
  const abortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<ExportStatus>("idle");
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<BackupStorageImageList["buckets"]>([]);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
    failed: 0,
  });

  const isPending = status === "running";
  const handleOpenChange = usePendingAwareOpenChange(isPending, (nextOpen) => {
    if (!nextOpen) {
      abortRef.current?.abort();
      abortRef.current = null;
      setStatus("idle");
      setActiveIndex(0);
      setError(null);
      setSummary([]);
      setCurrentFile(null);
      setProgress({ completed: 0, total: 0, failed: 0 });
    }
    onOpenChange(nextOpen);
  });

  const progressPercent =
    progress.total === 0
      ? 0
      : Math.round((progress.completed / progress.total) * 100);
  const checklistIndex =
    status === "success" ? FLOW_STEPS.length : activeIndex;

  async function downloadFilesIntoZip(
    files: BackupStorageImageFile[],
    zip: JSZip,
    signal: AbortSignal
  ) {
    let nextIndex = 0;
    let completed = 0;
    let failed = 0;

    async function worker() {
      while (nextIndex < files.length) {
        if (signal.aborted) {
          throw new DOMException("The export was cancelled.", "AbortError");
        }

        const current = nextIndex;
        nextIndex += 1;
        const file = files[current];
        if (!file) {
          continue;
        }

        setCurrentFile(`${file.bucket}/${file.path}`);

        try {
          const params = new URLSearchParams({
            bucket: file.bucket,
            path: file.path,
          });
          const response = await fetch(
            `/api/manager/backup/storage-images/file?${params.toString()}`,
            { signal }
          );

          if (!response.ok) {
            failed += 1;
          } else {
            const blob = await response.blob();
            zip.file(`${file.bucket}/${file.path}`, blob);
          }
        } catch (caught) {
          if (signal.aborted) {
            throw caught;
          }
          failed += 1;
        }

        completed += 1;
        setProgress({ completed, total: files.length, failed });
      }
    }

    const workerCount = Math.min(DOWNLOAD_CONCURRENCY, files.length);
    await Promise.all(
      Array.from({ length: workerCount }, () => worker())
    );

    return failed;
  }

  async function startExport() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("running");
    setError(null);
    setSummary([]);
    setCurrentFile(null);
    setProgress({ completed: 0, total: 0, failed: 0 });
    setActiveIndex(0);

    try {
      const listResponse = await fetch("/api/manager/backup/storage-images", {
        signal: controller.signal,
      });

      if (!listResponse.ok) {
        throw new Error(
          await readErrorMessage(listResponse, "Unable to scan storage.")
        );
      }

      const listing = (await listResponse.json()) as BackupStorageImageList;
      setSummary(listing.buckets);

      const listingFailed =
        listing.buckets.length > 0 &&
        listing.buckets.every((bucket) => bucket.error);

      if (listingFailed) {
        throw new Error(
          listing.buckets[0]?.error ?? "Unable to scan storage."
        );
      }
      setProgress({
        completed: 0,
        total: listing.files.length,
        failed: 0,
      });

      if (listing.files.length === 0) {
        setActiveIndex(FLOW_STEPS.length);
        setStatus("success");
        showSuccessToast("No images were found in storage.");
        return;
      }

      setActiveIndex(1);
      const zip = new JSZip();
      const failedCount = await downloadFilesIntoZip(
        listing.files,
        zip,
        controller.signal
      );

      if (failedCount === listing.files.length) {
        throw new Error("Unable to download storage images.");
      }

      setCurrentFile(null);
      setActiveIndex(2);
      const zipBlob = await zip.generateAsync({ type: "blob" });

      setActiveIndex(3);
      const fileName = createStorageImagesZipName();
      downloadBlob({ blob: zipBlob, filename: fileName });

      setActiveIndex(FLOW_STEPS.length);
      setStatus("success");

      if (failedCount > 0) {
        showSuccessToast(
          "Storage images ZIP downloaded.",
          `${listing.files.length - failedCount} saved, ${failedCount} skipped.`
        );
      } else {
        showSuccessToast("Storage images ZIP downloaded.", fileName);
      }
    } catch (caught) {
      if (controller.signal.aborted) {
        setStatus("cancelled");
        setError("Export cancelled.");
        return;
      }

      const message =
        caught instanceof Error
          ? caught.message
          : "Unable to export storage images.";
      setStatus("error");
      setError(message);
      showErrorToast(message);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        showCloseButton={!isPending}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagesIcon className="size-4 text-muted-foreground" />
            Export storage images
          </DialogTitle>
          <DialogDescription>
            Collects image files from the projects, workshops, and registration
            buckets, then downloads them as one ZIP. PDFs and other files are
            skipped. This can take a while if storage is large.
          </DialogDescription>
        </DialogHeader>

        <form
          className="contents"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isPending) {
              void startExport();
            }
          }}
        >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagesIcon className="size-4 text-muted-foreground" />
            Export storage images
          </DialogTitle>
          <DialogDescription>
            Collects image files from the projects, workshops, and registration
            buckets, then downloads them as one ZIP. PDFs and other files are
            skipped. This can take a while if storage is large.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {status === "idle" ? (
            <ul className="rounded-lg border bg-muted/40 p-3 text-sm">
              {Object.entries(BACKUP_STORAGE_BUCKET_LABELS).map(
                ([bucket, label]) => (
                  <li
                    key={bucket}
                    className="flex items-center justify-between py-1"
                  >
                    <span>{label}</span>
                    <span className="text-xs text-muted-foreground">
                      {bucket}
                    </span>
                  </li>
                )
              )}
            </ul>
          ) : (
            <div className="flex flex-col gap-3">
              <PendingFlowChecklist
                steps={FLOW_STEPS}
                activeIndex={checklistIndex}
              />

              {summary.length > 0 ? (
                <ul className="grid gap-1 text-xs text-muted-foreground">
                  {summary.map((bucket) => (
                    <li key={bucket.bucket}>
                      {bucket.label}:{" "}
                      {bucket.error
                        ? bucket.error
                        : `${bucket.fileCount} image${
                            bucket.fileCount === 1 ? "" : "s"
                          }`}
                    </li>
                  ))}
                </ul>
              ) : null}

              {isPending && progress.total > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPercent}
                    aria-label="Image download progress"
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {progress.completed} of {progress.total} images
                    {progress.failed > 0 ? ` · ${progress.failed} skipped` : ""}
                  </p>
                  {currentFile ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {truncateText(currentFile, 64).display}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}
        </div>

          <DialogFooter>
            {isPending ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Close
              </Button>
            )}
            <Button type="submit" disabled={isPending}>
              {isPending ? <InlineSpinner /> : <ImagesIcon aria-hidden />}
              {status === "success" ? "Export again" : "Start export"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
