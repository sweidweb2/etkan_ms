"use client";

import Image from "next/image";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

const PILLARS: Array<{
  index: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
}> = [
  {
    index: "01",
    titleKey: "about.pillar.1.title",
    bodyKey: "about.pillar.1.body",
  },
  {
    index: "02",
    titleKey: "about.pillar.2.title",
    bodyKey: "about.pillar.2.body",
  },
  {
    index: "03",
    titleKey: "about.pillar.3.title",
    bodyKey: "about.pillar.3.body",
  },
  {
    index: "04",
    titleKey: "about.pillar.4.title",
    bodyKey: "about.pillar.4.body",
  },
];

export function AboutEtkanSection() {
  const { t } = usePublicI18n();

  return (
    <section className="relative isolate overflow-hidden px-4 pt-28 pb-20 sm:px-6 sm:pb-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_0%_0%,oklch(0.82_0.07_230_/_0.28),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_20%,oklch(0.9_0.04_160_/_0.2),transparent_50%),linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--muted)_40%,var(--background)))]"
      />

      <div className="relative mx-auto max-w-5xl">
        <p className="text-sm font-semibold tracking-[0.2em] text-sky-800 uppercase dark:text-sky-300">
          {t("about.eyebrow")}
        </p>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
          <div className="min-w-0">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              {t("about.title")}
            </h1>
            <p className="mt-8 max-w-3xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
              {t("about.lead")}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:mx-0 lg:max-w-none">
            <Image
              src="/public_images/about_1.png"
              alt={t("about.image.alt")}
              width={1024}
              height={768}
              className="h-auto w-full bg-transparent object-contain"
              priority
            />
          </div>
        </div>

        <div className="mt-16">
          <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            {t("about.journey.eyebrow")}
          </p>

          <ol className="relative mt-8 grid gap-8 lg:grid-cols-4 lg:gap-6">
            <div
              aria-hidden="true"
              className="absolute start-[1.15rem] top-3 bottom-3 w-px bg-gradient-to-b from-sky-600/50 via-border to-transparent lg:hidden"
            />

            {PILLARS.map((pillar, index) => (
              <li
                key={pillar.index}
                className={cn(
                  "relative flex flex-col gap-3 py-6 lg:py-0",
                  index !== PILLARS.length - 1 &&
                    "border-b border-border/60 lg:border-b-0 lg:border-e lg:border-border/60 lg:pe-6"
                )}
              >
                <div className="relative z-10 flex size-9 items-center justify-center rounded-full border border-sky-700/20 bg-background text-xs font-semibold tracking-wide text-sky-800 shadow-sm dark:border-sky-300/25 dark:text-sky-300 sm:size-11 sm:text-sm">
                  {pillar.index}
                </div>
                <div className="min-w-0 ps-12 lg:ps-0">
                  <h2 className="text-lg font-semibold tracking-tight sm:text-xl lg:text-lg xl:text-xl">
                    {t(pillar.titleKey)}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                    {t(pillar.bodyKey)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <blockquote className="relative mt-16 max-w-4xl border-y border-sky-700/15 py-10 dark:border-sky-300/15">
          <p className="text-lg leading-relaxed text-foreground/90 text-pretty sm:text-xl sm:leading-relaxed">
            {t("about.closing")}
          </p>
        </blockquote>
      </div>
    </section>
  );
}
