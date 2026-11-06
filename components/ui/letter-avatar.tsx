import { cn } from "@/lib/utils";
import { pickSeededTintClassName } from "@/lib/utils/seeded-tint";

type LetterAvatarProps = {
  name: string;
  /** Stable key for the color (e.g. record id); defaults to `name`. */
  seed?: string;
  className?: string;
};

export function LetterAvatar({ name, seed, className }: LetterAvatarProps) {
  const letter = name.trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold select-none",
        pickSeededTintClassName(seed ?? name),
        className
      )}
    >
      {letter}
    </span>
  );
}
