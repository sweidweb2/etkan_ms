"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { PUBLIC_PROJECT_PLACEHOLDER_IMAGE_URL } from "@/lib/constants/manager-public-project";
import { cn } from "@/lib/utils";

type PublicCoverImageProps = {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
};

function CoverImageSkeleton() {
  return (
    <div
      className="absolute inset-0 z-10 overflow-hidden bg-inherit"
      role="status"
      aria-busy="true"
      aria-label="Loading image"
    >
      <div
        aria-hidden="true"
        className="image-skeleton-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
      />
    </div>
  );
}

export function PublicCoverImage({
  src,
  alt,
  sizes,
  className,
  imageClassName,
  priority = false,
}: PublicCoverImageProps) {
  const [activeSrc, setActiveSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setActiveSrc(src);
    setHasError(false);
  }, [src]);

  const isPlaceholder = activeSrc === PUBLIC_PROJECT_PLACEHOLDER_IMAGE_URL;

  if (hasError && isPlaceholder) {
    return (
      <div className={cn("relative overflow-hidden bg-muted", className)}>
        <CoverImageSkeleton />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <Image
        key={activeSrc}
        src={activeSrc}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", imageClassName)}
        onError={() => {
          if (isPlaceholder) {
            setHasError(true);
            return;
          }
          setActiveSrc(PUBLIC_PROJECT_PLACEHOLDER_IMAGE_URL);
        }}
      />
    </div>
  );
}
