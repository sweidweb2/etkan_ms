"use client";

import { useState } from "react";
import { FolderArchiveIcon } from "lucide-react";
import { Can } from "@/components/auth/can";
import { InlineSpinner } from "@/components/loaders/inline-spinner";
import { Button } from "@/components/ui/button";
import { PERMISSIONS } from "@/lib/constants/permissions";
import { downloadBlob } from "@/lib/export/download-blob";
import { getStudentTaskUploadsZipFilename } from "@/lib/export/student-task-uploads-zip";
import { showErrorToast, showSuccessToast } from "@/lib/toast";

type ExportStudentTaskUploadsButtonProps = {
  taskId: string;
  taskTitle: string;
};

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const body = (await response.json()) as { message?: string };
    return body.message ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Queues a server-side ZIP export of every student's uploads for this task.
 */
export function ExportStudentTaskUploadsButton({
  taskId,
  taskTitle,
}: ExportStudentTaskUploadsButtonProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleExport() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(
        `/api/classes/tasks/${taskId}/uploads/zip`
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Unable to export student uploads."
          )
        );
      }

      const fileCount = Number(response.headers.get("X-Export-File-Count") ?? "0");
      const failedCount = Number(
        response.headers.get("X-Export-File-Failed") ?? "0"
      );
      const fileName =
        getStudentTaskUploadsZipFilename(taskTitle) ||
        "student-uploads.zip";

      const zipBlob = await response.blob();
      downloadBlob({ blob: zipBlob, filename: fileName });

      if (fileCount === 0) {
        showSuccessToast(
          "Export downloaded.",
          "No uploads yet — folders for each student are included."
        );
      } else if (failedCount > 0) {
        showSuccessToast(
          "Student uploads ZIP downloaded.",
          `${fileCount - failedCount} saved, ${failedCount} skipped.`
        );
      } else {
        showSuccessToast("Student uploads ZIP downloaded.", fileName);
      }
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Unable to export student uploads.";
      showErrorToast(message);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Can permission={PERMISSIONS.TASKS_EXPORT_UPLOADS}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          void handleExport();
        }}
      >
        {isPending ? (
          <InlineSpinner className="mr-2" />
        ) : (
          <FolderArchiveIcon className="mr-2 size-3.5" />
        )}
        {isPending ? "Exporting…" : "Export uploads ZIP"}
      </Button>
    </Can>
  );
}
