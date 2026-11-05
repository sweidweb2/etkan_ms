import { getInitials } from "@/lib/utils/display-name";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "size-10 text-sm",
  md: "size-14 text-base",
  lg: "size-24 text-2xl",
} as const;

type ProfileAvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
};

export function ProfileAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: ProfileAvatarProps) {
  const sizeClassName = SIZE_CLASSES[size];

  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- public Storage URL, already a 512px WebP
      <img
        src={avatarUrl}
        alt={name}
        className={cn(
          "shrink-0 rounded-full border bg-muted object-cover",
          sizeClassName,
          className
        )}
      />
    );
  }

  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground",
        sizeClassName,
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}
