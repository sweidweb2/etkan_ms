"use client";

import { motion, useReducedMotion } from "motion/react";
import { AwardIcon, GraduationCapIcon, ScrollTextIcon } from "lucide-react";
import { useHydrated } from "@/hooks/use-hydrated";
import type { MessageKey } from "@/lib/i18n/messages";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.2, margin: "0px 0px -8% 0px" } as const;

type CertificateItem = {
  index: string;
  tagKey: MessageKey;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  Icon: typeof AwardIcon;
};

const CERTIFICATES: CertificateItem[] = [
  {
    index: "01",
    tagKey: "homeCertificates.card1.tag",
    titleKey: "homeCertificates.card1.title",
    bodyKey: "homeCertificates.card1.body",
    Icon: AwardIcon,
  },
  {
    index: "02",
    tagKey: "homeCertificates.card2.tag",
    titleKey: "homeCertificates.card2.title",
    bodyKey: "homeCertificates.card2.body",
    Icon: GraduationCapIcon,
  },
  {
    index: "03",
    tagKey: "homeCertificates.card3.tag",
    titleKey: "homeCertificates.card3.title",
    bodyKey: "homeCertificates.card3.body",
    Icon: ScrollTextIcon,
  },
];

export function HomeCertificatesSection() {
  const { t } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;

  return (
    <section className="relative isolate overflow-hidden px-4 py-16 sm:px-6 sm:py-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--muted)_30%,var(--background)),var(--background)_48%,color-mix(in_oklch,var(--muted)_22%,var(--background)))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,#3E3E75_50%,transparent)] opacity-40 dark:bg-[linear-gradient(90deg,transparent,#C4C4E8_50%,transparent)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 end-[-8%] size-[24rem] rounded-full bg-[#3E3E75]/8 blur-3xl dark:bg-[#C4C4E8]/8"
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
            {t("homeCertificates.eyebrow")}
          </motion.p>

          <motion.h2
            className="mt-4 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            initial={canAnimate ? { opacity: 0, y: 20 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
          >
            {t("homeCertificates.title")}
          </motion.h2>

          <motion.p
            className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg"
            initial={canAnimate ? { opacity: 0, y: 16 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.85, ease: EASE, delay: 0.1 }}
          >
            {t("homeCertificates.lead")}
          </motion.p>
        </div>

        <ol className="mt-12 grid gap-5 md:mt-16 md:grid-cols-3 md:gap-6">
          {CERTIFICATES.map((item, index) => {
            const Icon = item.Icon;
            return (
              <motion.li
                key={item.index}
                initial={canAnimate ? { opacity: 0, y: 28 } : false}
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
                    "relative flex h-full flex-col border border-[#3E3E75]/20 bg-background/90 p-5 sm:p-6",
                    "shadow-[0_20px_48px_-34px_rgba(62,62,117,0.5)]",
                    "dark:border-[#C4C4E8]/20"
                  )}
                >
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-3 top-3 h-px bg-[#3E3E75]/25 dark:bg-[#C4C4E8]/25"
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-3 bottom-3 h-px bg-[#3E3E75]/15 dark:bg-[#C4C4E8]/15"
                  />

                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex size-10 items-center justify-center border border-[#3E3E75]/25 text-[#3E3E75] dark:border-[#C4C4E8]/30 dark:text-[#C4C4E8]">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="text-[0.7rem] font-semibold tracking-[0.18em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
                      {t(item.tagKey)}
                    </span>
                  </div>

                  <h3 className="mt-6 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                    {t(item.titleKey)}
                  </h3>

                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-[0.95rem]">
                    {t(item.bodyKey)}
                  </p>

                  <p className="mt-6 text-[0.65rem] font-semibold tracking-[0.22em] text-[#3E3E75]/55 uppercase dark:text-[#C4C4E8]/55">
                    {t("homeCertificates.seal")} · {item.index}
                  </p>
                </article>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
