import type { LucideIcon } from "lucide-react";
import { InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  className?: string;
  children?: React.ReactNode;
  size?: "sm" | "default" | "lg";
};

const SIZE_CLASSES = {
  sm: {
    root: "gap-2 px-4 py-8",
    iconWrap: "size-10",
    icon: "size-5",
    title: "text-sm font-semibold",
  },
  default: {
    root: "gap-3 px-6 py-12",
    iconWrap: "size-12",
    icon: "size-6",
    title: "text-base font-semibold",
  },
  lg: {
    root: "gap-3 px-8 py-16",
    iconWrap: "size-14",
    icon: "size-7",
    title: "text-lg font-semibold",
  },
} as const;

export function EmptyState({
  title,
  description,
  icon: Icon = InboxIcon,
  className,
  children,
  size = "default",
}: EmptyStateProps) {
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 text-center",
        sizeClasses.root,
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-full bg-muted text-muted-foreground",
          sizeClasses.iconWrap
        )}
      >
        <Icon className={sizeClasses.icon} aria-hidden />
      </div>
      <div className="flex max-w-sm flex-col gap-1">
        <h3
          className={cn(
            "tracking-tight text-foreground",
            sizeClasses.title
          )}
        >
          {title}
        </h3>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}
