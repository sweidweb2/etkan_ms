import { ImageResponse } from "next/og";
import { SITE } from "@/lib/config/site";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

type BuildOgImageInput = {
  title: string;
  description?: string;
};

/** Shared branded Open Graph image for marketing routes. */
export function buildOgImageResponse({
  title,
  description,
}: BuildOgImageInput) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(145deg, #2F2F5A 0%, #3E3E75 48%, #1e1e36 100%)",
          color: "#ffffff",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            opacity: 0.9,
          }}
        >
          {SITE.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 48 ? 52 : 64,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          {description ? (
            <div
              style={{
                display: "flex",
                fontSize: 28,
                lineHeight: 1.35,
                opacity: 0.88,
                maxWidth: 920,
              }}
            >
              {description.length > 140
                ? `${description.slice(0, 137)}…`
                : description}
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
