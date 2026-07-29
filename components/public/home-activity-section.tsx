"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useHydrated } from "@/hooks/use-hydrated";
import { HOME_ACTIVITY_MOSAIC } from "@/lib/constants/home-activity-mosaic";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.15, margin: "0px 0px -8% 0px" } as const;

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

function ActivityHeatmap({
  label,
  lessLabel,
  moreLabel,
}: {
  label: string;
  lessLabel: string;
  moreLabel: string;
}) {
  return (
    <div
      className="flex h-full flex-col justify-center"
      role="img"
      aria-label={label}
    >
      <div
        className="grid w-full gap-[3px] sm:gap-1"
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
        <span className="me-0.5">{lessLabel}</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <span
            key={level}
            className={cn("size-2.5 rounded-[1px] sm:size-3", LEVEL_CLASS[level])}
          />
        ))}
        <span className="ms-0.5">{moreLabel}</span>
      </div>
    </div>
  );
}

function ProjectMosaic({ label }: { label: string }) {
  return (
    <div
      className="relative h-full min-h-[14rem] overflow-hidden border border-[#3E3E75]/15 dark:border-[#C4C4E8]/15"
      aria-label={label}
    >
      <div
        className="absolute inset-[-8%] grid scale-[1.08] gap-[2px] sm:gap-[3px]"
        style={{
          gridTemplateColumns: "repeat(8, minmax(0, 1fr))",
          gridTemplateRows: "repeat(8, minmax(0, 1fr))",
        }}
      >
        {HOME_ACTIVITY_MOSAIC.map((cell, index) => {
          const tint = index % 5;
          return (
            <div
              key={cell.id}
              className={cn(
                "relative min-h-0 overflow-hidden",
                tint === 0 && "bg-[#3E3E75]/10 dark:bg-[#C4C4E8]/10",
                tint === 1 && "bg-[#3E3E75]/16 dark:bg-[#C4C4E8]/14",
                tint === 2 && "bg-muted/80",
                tint === 3 && "bg-[#3E3E75]/22 dark:bg-[#C4C4E8]/18",
                tint === 4 && "bg-[#3E3E75]/12 dark:bg-[#C4C4E8]/12"
              )}
            >
              {cell.src ? (
                <Image
                  src={cell.src}
                  alt={cell.alt ?? ""}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function HomeActivitySection() {
  const { t } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;

  return (
    <section className="relative isolate overflow-hidden px-4 py-10 sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(200deg,color-mix(in_oklch,var(--muted)_40%,var(--background)),var(--background)_50%,color-mix(in_oklch,var(--muted)_25%,var(--background)))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 end-[-10%] size-[26rem] rounded-full bg-[#3E3E75]/10 blur-3xl dark:bg-[#C4C4E8]/10"
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <motion.p
            className="text-xs font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]"
            initial={canAnimate ? { opacity: 0, y: 16 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.8, ease: EASE }}
          >
            {t("homeActivity.eyebrow")}
          </motion.p>
          <motion.h2
            className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            initial={canAnimate ? { opacity: 0, y: 20 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
          >
            {t("homeActivity.title")}
          </motion.h2>
          <motion.p
            className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg"
            initial={canAnimate ? { opacity: 0, y: 16 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.85, ease: EASE, delay: 0.1 }}
          >
            {t("homeActivity.lead")}
          </motion.p>
        </div>

        <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-2 lg:items-stretch lg:gap-8">
          <motion.div
            className="flex flex-col border border-[#3E3E75]/20 bg-background/90 p-4 sm:p-5 dark:border-[#C4C4E8]/20"
            initial={canAnimate ? { opacity: 0, y: 24 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.85, ease: EASE, delay: 0.12 }}
          >
            <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
              {t("homeActivity.heatmap.tag")}
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {t("homeActivity.heatmap.title")}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              {t("homeActivity.heatmap.body")}
            </p>
            <div className="mt-5 flex-1">
              <ActivityHeatmap
                label={t("homeActivity.heatmap.ariaLabel")}
                lessLabel={t("homeActivity.heatmap.less")}
                moreLabel={t("homeActivity.heatmap.more")}
              />
            </div>
          </motion.div>

          <motion.div
            className="flex flex-col border border-[#3E3E75]/20 bg-background/90 p-4 sm:p-5 dark:border-[#C4C4E8]/20"
            initial={canAnimate ? { opacity: 0, y: 24 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.85, ease: EASE, delay: 0.2 }}
          >
            <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
              {t("homeActivity.mosaic.tag")}
            </p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {t("homeActivity.mosaic.title")}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
              {t("homeActivity.mosaic.body")}
            </p>
            <div className="mt-5 flex-1">
              <ProjectMosaic label={t("homeActivity.mosaic.ariaLabel")} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
