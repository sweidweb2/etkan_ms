import type { Metadata } from "next";
import { SITE } from "@/lib/config/site";
import { absoluteUrl } from "@/lib/seo/absolute-url";

export const NOINDEX_ROBOTS = {
  index: false,
  follow: false,
  googleBot: {
    index: false,
    follow: false,
  },
} as const satisfies Metadata["robots"];

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  /** When true, title is used as-is (no `%s | Etkan` template). */
  absoluteTitle?: boolean;
  /** Absolute or site-relative image URLs for OG/Twitter. */
  images?: string | readonly string[];
  type?: "website" | "article";
  robots?: Metadata["robots"];
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
};

function normalizeImageUrls(
  images: BuildPageMetadataInput["images"]
): string[] | undefined {
  if (!images) {
    return undefined;
  }
  const list = (Array.isArray(images) ? [...images] : [images]).filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  return list.length > 0 ? list : undefined;
}

/** Shared metadata builder: canonical, OG, Twitter for public pages. */
export function buildPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  images,
  type = "website",
  robots,
  publishedTime,
  modifiedTime,
  authors,
}: BuildPageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const imageUrls = normalizeImageUrls(images);

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical: url,
    },
    robots,
    openGraph: {
      title,
      description,
      url,
      type,
      siteName: SITE.name,
      ...(imageUrls ? { images: imageUrls } : {}),
      ...(type === "article"
        ? {
            publishedTime,
            modifiedTime,
            authors,
          }
        : {}),
    },
    twitter: {
      card: imageUrls ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrls ? { images: imageUrls } : {}),
    },
  };
}

/** Utility / private routes that must not appear in search indexes. */
export function buildNoIndexMetadata(title: string): Metadata {
  return {
    title,
    robots: NOINDEX_ROBOTS,
  };
}
