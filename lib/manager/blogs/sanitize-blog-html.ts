/**
 * Minimal HTML sanitizer for public blog bodies.
 * Strips scripts/styles, event handlers, and javascript: URLs.
 */
export function sanitizeBlogHtml(html: string): string {
  if (!html) {
    return "";
  }

  let output = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<\/?(?:iframe|object|embed|link|meta|base)[^>]*>/gi, "");

  output = output.replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "");
  output = output.replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
  output = output.replace(
    /(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi,
    '$1="#"'
  );

  return output;
}
