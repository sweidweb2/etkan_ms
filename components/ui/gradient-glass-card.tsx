import type { CSSProperties, ReactNode } from "react";
import { createClassCardMeshGradient } from "@/lib/ui/procedural-mesh-gradient";
import { cn } from "@/lib/utils";

type GradientGlassCardProps = {
  /** Stable unique id for the card identity (React key / a11y). */
  id: string;
  /** Key from `CLASS_CARD_GRADIENTS` directory (`classes.card_gradient`). */
  cardGradient: string;
  title: string;
  description?: string;
  /** Label inside the frosted glass panel; overflows with ellipsis. */
  glassLabel?: string;
  /** Optional line under the description (dates, meta). */
  meta?: ReactNode;
  /** Chip in the content area (e.g. status), beside title/meta. */
  badge?: ReactNode;
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
  title,
  description,
  glassLabel,
  meta,
  badge,
  className,
  style,
}: GradientGlassCardProps) {
  const mesh = createClassCardMeshGradient(cardGradient);

  return (
    <article
      id={id}
      className={cn(
        "group/gradient-glass relative flex flex-col overflow-hidden rounded-2xl",
        "border border-foreground/10 bg-card text-card-foreground",
        "shadow-[0_16px_36px_-24px_rgb(42_42_82/0.45)]",
        "transition-[transform,box-shadow] duration-300 ease-out",
        "hover:-translate-y-0.5 hover:shadow-[0_22px_40px_-20px_rgb(42_42_82/0.4)]",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className
      )}
      style={style}
    >
      <div className="relative isolate h-24 w-full overflow-hidden sm:h-28">
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
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.12)_100%)]"
        />

        <div className="absolute inset-0 z-10 flex items-center justify-center px-4 py-3">
          <div
            className={cn(
              "flex h-12 w-[min(100%,11.5rem)] items-center justify-center overflow-hidden rounded-xl px-3",
              "border border-white/40 bg-white/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_10px_24px_-14px_rgba(0,0,0,0.25)]",
              "backdrop-blur-[16px] supports-backdrop-filter:bg-white/20",
              "transition-[border-color,background-color,box-shadow] duration-300 ease-out",
              "group-hover/gradient-glass:border-white/55 group-hover/gradient-glass:bg-white/30",
              "motion-reduce:transition-none"
            )}
          >
            {glassLabel ? (
              <p
                className="w-full truncate text-center text-sm font-semibold tracking-tight text-zinc-900/90 [text-shadow:0_1px_0_rgba(255,255,255,0.45)]"
                title={glassLabel}
              >
                {glassLabel}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-4 pt-3.5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <h2 className="min-w-0 line-clamp-2 text-base font-semibold tracking-tight text-balance">
            {title}
          </h2>
          {badge ? <div className="shrink-0 pt-0.5">{badge}</div> : null}
        </div>
        {description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {meta ? (
          <div className="mt-auto pt-3 text-xs text-muted-foreground">{meta}</div>
        ) : null}
      </div>
    </article>
  );
}
