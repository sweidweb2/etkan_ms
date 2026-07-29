"use client";

import { motion, useReducedMotion } from "motion/react";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.2, margin: "0px 0px -8% 0px" } as const;

export function AboutEtkanSection() {
  const { t } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;
  const titleId = "about-vision-mission-title";

  const cards = [
    {
      id: "vision",
      labelKey: "about.vision.label" as const,
      bodyKey: "about.vision.body" as const,
      index: "01",
      accent: "from-[#3E3E75]/20 via-[#3E3E75]/5 to-transparent",
      ring: "ring-[#3E3E75]/20 dark:ring-[#C4C4E8]/25",
      bar: "bg-[#3E3E75] dark:bg-[#C4C4E8]",
      offset: "lg:translate-y-4",
    },
    {
      id: "mission",
      labelKey: "about.mission.label" as const,
      bodyKey: "about.mission.body" as const,
      index: "02",
      accent: "from-[#9A9AD0]/25 via-[#C4C4E8]/8 to-transparent",
      ring: "ring-[#9A9AD0]/25 dark:ring-[#C4C4E8]/30",
      bar: "bg-[#9A9AD0] dark:bg-[#E8E8F3]",
      offset: "lg:-translate-y-4",
    },
  ] as const;

  return (
    <section
      aria-labelledby={titleId}
      className="relative isolate overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-20 sm:pb-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,color-mix(in_oklch,var(--muted)_40%,var(--background)),var(--background)_48%,color-mix(in_oklch,var(--muted)_28%,var(--background)))]"
      />

      {/* Soft vignette + arc motif */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, color-mix(in oklch, var(--primary) 18%, transparent), transparent 60%)",
        }}
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 start-1/2 h-[28rem] w-[min(92vw,56rem)] -translate-x-1/2 text-[#3E3E75]/15 dark:text-[#C4C4E8]/15"
        viewBox="0 0 800 400"
        fill="none"
      >
        <path
          d="M40 320 C180 80, 620 80, 760 320"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path
          d="M90 340 C220 140, 580 140, 710 340"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.55"
          strokeDasharray="5 8"
        />
      </svg>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
            {t("about.eyebrow")}
          </p>
          <h2
            id={titleId}
            className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]"
          >
            {t("about.title")}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
            {t("about.lead")}
          </p>
        </div>

        <div className="relative mt-14 grid gap-6 md:grid-cols-2 md:gap-8 lg:mt-16">
          {/* Center spine */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-8 bottom-8 start-1/2 hidden w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-[#3E3E75]/30 to-transparent md:block dark:via-[#C4C4E8]/30"
          />

          {cards.map((card, index) => {
            const body = (
              <article
                className={cn(
                  "relative overflow-hidden rounded-[1.75rem] bg-background/80 p-7 ring-1 backdrop-blur-sm sm:p-9",
                  "shadow-[0_28px_60px_-40px_rgba(62,62,117,0.45)]",
                  card.ring,
                  card.offset
                )}
              >
                <div
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-0 bg-gradient-to-br",
                    card.accent
                  )}
                />
                <div
                  aria-hidden="true"
                  className={cn(
                    "absolute top-0 start-8 h-1 w-16 rounded-full sm:start-9",
                    card.bar
                  )}
                />

                <div className="relative">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-xs font-semibold tracking-[0.22em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
                      {t(card.labelKey)}
                    </p>
                    <span
                      className="font-mono text-3xl font-semibold tracking-tight text-[#3E3E75]/20 dark:text-[#C4C4E8]/25"
                      aria-hidden="true"
                    >
                      {card.index}
                    </span>
                  </div>
                  <p className="mt-6 text-base leading-relaxed text-foreground/90 text-pretty sm:text-lg sm:leading-relaxed">
                    {t(card.bodyKey)}
                  </p>
                </div>
              </article>
            );

            if (!canAnimate) {
              return <div key={card.id}>{body}</div>;
            }

            return (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={VIEWPORT}
                transition={{
                  duration: 0.55,
                  ease: EASE,
                  delay: index * 0.08,
                }}
              >
                {body}
              </motion.div>
            );
          })}
        </div>

        <blockquote className="relative mx-auto mt-16 max-w-3xl border-y border-[#3E3E75]/15 py-10 text-center dark:border-[#C4C4E8]/15">
          <p className="text-lg leading-relaxed text-foreground/90 text-pretty sm:text-xl sm:leading-relaxed">
            {t("about.closing")}
          </p>
        </blockquote>
      </div>
    </section>
  );
}
