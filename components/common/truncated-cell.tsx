import { TABLE_CELL_CHAR_LIMITS } from "@/lib/constants/table-display";
import { displayOrDash, truncateText } from "@/lib/utils/truncate";
import { cn } from "@/lib/utils";

type TruncatedCellProps = {
  value: string | number | null | undefined;
  maxChars?: number;
  className?: string;
};

export function TruncatedCell({
  value,
  maxChars = TABLE_CELL_CHAR_LIMITS.default,
  className,
}: TruncatedCellProps) {
  const full = displayOrDash(value);
  const display = full === "—" ? full : truncateText(full, maxChars);
  const isTruncated = full !== "—" && display !== full;

  return (
    <span
      className={cn("block min-w-0 truncate", className)}
      title={isTruncated ? full : undefined}
    >
      {display}
    </span>
  );
}
