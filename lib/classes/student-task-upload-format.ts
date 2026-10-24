/**
 * Visual format metadata for student task upload cards.
 */

export type StudentTaskUploadFormatKind =
  | "pdf"
  | "word"
  | "excel"
  | "powerpoint"
  | "image"
  | "text"
  | "file";

export type StudentTaskUploadFormatMeta = {
  kind: StudentTaskUploadFormatKind;
  /** Short badge label shown on the card (PDF, DOC, PNG, …). */
  label: string;
  className: string;
};

function extensionOf(fileName: string) {
  const parts = fileName.trim().toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1)! : "";
}

/** Resolve display format from mime type and file name. */
export function getStudentTaskUploadFormat(
  mimeType: string,
  fileName: string
): StudentTaskUploadFormatMeta {
  const mime = mimeType.trim().toLowerCase();
  const ext = extensionOf(fileName);

  if (mime === "application/pdf" || ext === "pdf") {
    return {
      kind: "pdf",
      label: "PDF",
      className:
        "border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300",
    };
  }

  if (
    mime === "application/msword" ||
    mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    ext === "doc" ||
    ext === "docx"
  ) {
    return {
      kind: "word",
      label: ext === "doc" ? "DOC" : "DOCX",
      className:
        "border-sky-500/35 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    };
  }

  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    ext === "xlsx" ||
    ext === "xls"
  ) {
    return {
      kind: "excel",
      label: "XLSX",
      className:
        "border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    };
  }

  if (
    mime ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    ext === "pptx" ||
    ext === "ppt"
  ) {
    return {
      kind: "powerpoint",
      label: "PPTX",
      className:
        "border-orange-500/35 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    };
  }

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    const label =
      ext === "jpeg" || ext === "jpg"
        ? "JPG"
        : ext === "png"
          ? "PNG"
          : ext === "webp"
            ? "WEBP"
            : ext === "gif"
              ? "GIF"
              : "IMG";
    return {
      kind: "image",
      label,
      className:
        "border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    };
  }

  if (mime === "text/plain" || ext === "txt") {
    return {
      kind: "text",
      label: "TXT",
      className:
        "border-muted-foreground/30 bg-muted/60 text-muted-foreground",
    };
  }

  return {
    kind: "file",
    label: ext ? ext.toUpperCase().slice(0, 4) : "FILE",
    className:
      "border-border bg-muted/40 text-muted-foreground",
  };
}

export function formatUploadFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
