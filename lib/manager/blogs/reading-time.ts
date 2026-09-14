const WORDS_PER_MINUTE = 200;

/** Strip tags for a rough word count from HTML or plain text. */
export function plainTextFromHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function estimateReadingTimeMinutes(bodyHtml: string): number {
  const text = plainTextFromHtml(bodyHtml);
  if (!text) {
    return 1;
  }
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.min(120, Math.ceil(words / WORDS_PER_MINUTE)));
}
