import { cn } from "@/lib/utils";

type ClassCoverImageProps = {
  src: string | null;
  alt: string;
  className?: string;
};

export function ClassCoverImage({ src, alt, className }: ClassCoverImageProps) {
  if (!src) {
    return null;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("h-28 w-full object-cover", className)}
    />
  );
}
