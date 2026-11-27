import { sanitizeRichHtml } from "@/lib/security/sanitize-rich-html";

/** Public blog bodies — TipTap HTML sanitized with an allowlist. */
export function sanitizeBlogHtml(html: string): string {
  return sanitizeRichHtml(html);
}
