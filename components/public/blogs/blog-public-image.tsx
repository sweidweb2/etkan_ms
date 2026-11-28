import Image from "next/image";
import { cn } from "@/lib/utils";

type BlogPublicImageProps = {
  src: string;
  alt?: string;
  className?: string;
  /** Used for next/image; defaults suit blog cards. */
  sizes?: string;
  priority?: boolean;
  /** Round avatar crop. */
  rounded?: "none" | "full";
};

const CARD_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
const HERO_SIZES = "100vw";
const AVATAR_SIZES = "40px";

export const BLOG_IMAGE_SIZES = {
  card: CARD_SIZES,
  hero: HERO_SIZES,
  featured: "(max-width: 768px) 100vw, 100vw",
  avatar: AVATAR_SIZES,
} as const;

/** Public blog covers/avatars via next/image (AVIF/WebP + lazy by default). */
export function BlogPublicImage({
  src,
  alt = "",
  className,
  sizes = BLOG_IMAGE_SIZES.card,
  priority = false,
  rounded = "none",
}: BlogPublicImageProps) {
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn(
        "object-cover",
        rounded === "full" && "rounded-full",
        className
      )}
    />
  );
}
