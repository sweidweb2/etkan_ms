"use client";

import { PublicCoverImage } from "@/components/public/public-cover-image";
import { cn } from "@/lib/utils";

type CourseCardImageProps = {
  src: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

export function CourseCardImage({
  src,
  alt = "",
  className,
  priority = false,
  sizes = "(max-width: 640px) 100vw, 280px",
}: CourseCardImageProps) {
  return (
    <PublicCoverImage
      src={src}
      alt={alt}
      sizes={sizes}
      priority={priority}
      className={cn("aspect-[16/10] rounded-lg", className)}
      imageClassName="transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.04]"
    />
  );
}
