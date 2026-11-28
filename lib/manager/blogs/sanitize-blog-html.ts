import { sanitize } from "isomorphic-dompurify";
import { isHttpUrl } from "@/lib/security/http-url";
import {
  RICH_HTML_ATTR,
  RICH_HTML_TAGS,
  sanitizeRichHtmlHrefs,
} from "@/lib/security/sanitize-rich-html";

/** Class applied when width/height are missing so prose CSS can reserve space. */
export const BLOG_BODY_IMG_RESERVE_CLASS = "blog-body-img--reserve";

const BLOG_HTML_TAGS = [...RICH_HTML_TAGS, "img"] as const;
const BLOG_HTML_ATTR = [
  ...RICH_HTML_ATTR,
  "src",
  "alt",
  "width",
  "height",
  "loading",
  "decoding",
] as const;

function hardenBlogImages(html: string): string {
  return html.replace(/<img\b([^>]*)\/?>/gi, (_match, rawAttrs: string) => {
    const attrs = rawAttrs ?? "";
    const srcMatch = attrs.match(/\ssrc\s*=\s*(["'])(.*?)\1/i);
    const src = srcMatch?.[2]?.trim() ?? "";
    if (!src || !isHttpUrl(src)) {
      return "";
    }

    const widthMatch = attrs.match(/\swidth\s*=\s*(["'])(.*?)\1/i);
    const heightMatch = attrs.match(/\sheight\s*=\s*(["'])(.*?)\1/i);
    const hasDimensions = Boolean(
      widthMatch?.[2]?.trim() && heightMatch?.[2]?.trim()
    );

    const altMatch = attrs.match(/\salt\s*=\s*(["'])(.*?)\1/i);
    const alt = altMatch?.[2] ?? "";

    const classMatch = attrs.match(/\sclass\s*=\s*(["'])(.*?)\1/i);
    const classTokens = new Set(
      (classMatch?.[2] ?? "")
        .split(/\s+/)
        .map((token) => token.trim())
        .filter(Boolean)
    );
    if (!hasDimensions) {
      classTokens.add(BLOG_BODY_IMG_RESERVE_CLASS);
    }

    const parts = [
      `src="${src}"`,
      `alt="${alt}"`,
      'loading="lazy"',
      'decoding="async"',
    ];
    if (widthMatch?.[2]?.trim()) {
      parts.push(`width="${widthMatch[2].trim()}"`);
    }
    if (heightMatch?.[2]?.trim()) {
      parts.push(`height="${heightMatch[2].trim()}"`);
    }
    if (classTokens.size > 0) {
      parts.push(`class="${[...classTokens].join(" ")}"`);
    }

    return `<img ${parts.join(" ")}>`;
  });
}

/** Public blog bodies — TipTap/advanced HTML sanitized with an allowlist. */
export function sanitizeBlogHtml(html: string): string {
  if (!html) {
    return "";
  }

  const cleaned = sanitize(html, {
    ALLOWED_TAGS: [...BLOG_HTML_TAGS],
    ALLOWED_ATTR: [...BLOG_HTML_ATTR],
    ALLOW_DATA_ATTR: false,
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
  });

  return hardenBlogImages(sanitizeRichHtmlHrefs(cleaned));
}
