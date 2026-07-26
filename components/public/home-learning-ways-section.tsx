"use client";

import { motion, useReducedMotion } from "motion/react";
import { useHydrated } from "@/hooks/use-hydrated";
import type { MessageKey } from "@/lib/i18n/messages";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.2, margin: "0px 0px -8% 0px" } as const;

type LearningWay = {
  index: string;
  tagKey: MessageKey;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  accent: string;
  mark: string;
  offsetClass: string;
  rotateClass: string;
};

const WAYS: LearningWay[] = [
  {
    index: "01",
    tagKey: "learningWays.card1.tag",
    titleKey: "learningWays.card1.title",
    bodyKey: "learningWays.card1.body",
    accent: "border-[#3E3E75]/35 bg-[#3E3E75]/10",
    mark: "text-[#3E3E75]/12 dark:text-[#C4C4E8]/12",
    offsetClass: "lg:-translate-y-6",
    rotateClass: "lg:-rotate-[1.4deg]",
  },
  {
    index: "02",
    tagKey: "learningWays.card2.tag",
    titleKey: "learningWays.card2.title",
    bodyKey: "learningWays.card2.body",
    accent: "border-[#3E3E75]/25 bg-background",
    mark: "text-[#3E3E75]/10 dark:text-[#C4C4E8]/10",
    offsetClass: "lg:translate-y-8",
    rotateClass: "lg:rotate-[1.1deg]",
  },
  {
    index: "03",
    tagKey: "learningWays.card3.tag",
    titleKey: "learningWays.card3.title",
    bodyKey: "learningWays.card3.body",
    accent: "border-[#3E3E75]/40 bg-[#3E3E75]/15",
    mark: "text-[#3E3E75]/14 dark:text-[#C4C4E8]/14",
    offsetClass: "lg:-translate-y-2",
    rotateClass: "lg:-rotate-[0.7deg]",
  },
];

export function HomeLearningWaysSection() {
  const { t, dir } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;

  return (
    <section className="relative isolate overflow-hidden px-4 py-16 sm:px-6 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,color-mix(in_oklch,var(--muted)_45%,var(--background)),var(--background)_42%,color-mix(in_oklch,var(--muted)_28%,var(--background)))]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-18deg, transparent, transparent 18px, color-mix(in oklch, var(--foreground) 4%, transparent) 18px, color-mix(in oklch, var(--foreground) 4%, transparent) 19px)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 start-[-10%] size-[28rem] rounded-full bg-[#3E3E75]/10 blur-3xl dark:bg-[#C4C4E8]/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 bottom-[-8%] size-[22rem] rotate-12 border border-[#3E3E75]/15 dark:border-[#C4C4E8]/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[30%] left-[8%] size-24 rotate-45 border border-[#3E3E75]/20 dark:border-[#C4C4E8]/20"
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="max-w-2xl">
          <motion.p
            className="text-xs font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]"
            initial={canAnimate ? { opacity: 0, y: 18 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.8, ease: EASE }}
          >
            {t("learningWays.eyebrow")}
          </motion.p>

          <motion.h2
            className={cn(
              "mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.12]",
              canAnimate && "origin-start"
            )}
            initial={canAnimate ? { opacity: 0, y: 22, rotate: dir === "rtl" ? 1.2 : -1.2 } : false}
            whileInView={{ opacity: 1, y: 0, rotate: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
          >
            {t("learningWays.title")}
          </motion.h2>

          <motion.p
            className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg"
            initial={canAnimate ? { opacity: 0, y: 18 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.85, ease: EASE, delay: 0.1 }}
          >
            {t("learningWays.lead")}
          </motion.p>
        </div>

        <ol className="relative mt-14 grid gap-6 md:grid-cols-3 md:gap-5 lg:mt-20 lg:gap-6">
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-[42%] hidden h-24 w-[calc(100%-4rem)] text-[#3E3E75]/25 md:block dark:text-[#C4C4E8]/25"
            viewBox="0 0 1000 100"
            fill="none"
            preserveAspectRatio="none"
          >
            <path
              d="M40 70 C 220 10, 340 90, 500 40 S 780 20, 960 65"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeDasharray="7 9"
            />
          </svg>

          {WAYS.map((way, index) => (
            <motion.li
              key={way.index}
              className={cn("relative", way.offsetClass)}
              initial={canAnimate ? { opacity: 0, y: 36 } : false}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={VIEWPORT}
              transition={{
                duration: 0.85,
                ease: EASE,
                delay: 0.12 + index * 0.1,
              }}
            >
              <article
                className={cn(
                  "relative flex h-full flex-col overflow-hidden border p-5 sm:p-6",
                  "shadow-[0_24px_50px_-36px_rgba(62,62,117,0.55)]",
                  "[clip-path:polygon(0_0,100%_0,100%_calc(100%-18px),calc(100%-18px)_100%,0_100%)]",
                  way.accent,
                  way.rotateClass
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute -end-2 -top-6 font-semibold tracking-tight select-none",
                    "text-[6.5rem] leading-none sm:text-[7.5rem]",
                    way.mark
                  )}
                >
                  {way.index}
                </span>

                <div className="relative z-[1] flex items-center justify-between gap-3">
                  <span className="text-[0.7rem] font-semibold tracking-[0.18em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
                    {t(way.tagKey)}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2.5 shrink-0",
                      index === 0 && "rounded-full bg-[#3E3E75]",
                      index === 1 && "rotate-45 bg-[#3E3E75]/80",
                      index === 2 && "bg-[#3E3E75]"
                    )}
                  />
                </div>

                <h3 className="relative z-[1] mt-5 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                  {t(way.titleKey)}
                </h3>

                <p className="relative z-[1] mt-4 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-[0.95rem] sm:leading-relaxed">
                  {t(way.bodyKey)}
                </p>

                <div
                  aria-hidden="true"
                  className="relative z-[1] mt-6 flex items-center gap-2 text-[#3E3E75]/50 dark:text-[#C4C4E8]/50"
                >
                  <span className="h-px flex-1 bg-current" />
                  <span className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase">
                    {way.index}
                  </span>
                </div>
              </article>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
