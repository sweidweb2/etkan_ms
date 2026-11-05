import type { ReactNode } from "react";
import Link from "next/link";
import { createClassCardMeshGradient } from "@/lib/ui/procedural-mesh-gradient";
import { cn } from "@/lib/utils";

type FrostedGlassCardProps = {
  /**
   * Key from `CLASS_CARD_GRADIENTS`; tints the glass. Omit for a neutral card
   * that follows the light/dark theme.
   */
  cardGradient?: string;
  /** When set, the whole card navigates here (nested controls need `pointer-events-auto`). */
  href?: string;
  hrefAriaLabel?: string;
  className?: string;
  children: ReactNode;
};

/**
 * Frosted card. When tinted, a blurred colour layer sits inside the card
 * because a plain page background gives `backdrop-blur` nothing to show.
 */
export function FrostedGlassCard({
  cardGradient,
  href,
  hrefAriaLabel,
  className,
  children,
}: FrostedGlassCardProps) {
  const mesh = cardGradient ? createClassCardMeshGradient(cardGradient) : null;

  return (
    <article
      className={cn(
        "group relative isolate flex w-full flex-col overflow-hidden rounded-xl text-card-foreground",
        "transition-[transform,box-shadow,border-color] duration-300 ease-out",
        "hover:-translate-y-0.5",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        mesh
          ? [
              "border border-white/60 dark:border-white/10",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_16px_36px_-24px_rgb(42_42_82/0.45)]",
              "dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_36px_-24px_rgb(0_0_0/0.6)]",
              "hover:border-white/80 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_22px_40px_-20px_rgb(42_42_82/0.4)]",
              "dark:hover:border-white/20",
            ]
          : [
              "border border-border",
              "shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_12px_28px_-22px_rgb(42_42_82/0.4)]",
              "dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_12px_28px_-22px_rgb(0_0_0/0.6)]",
              "hover:border-primary/30 hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.7),0_18px_34px_-20px_rgb(42_42_82/0.35)]",
            ],
        className
      )}
    >
      {mesh ? (
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-6 -z-20 opacity-70 blur-2xl",
            "transition-[opacity,transform] duration-500 ease-out",
            "group-hover:scale-110 group-hover:opacity-85",
            "motion-reduce:transition-none motion-reduce:group-hover:scale-100 dark:opacity-45"
          )}
          style={{
            backgroundColor: mesh.backgroundColor,
            backgroundImage: mesh.backgroundImage,
          }}
        />
      ) : null}
      <div
        aria-hidden
        className={cn(
          // Chromium doesn't clip backdrop-filter to the parent's radius; round it too.
          "pointer-events-none absolute inset-0 -z-10 rounded-[inherit] backdrop-blur-xl",
          mesh ? "bg-white/45 dark:bg-background/55" : "bg-card/80",
          "bg-[linear-gradient(135deg,rgba(255,255,255,0.6)_0%,rgba(255,255,255,0)_50%)]",
          "dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_50%)]"
        )}
      />

      {href ? (
        <Link
          href={href}
          aria-label={hrefAriaLabel}
          className="absolute inset-0 z-0 rounded-[inherit]"
          prefetch={false}
        />
      ) : null}

      {children}
    </article>
  );
}
