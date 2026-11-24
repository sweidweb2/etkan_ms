"use client";

import { useState, type DragEvent } from "react";
import { CloudUploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TaskFileDropzoneProps = {
  inputId: string;
  accept: string;
  disabled?: boolean;
  hint: string;
  onFile: (file: File) => void;
  className?: string;
};

export function TaskFileDropzone({
  inputId,
  accept,
  disabled = false,
  hint,
  onFile,
  className,
}: TaskFileDropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (disabled) {
      return;
    }
    setIsDragOver(true);
  }

  function handleDragLeave(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragOver(false);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragOver(false);
    if (disabled) {
      return;
    }
    const file = event.dataTransfer.files?.[0] ?? null;
    if (file) {
      onFile(file);
    }
  }

  return (
    <label
      htmlFor={inputId}
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border px-4 py-5 text-center transition-[border-color,background-color] duration-150",
        isDragOver && "border-primary bg-primary/5",
        !isDragOver && "hover:border-primary/50 hover:bg-muted/30",
        disabled && "pointer-events-none cursor-not-allowed opacity-60",
        className
      )}
    >
      <span className="mb-2 flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <CloudUploadIcon className="size-5" aria-hidden />
      </span>
      <p className="text-sm text-foreground">
        Drag files here or{" "}
        <span className="font-medium text-primary">browse</span>
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      <input
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          event.target.value = "";
          if (file) {
            onFile(file);
          }
        }}
      />
    </label>
  );
}
