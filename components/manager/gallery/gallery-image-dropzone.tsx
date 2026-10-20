"use client";

import {
  useEffect,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { ImageIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSimulatedProgressPercent } from "@/hooks/use-simulated-progress-percent";
import {
  GALLERY_IMAGE_ACCEPT,
  GALLERY_IMAGE_MAX_BYTES,
} from "@/lib/constants/manager-gallery";
import { validateGalleryImageClientFile } from "@/lib/manager/gallery/validate-client-file";
import { cn } from "@/lib/utils";

const MAX_MB = GALLERY_IMAGE_MAX_BYTES / (1024 * 1024);

type GalleryImageDropzoneProps = {
  id: string;
  disabled?: boolean;
  /** True while the server action / submit is in flight. */
  isUploading?: boolean;
  inputKey: number;
  selectedFile: File | null;
  error?: string | null;
  optional?: boolean;
  onFileAccepted: (file: File) => void;
  onFileRejected: (error: string) => void;
  onFileCleared?: () => void;
};

function ProgressBar({
  percent,
  label,
}: {
  percent: number;
  label: string;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5 px-1">
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        aria-label={label}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {label} · {Math.round(percent)}%
      </p>
    </div>
  );
}

export function GalleryImageDropzone({
  id,
  disabled = false,
  isUploading = false,
  inputKey,
  selectedFile,
  error,
  optional = false,
  onFileAccepted,
  onFileRejected,
  onFileCleared,
}: GalleryImageDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSelectProgressActive, setIsSelectProgressActive] = useState(false);
  const [selectProgressComplete, setSelectProgressComplete] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);

  const selectProgress = useSimulatedProgressPercent(isSelectProgressActive);
  const uploadProgress = useSimulatedProgressPercent(
    isUploading && !uploadComplete
  );

  const shownSelectProgress = selectProgressComplete ? 100 : selectProgress;
  const shownUploadProgress = uploadComplete ? 100 : uploadProgress;
  const progressPercent = isUploading
    ? shownUploadProgress
    : selectedFile
      ? shownSelectProgress
      : 0;
  const showProgress =
    Boolean(selectedFile) &&
    (isUploading || isSelectProgressActive || !selectProgressComplete);
  const showPreview =
    Boolean(previewUrl) &&
    selectProgressComplete &&
    !isSelectProgressActive;

  useEffect(() => {
    if (!selectedFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear object-URL preview when file is removed
      setPreviewUrl(null);
      setIsSelectProgressActive(false);
      setSelectProgressComplete(false);
      return;
    }

    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    setSelectProgressComplete(false);
    setIsSelectProgressActive(true);
    setUploadComplete(false);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (!isSelectProgressActive || selectProgress < 92) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setIsSelectProgressActive(false);
      setSelectProgressComplete(true);
    }, 180);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isSelectProgressActive, selectProgress]);

  useEffect(() => {
    if (isUploading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirror upload start into progress UI
      setUploadComplete(false);
      return;
    }

    if (uploadProgress > 0) {
      setUploadComplete(true);
    }
  }, [isUploading, uploadProgress]);

  function applyFile(file: File | undefined) {
    if (!file) {
      onFileCleared?.();
      return;
    }

    const checked = validateGalleryImageClientFile(file);
    if (!checked.ok) {
      onFileRejected(checked.error);
      return;
    }

    onFileAccepted(file);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    applyFile(event.target.files?.[0]);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) {
      return;
    }
    setIsDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    if (disabled) {
      return;
    }
    applyFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-lg border border-dashed px-4 py-6 text-center transition-colors",
          isDragOver ? "border-primary bg-primary/5" : "border-border",
          disabled
            ? "pointer-events-none opacity-60"
            : "hover:border-primary/60",
          error ? "border-destructive/60" : null,
          showPreview ? "p-0" : null
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {showPreview && previewUrl ? (
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element -- local object URL preview */}
            <img
              src={previewUrl}
              alt={selectedFile?.name ?? "Selected image preview"}
              className="max-h-56 w-full object-contain bg-muted/40"
            />
            {isUploading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-end gap-2 bg-background/70 p-4 backdrop-blur-[1px]">
                <ProgressBar
                  percent={progressPercent}
                  label="Uploading"
                />
              </div>
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-2 border-t bg-background/90 p-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() => document.getElementById(id)?.click()}
              >
                Choose another image
              </Button>
            </div>
          </div>
        ) : selectedFile && showProgress ? (
          <div className="flex w-full flex-col items-center gap-3 py-2">
            <div
              className="relative flex h-36 w-full items-center justify-center overflow-hidden rounded-md bg-muted/50"
              aria-hidden="true"
            >
              <div className="image-skeleton-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent" />
              <ImageIcon className="relative size-8 text-muted-foreground" />
            </div>
            <ProgressBar
              percent={progressPercent}
              label={isUploading ? "Uploading" : "Preparing preview"}
            />
          </div>
        ) : (
          <>
            <UploadIcon className="size-6 text-muted-foreground" />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => document.getElementById(id)?.click()}
            >
              Choose image
            </Button>
            <p className="text-xs text-muted-foreground">
              or drag and drop here
            </p>
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP, or GIF · max {MAX_MB} MB
              {optional ? " · optional" : ""}
            </p>
          </>
        )}

        <input
          key={inputKey}
          id={id}
          type="file"
          accept={GALLERY_IMAGE_ACCEPT}
          disabled={disabled}
          className="sr-only"
          aria-invalid={!!error}
          onChange={handleInputChange}
        />
      </div>

      {selectedFile && showPreview ? (
        <p className="truncate text-xs text-muted-foreground">
          {selectedFile.name} ·{" "}
          {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
        </p>
      ) : null}

      {!selectedFile && optional ? (
        <p className="text-xs text-muted-foreground">
          Leave empty to keep the current image.
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
