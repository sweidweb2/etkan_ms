"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useHydrated } from "@/hooks/use-hydrated";
import { HOME_ACTIVITY_MOSAIC } from "@/lib/constants/home-activity-mosaic";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.15, margin: "0px 0px -8% 0px" } as const;

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

        <motion.div
          className="mt-8 flex flex-col border border-[#3E3E75]/20 bg-background/90 p-4 sm:mt-10 sm:p-5 dark:border-[#C4C4E8]/20"
          initial={canAnimate ? { opacity: 0, y: 24 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.85, ease: EASE, delay: 0.12 }}
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
    </section>
  );
}
