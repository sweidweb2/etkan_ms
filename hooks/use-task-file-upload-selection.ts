"use client";

import { useRef, useState } from "react";
import { formatUploadFileSize } from "@/lib/classes/student-task-upload-format";

/**
 * Shared selection/error/key state for task-file dropzones across
 * attachments, student uploads, and student self-upload panels.
 */
export function useTaskFileUploadSelection(maxBytes: number) {
  const maxMb = Math.round(maxBytes / (1024 * 1024));
  const fileInputKeyRef = useRef(0);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  function resetSelection() {
    setSelectedFileName(null);
    setClientError(null);
    fileInputKeyRef.current += 1;
    setFileInputKey(fileInputKeyRef.current);
  }

  function beginFile(file: File): "too_large" | "ok" {
    setClientError(null);
    if (file.size > maxBytes) {
      setSelectedFileName(file.name);
      setClientError(
        `This file is ${formatUploadFileSize(file.size)}. Files must be under ${maxMb} MB.`
      );
      return "too_large";
    }
    setSelectedFileName(file.name);
    return "ok";
  }

  return {
    maxMb,
    fileInputKey,
    selectedFileName,
    clientError,
    setClientError,
    resetSelection,
    beginFile,
  };
}
