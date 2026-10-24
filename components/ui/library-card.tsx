"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { FileTextIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type LibraryCardProps = {
  href: string;
  /** Small muted uppercase line (e.g. date). */
  eyebrow: string;
  title: string;
  /** Outlined category label. */
  badge: string;
  meta?: {
    icon?: LucideIcon;
    label: string;
  };
  /** Decorative paper icon in the tilted preview. */
  previewIcon?: LucideIcon;
  /** Small pill overlaid on the tilted cover (e.g. Started). */
  coverBadge?: string;
  className?: string;
  /** Soft pastel glow tint on hover. */
  glow?: "blue" | "mint" | "lavender";
};

const GLOW_CLASSES = {
  blue: "from-sky-200/55 via-blue-100/30 dark:from-sky-500/25 dark:via-blue-500/10",
  mint: "from-teal-200/55 via-emerald-100/30 dark:from-teal-500/25 dark:via-emerald-500/10",
  lavender:
    "from-violet-200/55 via-indigo-100/30 dark:from-violet-500/25 dark:via-indigo-500/10",
} as const;

/**
 * Minimal library-style card: text left, clipped tilted document preview right.
 */
export function LibraryCard({
  href,
  eyebrow,
  title,
  badge,
  meta,
  previewIcon: PreviewIcon = FileTextIcon,
  coverBadge,
  className,
  glow = "lavender",
}: LibraryCardProps) {
  const MetaIcon = meta?.icon;

  return (
    <Link
      href={href}
      prefetch={false}
      aria-label={title}
      className={cn(
        "group relative flex h-full min-h-[8.5rem] overflow-hidden rounded-xl border border-border/80 bg-card",
        "shadow-[0_8px_24px_-20px_rgba(15,23,42,0.28)]",
        "transition-[border-color,box-shadow,transform] duration-300 ease-out",
        "hover:-translate-y-0.5 hover:border-border hover:shadow-[0_16px_36px_-22px_rgba(62,62,117,0.35)]",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        coverBadge && "border-emerald-500/25",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-[58%] bg-gradient-to-l to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          GLOW_CLASSES[glow]
        )}
      />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-between gap-4 p-5 pr-24 sm:pr-28">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-medium tracking-[0.08em] text-muted-foreground uppercase">
            {eyebrow}
          </p>
          <h3 className="line-clamp-2 text-base font-semibold tracking-tight text-foreground">
            {title}
          </h3>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <span className="inline-flex max-w-full truncate rounded-md border border-border/80 bg-background/60 px-2 py-0.5 text-[10px] font-medium tracking-[0.06em] text-muted-foreground uppercase">
            {badge}
          </span>
          {meta ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              {MetaIcon ? (
                <MetaIcon
                  className="size-3.5 shrink-0 text-primary/70"
                  aria-hidden
                />
              ) : null}
              <span className="truncate">{meta.label}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 -right-6 h-[7.5rem] w-[5.75rem] -translate-y-1/2 rotate-[8deg] sm:-right-5 sm:h-[8.25rem] sm:w-[6.25rem]"
      >
        <div className="relative h-full w-full rounded-[0.65rem] border border-border/70 bg-card/90 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.45)] opacity-55 transition-opacity duration-300 group-hover:opacity-75 dark:bg-card/80">
          <div className="absolute top-3 left-3 inline-flex size-6 items-center justify-center rounded-full border border-border/70 bg-muted/40 text-muted-foreground">
            <PreviewIcon className="size-3.5" />
          </div>
          {coverBadge ? (
            <span className="absolute top-3 right-2 z-10 inline-flex max-w-[4.5rem] truncate rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-white uppercase shadow-sm">
              {coverBadge}
            </span>
          ) : null}
          <div className="absolute inset-x-3 top-12 space-y-2">
            <span className="block h-1 rounded-full bg-muted-foreground/15" />
            <span className="block h-1 w-[85%] rounded-full bg-muted-foreground/12" />
            <span className="block h-1 w-[70%] rounded-full bg-muted-foreground/10" />
            <span className="block h-1 w-[78%] rounded-full bg-muted-foreground/10" />
            <span className="mt-3 block h-1 w-[60%] rounded-full bg-muted-foreground/10" />
            <span className="block h-1 w-[72%] rounded-full bg-muted-foreground/10" />
          </div>
        </div>
      </div>
    </Link>
  );
}
