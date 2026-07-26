"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type CourseCardImageProps = {
  src: string;
  alt?: string;
  className?: string;
};

export function CourseCardImage({
  src,
  alt = "",
  className,
}: CourseCardImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  return (
    <div
      className={cn(
        "relative aspect-[16/10] overflow-hidden rounded-lg bg-muted",
        className
      )}
    >
      {!isLoaded ? (
        <div
          className="absolute inset-0 z-10 overflow-hidden rounded-lg bg-inherit"
          role="status"
          aria-busy="true"
          aria-label="Loading image"
        >
          <div
            aria-hidden="true"
            className="image-skeleton-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />
        </div>
      ) : null}
      <Image
        src={src}
        alt={alt}
        fill
        className={cn(
          "object-cover transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        sizes="(max-width: 640px) 100vw, 280px"
        onLoad={() => setIsLoaded(true)}
      />
    </div>
  );
}
