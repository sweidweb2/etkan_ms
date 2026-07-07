/** Today's date as YYYY-MM-DD in the local timezone (for date inputs). */
export function getLocalIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isFutureLocalIsoDate(value: string): boolean {
  return value > getLocalIsoDate();
}
