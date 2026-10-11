"use client";

import Image from "next/image";
import {
  isSupabasePublicStorageUrl,
  toEmbeddableGalleryImageUrl,
} from "@/lib/utils/gallery-image-url";
import { cn } from "@/lib/utils";

type GalleryPublicImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Used for next/image; defaults suit gallery columns. */
  sizes?: string;
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
};

/**
 * Public gallery/about media: `next/image` for Supabase Storage URLs;
 * native `<img>` for legacy Drive thumbnails (must not go through the optimizer).
 */
export function GalleryPublicImage({
  src,
  alt,
  className,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
  onLoad,
  onError,
}: GalleryPublicImageProps) {
  const embeddableSrc = toEmbeddableGalleryImageUrl(src);
  const useNextImage = isSupabasePublicStorageUrl(embeddableSrc);

  if (useNextImage) {
    return (
      <Image
        src={embeddableSrc}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn(className)}
        onLoad={onLoad}
        onError={onError}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Drive thumbnails / non-Storage URLs
    <img
      src={embeddableSrc}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      onLoad={onLoad}
      onError={onError}
      className={cn("absolute inset-0 size-full", className)}
    />
  );
}
