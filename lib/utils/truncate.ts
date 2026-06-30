/**
 * Truncate text to a max character count and append "..." when shortened.
 */
export function truncateText(value: string, maxChars: number): string {
  if (maxChars <= 0) return "...";
  if (value.length <= maxChars) return value;
  if (maxChars <= 3) return "...";
  return `${value.slice(0, maxChars - 3).trimEnd()}...`;
}

export function displayOrDash(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value);
}
