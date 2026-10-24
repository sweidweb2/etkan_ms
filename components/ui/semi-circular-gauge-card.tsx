"use client";

import { useEffect, useId, useState } from "react";
import { ArrowUpRightIcon, CircleHelpIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SemiCircularGaugeCardProps = {
  title: string;
  /** Explains the metric next to the title. */
  titleTooltip?: string;
  /** Primary center value (e.g. average earned). */
  value: number;
  /** Denominator shown in label / legend (e.g. total max). */
  total: number;
  /** Optional override; defaults to value/total * 100. */
  progressPercent?: number;
  valueLabel?: string;
  legendAverageLabel?: string;
  legendTotalLabel?: string;
  className?: string;
  formatValue?: (value: number) => string;
};

const SEGMENT_COUNT = 44;
/** Left end of the top semicircle (west). */
const START_ANGLE = -180;
/** Right end of the top semicircle (east). */
const END_ANGLE = 0;
const RADIUS = 78;
const CX = 100;
const CY = 100;

/** Fixed precision so Node vs browser trig doesn't hydrate-mismatch. */
function coord(n: number) {
  return (Math.round(n * 1e3) / 1e3).toFixed(3);
}

/**
 * Convert gauge angle to SVG coords.
 * -180 = left, -90 = top, 0 = right (top semicircle).
 */
function polarToCartesian(angleDeg: number, radius: number) {
  const radians = (angleDeg * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(radians),
    y: CY + radius * Math.sin(radians),
  };
}

function segmentPath(index: number) {
  const span = END_ANGLE - START_ANGLE;
  const step = span / SEGMENT_COUNT;
  const gap = step * 0.28;
  const start = START_ANGLE + index * step + gap / 2;
  const end = START_ANGLE + (index + 1) * step - gap / 2;
  const inner = RADIUS - 7;
  const outer = RADIUS + 7;
  const p1 = polarToCartesian(start, outer);
  const p2 = polarToCartesian(end, outer);
  const p3 = polarToCartesian(end, inner);
  const p4 = polarToCartesian(start, inner);
  const largeArc = end - start > 180 ? 1 : 0;

  // Outer arc travels left→top→right (CCW in SVG). Inner returns CW.
  return [
    `M ${coord(p1.x)} ${coord(p1.y)}`,
    `A ${outer} ${outer} 0 ${largeArc} 0 ${coord(p2.x)} ${coord(p2.y)}`,
    `L ${coord(p3.x)} ${coord(p3.y)}`,
    `A ${inner} ${inner} 0 ${largeArc} 1 ${coord(p4.x)} ${coord(p4.y)}`,
    "Z",
  ].join(" ");
}

function defaultFormat(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Minimal analytics card with a segmented semi-circular progress gauge.
 */
export function SemiCircularGaugeCard({
  title,
  titleTooltip,
  value,
  total,
  progressPercent,
  valueLabel = "Average",
  legendAverageLabel = "Average",
  legendTotalLabel = "Total",
  className,
  formatValue = defaultFormat,
}: SemiCircularGaugeCardProps) {
  const gradientId = useId().replace(/:/g, "");
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const targetProgress =
    progressPercent ??
    (total <= 0 ? 0 : Math.min(100, Math.max(0, (value / total) * 100)));

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- animation sync / reduced-motion jump
      setAnimatedProgress(targetProgress);
      return;
    }

    setAnimatedProgress(0);
    const frame = window.requestAnimationFrame(() => {
      setAnimatedProgress(targetProgress);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [targetProgress]);

  const activeCount = Math.round((animatedProgress / 100) * SEGMENT_COUNT);

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border/80 bg-card text-card-foreground shadow-[0_10px_30px_-24px_rgba(15,23,42,0.35)]",
        className
      )}
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="text-sm font-medium tracking-tight">{title}</h3>
          {titleTooltip ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      type="button"
                      className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                      aria-label={`About ${title}`}
                    />
                  }
                >
                  <CircleHelpIcon className="size-3.5" aria-hidden />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-xs leading-snug">
                  {titleTooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : null}
        </div>
        <span
          className="inline-flex size-8 items-center justify-center rounded-full border border-border/70 text-muted-foreground"
          aria-hidden
        >
          <ArrowUpRightIcon className="size-4" />
        </span>
      </header>

      <div className="relative mx-auto w-full max-w-[16rem] px-4 pt-2 pb-1">
        <svg
          viewBox="0 0 200 118"
          className="h-auto w-full"
          role="img"
          aria-label={`${formatValue(value)} of ${formatValue(total)}, ${Math.round(targetProgress)} percent`}
        >
          <defs>
            <linearGradient
              id={gradientId}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="55%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>

          {Array.from({ length: SEGMENT_COUNT }, (_, index) => {
            const isActive = index < activeCount;
            return (
              <path
                key={index}
                d={segmentPath(index)}
                fill={isActive ? `url(#${gradientId})` : "currentColor"}
                className={cn(
                  "transition-[fill,opacity] duration-700 ease-out",
                  isActive
                    ? "opacity-100"
                    : "text-muted-foreground/25 opacity-90 dark:text-muted-foreground/35"
                )}
                style={{
                  transitionDelay: isActive
                    ? `${Math.min(index * 12, 360)}ms`
                    : "0ms",
                }}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-x-0 top-[54%] flex flex-col items-center px-4">
          <p className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {formatValue(value)}
            <span className="text-lg font-medium text-muted-foreground sm:text-xl">
              {" "}
              / {formatValue(total)}
            </span>
          </p>
          <p className="mt-1.5 max-w-[12rem] text-center text-xs text-muted-foreground">
            {valueLabel}
          </p>
        </div>
      </div>

      <footer className="mt-auto flex items-center justify-center gap-5 border-t border-border/60 px-5 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span
            className="size-2 rounded-full bg-gradient-to-r from-teal-400 to-sky-500"
            aria-hidden
          />
          <span>
            {legendAverageLabel}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatValue(value)}
            </span>
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="size-2 rounded-full bg-muted-foreground/35"
            aria-hidden
          />
          <span>
            {legendTotalLabel}{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatValue(total)}
            </span>
          </span>
        </span>
      </footer>
    </article>
  );
}
