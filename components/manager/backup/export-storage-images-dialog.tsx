"use client";

import { useRef, useState } from "react";
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
import type { BackupStorageImageList } from "@/types/backup-storage";

const FLOW_STEPS = [
  { id: "scan", label: "Scan storage buckets" },
  { id: "pack", label: "Pack ZIP archive on server" },
  { id: "save", label: "Save ZIP to your computer" },
] as const;

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
      setProgress({ completed: 0, total: 0, failed: 0 });
    }
    onOpenChange(nextOpen);
  });

  const progressPercent =
    progress.total === 0
      ? activeIndex >= FLOW_STEPS.length
        ? 100
        : Math.round((activeIndex / FLOW_STEPS.length) * 100)
      : Math.round((progress.completed / progress.total) * 100);
  const checklistIndex =
    status === "success" ? FLOW_STEPS.length : activeIndex;

  async function startExport() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStatus("running");
    setError(null);
    setSummary([]);
    setProgress({ completed: 0, total: 0, failed: 0 });
    setActiveIndex(0);

    try {
      setActiveIndex(1);
      const zipResponse = await fetch("/api/manager/backup/storage-images/zip", {
        signal: controller.signal,
      });

      if (!zipResponse.ok) {
        throw new Error(
          await readErrorMessage(zipResponse, "Unable to export storage images.")
        );
      }

      const imageCount = Number(
        zipResponse.headers.get("X-Backup-Image-Count") ?? "0"
      );
      const failedCount = Number(
        zipResponse.headers.get("X-Backup-Image-Failed") ?? "0"
      );

      setProgress({
        completed: imageCount,
        total: imageCount,
        failed: failedCount,
      });

      if (imageCount === 0) {
        setActiveIndex(FLOW_STEPS.length);
        setStatus("success");
        showSuccessToast("No images were found in storage.");
        return;
      }

      const zipBlob = await zipResponse.blob();
      const fileName = createStorageImagesZipName();

      setActiveIndex(2);
      downloadBlob({ blob: zipBlob, filename: fileName });

      setActiveIndex(FLOW_STEPS.length);
      setStatus("success");

      if (failedCount > 0) {
        showSuccessToast(
          "Storage images ZIP downloaded.",
          `${imageCount - failedCount} saved, ${failedCount} skipped.`
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
            Scans image files in the projects, workshops, and registration
            buckets on the server, packs them into one ZIP, and downloads it.
            PDFs and other files are skipped.
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
          <div className="space-y-4">
            <PendingFlowChecklist
              steps={FLOW_STEPS}
              activeIndex={checklistIndex}
            />

            {summary.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {summary.map((bucket) => (
                  <li key={bucket.bucket}>
                    {BACKUP_STORAGE_BUCKET_LABELS[bucket.bucket] ?? bucket.label}:{" "}
                    {bucket.error
                      ? bucket.error
                      : `${bucket.fileCount} image${bucket.fileCount === 1 ? "" : "s"}`}
                  </li>
                ))}
              </ul>
            ) : null}

            {isPending ? (
              <div className="space-y-2">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  {activeIndex < 2
                    ? "Building ZIP on the server…"
                    : "Saving ZIP to your computer…"}
                </p>
              </div>
            ) : null}

            {error ? (
              <p className="text-sm text-destructive">{error}</p>
            ) : null}
          </div>

          <DialogFooter>
            {isPending ? (
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            ) : (
              <Button type="submit">
                {status === "success" ? "Export again" : "Export ZIP"}
              </Button>
            )}
            {isPending ? (
              <Button type="button" disabled>
                <InlineSpinner />
                Exporting…
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
