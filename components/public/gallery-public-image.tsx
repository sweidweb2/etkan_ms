"use client";

import Image from "next/image";
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

/** Public gallery and about images. `next/image` resizes the stored original. */
export function GalleryPublicImage({
  src,
  alt,
  className,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
  onLoad,
  onError,
}: GalleryPublicImageProps) {
  return (
    <Image
      src={src}
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
