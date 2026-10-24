"use client";

import { useEffect, useRef, useState } from "react";
import { FieldLabel } from "@/components/auth/field-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSimulatedProgressPercent } from "@/hooks/use-simulated-progress-percent";
import { CLASS_COVER_ACCEPT } from "@/lib/manager/classes/class-cover-file";
import { optimizeClassCoverInBrowser } from "@/lib/manager/classes/optimize-class-cover-client";

type ClassCoverFieldProps = {
  inputId: string;
  active: boolean;
  disabled: boolean;
  isUploading: boolean;
  uploadComplete: boolean;
  currentImageUrl?: string | null;
  currentImageAlt?: string;
  allowRemove?: boolean;
  onChange: (value: {
    file: File | null;
    removed: boolean;
    isOptimizing: boolean;
  }) => void;
};

export function ClassCoverField({
  inputId,
  active,
  disabled,
  isUploading,
  uploadComplete,
  currentImageUrl,
  currentImageAlt = "Class cover",
  allowRemove = false,
  onChange,
}: ClassCoverFieldProps) {
  const previewUrlRef = useRef<string | null>(null);
  const requestRef = useRef(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [prepareComplete, setPrepareComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prepareProgress = useSimulatedProgressPercent(isOptimizing);
  const uploadProgress = useSimulatedProgressPercent(isUploading && !uploadComplete);
  const shownPrepareProgress = prepareComplete ? 100 : prepareProgress;
  const shownUploadProgress = uploadComplete ? 100 : uploadProgress;
  const progressPercent = isUploading || uploadComplete
    ? shownUploadProgress
    : fileName
      ? shownPrepareProgress
      : 0;
  const showProgress = Boolean(fileName) || isUploading || uploadComplete;
  const showCurrent =
    Boolean(currentImageUrl) && !removed && !previewUrl;

  function revokePreview() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }

  function resetField() {
    revokePreview();
    setPreviewUrl(null);
    setFileName(null);
    setRemoved(false);
    setIsOptimizing(false);
    setPrepareComplete(false);
    setError(null);
  }

  useEffect(() => {
    if (active) {
      return;
    }
    requestRef.current += 1;
    // Reset only when the dialog closes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear local cover UI when dialog closes
    resetField();
    onChange({ file: null, removed: false, isOptimizing: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on active close
  }, [active]);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  async function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!nextFile) {
      return;
    }

    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    revokePreview();
    setPreviewUrl(null);
    setFileName(nextFile.name);
    setRemoved(false);
    setPrepareComplete(false);
    setError(null);
    setIsOptimizing(true);
    onChange({ file: null, removed: false, isOptimizing: true });

    const result = await optimizeClassCoverInBrowser(nextFile);
    if (requestId !== requestRef.current) {
      if (result.ok) {
        URL.revokeObjectURL(result.previewUrl);
      }
      return;
    }

    setIsOptimizing(false);

    if (!result.ok) {
      setFileName(null);
      setError(result.error);
      onChange({ file: null, removed: false, isOptimizing: false });
      return;
    }

    previewUrlRef.current = result.previewUrl;
    setPreviewUrl(result.previewUrl);
    setPrepareComplete(true);
    onChange({ file: result.file, removed: false, isOptimizing: false });
  }

  function onRemove() {
    revokePreview();
    setPreviewUrl(null);
    setFileName(null);
    setPrepareComplete(false);
    setError(null);
    setRemoved(true);
    onChange({ file: null, removed: true, isOptimizing: false });
  }

  return (
    <div className="flex flex-col gap-2">
      <FieldLabel htmlFor={inputId} label="Cover image" hint="Optional" />
      {showCurrent ? (
        <img
          src={currentImageUrl ?? undefined}
          alt={currentImageAlt}
          className="h-28 w-full rounded-md object-cover"
        />
      ) : null}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Cover preview"
          className="h-28 w-full rounded-md object-cover"
        />
      ) : null}
      <Input
        id={inputId}
        type="file"
        accept={CLASS_COVER_ACCEPT}
        disabled={disabled || isOptimizing}
        onChange={(event) => {
          void onFileChange(event);
        }}
      />
      {fileName ? (
        <p className="truncate text-xs text-muted-foreground">{fileName}</p>
      ) : null}
      {showProgress ? (
        <div className="flex flex-col gap-1.5">
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercent)}
            aria-label={
              isUploading || uploadComplete
                ? "Upload progress"
                : "File preparation progress"
            }
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {isUploading || uploadComplete
              ? `Uploading… ${Math.round(progressPercent)}%`
              : prepareComplete
                ? "Ready to upload"
                : `Preparing… ${Math.round(progressPercent)}%`}
          </p>
        </div>
      ) : null}
      {allowRemove && showCurrent ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={disabled || isOptimizing}
          onClick={onRemove}
        >
          Remove cover
        </Button>
      ) : null}
      {removed && !previewUrl ? (
        <p className="text-xs text-muted-foreground">
          Cover will be removed when you save.
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
