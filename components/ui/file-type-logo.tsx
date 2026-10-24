import { cn } from "@/lib/utils";
import type { StudentTaskUploadFormatKind } from "@/lib/classes/student-task-upload-format";

type FileTypeLogoProps = {
  kind: StudentTaskUploadFormatKind;
  /** Extension-style label (PDF, DOCX, PNG, …). */
  label: string;
  className?: string;
};

/**
 * Colored filetype logos (document + brand accent), not stroke line icons.
 */
export function FileTypeLogo({ kind, label, className }: FileTypeLogoProps) {
  const normalized = label.trim().toUpperCase();
  const badge =
    kind === "word" && normalized === "DOC"
      ? "DOC"
      : kind === "excel" && normalized === "XLS"
        ? "XLS"
        : kind === "powerpoint" && normalized === "PPT"
          ? "PPT"
          : kind === "image"
            ? normalized.slice(0, 4) || "IMG"
            : kind === "pdf"
              ? "PDF"
              : kind === "word"
                ? "DOCX"
                : kind === "excel"
                  ? "XLSX"
                  : kind === "powerpoint"
                    ? "PPTX"
                    : kind === "text"
                      ? "TXT"
                      : normalized.slice(0, 4) || "FILE";

  const palette = paletteForKind(kind);

  return (
    <svg
      viewBox="0 0 48 56"
      className={cn("size-12 shrink-0", className)}
      aria-hidden
    >
      {/* Page */}
      <path
        d="M8 2h22l12 12v38a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4z"
        fill={palette.page}
      />
      {/* Fold */}
      <path d="M30 2v10a2 2 0 0 0 2 2h10L30 2z" fill={palette.fold} />
      {/* Accent bar */}
      <rect x="4" y="28" width="40" height="16" rx="2" fill={palette.accent} />
      <text
        x="24"
        y="39.5"
        textAnchor="middle"
        fill="#fff"
        fontSize="9"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        letterSpacing="0.04em"
      >
        {badge}
      </text>
    </svg>
  );
}

function paletteForKind(kind: StudentTaskUploadFormatKind) {
  switch (kind) {
    case "pdf":
      return { page: "#FEE2E2", fold: "#FECACA", accent: "#DC2626" };
    case "word":
      return { page: "#DBEAFE", fold: "#BFDBFE", accent: "#2563EB" };
    case "excel":
      return { page: "#D1FAE5", fold: "#A7F3D0", accent: "#059669" };
    case "powerpoint":
      return { page: "#FFEDD5", fold: "#FED7AA", accent: "#EA580C" };
    case "image":
      return { page: "#EDE9FE", fold: "#DDD6FE", accent: "#7C3AED" };
    case "text":
      return { page: "#F1F5F9", fold: "#E2E8F0", accent: "#64748B" };
    default:
      return { page: "#F1F5F9", fold: "#E2E8F0", accent: "#475569" };
  }
}
