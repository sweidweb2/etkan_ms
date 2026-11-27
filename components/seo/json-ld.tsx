import type { JsonLdObject } from "@/lib/seo/json-ld";

type JsonLdProps = {
  data: JsonLdObject | JsonLdObject[];
};

/**
 * Escape U+2028/U+2029 and `<` so user-controlled strings cannot break out of
 * the JSON-LD `<script>` tag (`JSON.stringify` alone does not).
 */
export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/** Server-safe JSON-LD script tag for schema.org graphs. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
