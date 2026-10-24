import type { JsonLdObject } from "@/lib/seo/json-ld";

type JsonLdProps = {
  data: JsonLdObject | JsonLdObject[];
};

/** Server-safe JSON-LD script tag for schema.org graphs. */
export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
