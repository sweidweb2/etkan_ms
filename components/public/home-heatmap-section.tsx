"use client";

import { motion, useReducedMotion } from "motion/react";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.2, margin: "0px 0px -6% 0px" } as const;

const WEEKS = 53;
const DAYS = 7;

/** Deterministic 0–4 intensity — biased high so the map reads as dense work. */
function cellLevel(week: number, day: number): 0 | 1 | 2 | 3 | 4 {
  const n = (week * 17 + day * 31 + week * day * 7) % 100;
  if (n < 4) return 0;
  if (n < 12) return 1;
  if (n < 28) return 2;
  if (n < 52) return 3;
  return 4;
}

const HEATMAP_CELLS: { key: string; level: 0 | 1 | 2 | 3 | 4 }[] = (() => {
  const list: { key: string; level: 0 | 1 | 2 | 3 | 4 }[] = [];
  for (let week = 0; week < WEEKS; week += 1) {
    for (let day = 0; day < DAYS; day += 1) {
      list.push({
        key: `${week}-${day}`,
        level: cellLevel(week, day),
      });
    }
  }
  return list;
})();

const LEVEL_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-[#3E3E75]/10 dark:bg-[#C4C4E8]/10",
  1: "bg-[#3E3E75]/25 dark:bg-[#C4C4E8]/20",
  2: "bg-[#3E3E75]/50 dark:bg-[#C4C4E8]/40",
  3: "bg-[#3E3E75]/75 dark:bg-[#C4C4E8]/65",
  4: "bg-[#3E3E75] dark:bg-[#C4C4E8]",
};

export function HomeHeatmapSection() {
  const { t } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;
  const titleId = "home-heatmap-title";

  return (
    <section
      className="relative isolate overflow-hidden px-4 py-10 sm:px-6 sm:py-12"
      aria-labelledby={titleId}
    >
      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <motion.p
            className="text-xs font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]"
            initial={canAnimate ? { opacity: 0, y: 16 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.8, ease: EASE }}
          >
            {t("homeHeatmap.eyebrow")}
          </motion.p>
          <motion.h2
            id={titleId}
            className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            initial={canAnimate ? { opacity: 0, y: 20 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
          >
            {t("homeHeatmap.title")}
          </motion.h2>
          <motion.p
            className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg"
            initial={canAnimate ? { opacity: 0, y: 16 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.85, ease: EASE, delay: 0.1 }}
          >
            {t("homeHeatmap.lead")}
          </motion.p>
        </div>

        <motion.div
          className="mx-auto mt-8 w-full max-w-3xl sm:mt-10"
          role="img"
          aria-label={t("homeHeatmap.ariaLabel")}
          initial={canAnimate ? { opacity: 0, y: 16 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.85, ease: EASE, delay: 0.12 }}
        >
          <div
            className="grid w-full gap-[2px] sm:gap-[3px]"
            style={{
              gridTemplateColumns: `repeat(${WEEKS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${DAYS}, minmax(0, 1fr))`,
              gridAutoFlow: "column",
            }}
          >
            {HEATMAP_CELLS.map((cell) => (
              <span
                key={cell.key}
                className={cn(
                  "aspect-square min-h-0 min-w-0 rounded-[1px]",
                  LEVEL_CLASS[cell.level]
                )}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-end gap-1.5 text-[0.65rem] text-muted-foreground">
            <span className="me-0.5">{t("homeHeatmap.less")}</span>
            {([0, 1, 2, 3, 4] as const).map((level) => (
              <span
                key={level}
                className={cn("size-2.5 rounded-[1px]", LEVEL_CLASS[level])}
              />
            ))}
            <span className="ms-0.5">{t("homeHeatmap.more")}</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
