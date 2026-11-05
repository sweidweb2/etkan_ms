import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { createClassCardMeshGradient } from "@/lib/ui/procedural-mesh-gradient";
import { cn } from "@/lib/utils";

type GradientGlassCardProps = {
  /** Stable unique id for the card identity (React key / a11y). */
  id: string;
  /** Key from `CLASS_CARD_GRADIENTS` directory (`classes.card_gradient`). */
  cardGradient: string;
  /**
   * Optional cover image. When set, replaces the mesh gradient in the
   * cover band; gradient remains the fallback when this is empty/null.
   */
  coverImageUrl?: string | null;
  coverImageAlt?: string;
  title: string;
  /** Max title lines before ellipsis. */
  titleLines?: 1 | 2;
  description?: string;
  /** Label inside the frosted glass panel; overflows with ellipsis. */
  glassLabel?: string;
  /** Optional line under the description (dates, meta). */
  meta?: ReactNode;
  /** Chip in the content area (e.g. status), beside title/meta. */
  badge?: ReactNode;
  /** Extra content below meta (progress, actions). */
  children?: ReactNode;
  /** When set, the whole card navigates here (nested controls need `pointer-events-auto`). */
  href?: string;
  hrefAriaLabel?: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Card with a curated aurora mesh top and a frosted-glass label panel.
 * Shell colors follow the active light/dark theme.
 */
export function GradientGlassCard({
  id,
  cardGradient,
  coverImageUrl,
  coverImageAlt = "",
  title,
  titleLines = 2,
  description,
  glassLabel,
  meta,
  badge,
  children,
  href,
  hrefAriaLabel,
  className,
  style,
}: GradientGlassCardProps) {
  return (
    <article
      id={id}
      className={cn(
        "group/gradient-glass relative flex h-full w-full flex-col overflow-hidden rounded-2xl",
        "border border-foreground/10 bg-card text-card-foreground",
        "shadow-[0_16px_36px_-24px_rgb(42_42_82/0.45)]",
        "transition-[transform,box-shadow] duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-20px_rgb(42_42_82/0.4)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        href ? "cursor-pointer" : null,
        className
      )}
      style={style}
    >
      {href ? (
        <Link
          href={href}
          aria-label={hrefAriaLabel ?? title}
          className="absolute inset-0 z-0 rounded-2xl"
          prefetch={false}
        />
      ) : null}

      <GradientGlassCover
        cardGradient={cardGradient}
        coverImageUrl={coverImageUrl}
        coverImageAlt={coverImageAlt}
        glassLabel={glassLabel}
        className={cn("h-24 sm:h-28", href ? "pointer-events-none" : null)}
      />

      <div
        className={cn(
          "relative z-10 flex min-h-0 flex-1 flex-col gap-1 px-4 pt-3.5 pb-4",
          href ? "pointer-events-none" : null
        )}
      >
        <div
          className={cn(
            "flex items-start justify-between gap-2",
            titleLines === 2 ? "min-h-12" : null
          )}
        >
          <h2
            className={cn(
              "min-w-0 text-base leading-6 font-semibold tracking-tight",
              titleLines === 2 ? "line-clamp-2 text-balance" : "flex-1 truncate"
            )}
            title={title}
          >
            {title}
          </h2>
          {badge ? <div className="shrink-0 pt-0.5">{badge}</div> : null}
        </div>
        {description ? (
          <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
            {description}
          </p>
        ) : null}
        {meta ? (
          <div className="mt-auto pt-3 text-xs text-muted-foreground">{meta}</div>
        ) : null}
        {children}
      </div>
    </article>
  );
}

type GradientGlassCoverProps = {
  /** Key from `CLASS_CARD_GRADIENTS` directory. */
  cardGradient: string;
  coverImageUrl?: string | null;
  coverImageAlt?: string;
  /** Label inside the frosted glass panel. */
  glassLabel?: string;
  /** Sizing for the cover band (height or aspect ratio). */
  className?: string;
  glassClassName?: string;
  glassLabelClassName?: string;
  /** Max label lines before ellipsis. */
  glassLabelLines?: 1 | 2;
};

/**
 * Aurora mesh (or cover image) band with a centered frosted-glass label.
 * Hover effects key off an ancestor with `group/gradient-glass`.
 */
export function GradientGlassCover({
  cardGradient,
  coverImageUrl,
  coverImageAlt = "",
  glassLabel,
  className,
  glassClassName,
  glassLabelClassName,
  glassLabelLines = 1,
}: GradientGlassCoverProps) {
  const mesh = createClassCardMeshGradient(cardGradient);
  const hasCoverImage = Boolean(coverImageUrl);

  return (
    <div
      className={cn(
        "relative isolate w-full shrink-0 overflow-hidden",
        className
      )}
    >
      {hasCoverImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- class cover URLs are storage/CDN paths
        <img
          src={coverImageUrl!}
          alt={coverImageAlt}
          className={cn(
            "absolute inset-0 size-full object-cover transition-[filter,transform] duration-500 ease-out",
            "group-hover/gradient-glass:scale-105 group-hover/gradient-glass:brightness-[1.04]",
            "motion-reduce:transition-none motion-reduce:group-hover/gradient-glass:scale-100"
          )}
        />
      ) : (
        <div
          aria-hidden
          className={cn(
            "absolute inset-0 scale-105 transition-[filter,transform] duration-500 ease-out",
            "group-hover/gradient-glass:scale-110 group-hover/gradient-glass:brightness-[1.06]",
            "motion-reduce:transition-none motion-reduce:group-hover/gradient-glass:scale-105"
          )}
          style={{
            backgroundColor: mesh.backgroundColor,
            backgroundImage: mesh.backgroundImage,
          }}
        />
      )}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.12)_100%)]"
      />

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-4 py-3">
        <div
          className={cn(
            "flex h-12 w-[min(100%,11.5rem)] items-center justify-center overflow-hidden rounded-xl px-3",
            "border border-white/40 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_24px_-14px_rgba(0,0,0,0.25)]",
            "backdrop-blur-[16px] supports-backdrop-filter:bg-white/20",
            "transition-[border-color,background-color,box-shadow] duration-300 ease-out",
            "group-hover/gradient-glass:border-white/55 group-hover/gradient-glass:bg-white/30",
            "motion-reduce:transition-none",
            glassClassName
          )}
        >
          {glassLabel ? (
            <p
              className={cn(
                "w-full text-center text-sm font-semibold tracking-tight text-zinc-900/90 [text-shadow:0_1px_0_rgba(255,255,255,0.45)]",
                glassLabelLines === 2 ? "line-clamp-2 break-words" : "truncate",
                glassLabelClassName
              )}
              title={glassLabel}
            >
              {glassLabel}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
