"use client";

import { useState } from "react";
import { showErrorToast } from "@/lib/toast";

type SignedUrlResult = {
  success?: boolean;
  signedUrl?: string;
  error?: string;
};

/**
 * Busy-state helper for open/download via a signed-URL action.
 * Shared by attachment and student-upload panels.
 */
export function useTaskFileSignedUrl() {
  const [busy, setBusy] = useState<{
    id: string;
    mode: "open" | "download";
  } | null>(null);

  async function runSignedUrlAction(
    id: string,
    mode: "open" | "download",
    fetchResult: () => Promise<SignedUrlResult>,
    fileName?: string
  ) {
    setBusy({ id, mode });
    try {
      const result = await fetchResult();
      if (!result.success || !result.signedUrl) {
        showErrorToast(
          result.error ??
            (mode === "download"
              ? "Unable to download file."
              : "Unable to open file.")
        );
        return;
      }

      if (mode === "open") {
        const opened = window.open(
          result.signedUrl,
          "_blank",
          "noopener,noreferrer"
        );
        // Popup blockers return null — fall back to a user-gesture <a> click.
        if (!opened) {
          const anchor = document.createElement("a");
          anchor.href = result.signedUrl;
          anchor.target = "_blank";
          anchor.rel = "noopener noreferrer";
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
        }
        return;
      }

      const response = await fetch(result.signedUrl);
      if (!response.ok) {
        showErrorToast("Unable to download file.");
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = fileName || "download";
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      showErrorToast(
        mode === "download" ? "Unable to download file." : "Unable to open file."
      );
    } finally {
      setBusy(null);
    }
  }

  return { busy, runSignedUrlAction };
}
