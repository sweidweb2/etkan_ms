/** Generate a random 4-digit semester code string (`0000`–`9999`). */
export function generateSemesterCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, "0");
}
