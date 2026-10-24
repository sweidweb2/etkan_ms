import type { Metadata } from "next";
import { SITE } from "@/lib/config/site";

type BuildPageMetadataInput = {
  title: string;
  description: string;
  path: string;
  images?: string | readonly string[];
  type?: "website" | "article";
  publishedTime?: string;
};

/**
 * Public page metadata with canonical + Open Graph / Twitter cards.
 * Relies on root `metadataBase` for absolute social URLs.
 */
export function buildPageMetadata({
  title,
  description,
  path,
  images,
  type = "website",
  publishedTime,
}: BuildPageMetadataInput): Metadata {
  const imageUrls = normalizeImageUrls(images);

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type,
      siteName: SITE.name,
      title,
      description,
      url: path,
      ...(imageUrls ? { images: imageUrls } : {}),
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: imageUrls ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrls ? { images: imageUrls } : {}),
    },
  };
}

/** Auth, panels, and private invite URLs — keep out of search indexes. */
export function buildNoIndexMetadata(title: string): Metadata {
  return {
    title,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

function normalizeImageUrls(
  images: BuildPageMetadataInput["images"]
): string[] | undefined {
  if (!images) {
    return undefined;
  }
  const list = (Array.isArray(images) ? images : [images]).filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
  return list.length > 0 ? list : undefined;
}
