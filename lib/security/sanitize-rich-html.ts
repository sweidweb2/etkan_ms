import { sanitize } from "isomorphic-dompurify";
import { isHttpUrl } from "@/lib/security/http-url";

/** Tags TipTap StarterKit + underline emit for blogs/emails. */
export const RICH_HTML_TAGS = [
  "a",
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h2",
  "h3",
  "blockquote",
  "code",
  "pre",
  "hr",
  "span",
] as const;

export const RICH_HTML_ATTR = ["href", "target", "rel", "class"] as const;

/** Defense in depth: drop non-http(s)/mailto hrefs DOMPurify might keep. */
export function sanitizeRichHtmlHrefs(html: string): string {
  return html.replace(
    /\shref\s*=\s*(["'])(.*?)\1/gi,
    (match, quote: string, href: string) => {
      const value = href.trim();
      if (!value) {
        return match;
      }
      if (value.toLowerCase().startsWith("mailto:")) {
        return match;
      }
      if (isHttpUrl(value)) {
        return match;
      }
      return ` href=${quote}#${quote}`;
    }
  );
}

/**
 * Allowlisted HTML sanitizer for manager-authored rich text that reaches
 * the public DOM or outbound email clients.
 */
export function sanitizeRichHtml(html: string): string {
  if (!html) {
    return "";
  }

  const cleaned = sanitize(html, {
    ALLOWED_TAGS: [...RICH_HTML_TAGS],
    ALLOWED_ATTR: [...RICH_HTML_ATTR],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });

  return sanitizeRichHtmlHrefs(cleaned);
}
