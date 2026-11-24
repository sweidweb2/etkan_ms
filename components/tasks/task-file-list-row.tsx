"use client";

import type { ReactNode } from "react";
import {
  DownloadIcon,
  ExternalLinkIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { FileTypeLogo } from "@/components/ui/file-type-logo";
import { getStudentTaskUploadFormat } from "@/lib/classes/student-task-upload-format";
import { cn } from "@/lib/utils";

type TaskFileListRowProps = {
  fileName: string;
  mimeType?: string | null;
  meta?: ReactNode;
  errorMessage?: string | null;
  isUploading?: boolean;
  uploadProgress?: number;
  isOpening?: boolean;
  isDownloading?: boolean;
  canOpen?: boolean;
  canDownload?: boolean;
  canDelete?: boolean;
  isDeletePending?: boolean;
  isConfirmingDelete?: boolean;
  onOpen?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onCancelUpload?: () => void;
  onDismissError?: () => void;
  onCancelConfirmDelete?: () => void;
  className?: string;
};

export function TaskFileListRow({
  fileName,
  mimeType = "",
  meta,
  errorMessage,
  isUploading = false,
  uploadProgress = 0,
  isOpening = false,
  isDownloading = false,
  canOpen = false,
  canDownload = false,
  canDelete = false,
  isDeletePending = false,
  isConfirmingDelete = false,
  onOpen,
  onDownload,
  onDelete,
  onCancelUpload,
  onDismissError,
  onCancelConfirmDelete,
  className,
}: TaskFileListRowProps) {
  const format = getStudentTaskUploadFormat(mimeType ?? "", fileName);
  const hasError = Boolean(errorMessage);

  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-border/60 px-3 py-2.5 sm:px-4",
        hasError && "bg-destructive/5",
        className
      )}
    >
      <FileTypeLogo
        kind={format.kind}
        label={format.label}
        className="size-9"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" title={fileName}>
          {fileName}
        </p>
        {hasError ? (
          <p className="mt-0.5 text-xs text-destructive">{errorMessage}</p>
        ) : isUploading ? (
          <div className="mt-1.5 flex items-center gap-2">
            <div
              className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(uploadProgress)}
              aria-label="Upload progress"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
                style={{ width: `${Math.max(uploadProgress, 8)}%` }}
              />
            </div>
            <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
              {Math.round(uploadProgress)}%
            </span>
          </div>
        ) : meta ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{meta}</div>
        ) : null}
        {isConfirmingDelete && !isDeletePending ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-destructive">Delete this file?</span>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={onDelete}
            >
              Delete
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onCancelConfirmDelete}
            >
              Cancel
            </Button>
          </div>
        ) : null}
      </div>

      {isUploading && onCancelUpload ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground"
          aria-label="Cancel upload"
          onClick={onCancelUpload}
        >
          <XIcon />
        </Button>
      ) : hasError && onDismissError ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground"
          aria-label="Dismiss"
          onClick={onDismissError}
        >
          <XIcon />
        </Button>
      ) : (
        <div className="flex shrink-0 items-center gap-0.5">
          {canOpen ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={`Open ${fileName}`}
              disabled={isOpening || isDownloading || isDeletePending}
              onClick={onOpen}
            >
              {isOpening ? (
                <InlineSpinner className="size-3.5" />
              ) : (
                <ExternalLinkIcon />
              )}
            </Button>
          ) : null}
          {canDownload ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground"
              aria-label={`Download ${fileName}`}
              disabled={isOpening || isDownloading || isDeletePending}
              onClick={onDownload}
            >
              {isDownloading ? (
                <InlineSpinner className="size-3.5" />
              ) : (
                <DownloadIcon />
              )}
            </Button>
          ) : null}
          {canDelete ? (
            <>
              {canOpen || canDownload ? (
                <span
                  aria-hidden
                  className="mx-0.5 hidden h-4 w-px bg-border sm:block"
                />
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground hover:text-destructive"
                aria-label={
                  isConfirmingDelete
                    ? `Confirm delete ${fileName}`
                    : `Delete ${fileName}`
                }
                disabled={isDeletePending || isOpening || isDownloading}
                onClick={onDelete}
              >
                {isDeletePending && isConfirmingDelete ? (
                  <InlineSpinner className="size-3.5" />
                ) : (
                  <Trash2Icon />
                )}
              </Button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
