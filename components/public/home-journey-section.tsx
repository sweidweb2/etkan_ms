"use client";

import { GravityStarsBackground } from "@/components/animate-ui/components/backgrounds/gravity-stars";
import { SolutionCollage } from "@/components/public/solution-collage";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";

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

export function HomeJourneySection() {
  const { t } = usePublicI18n();

  return (
    <section className="relative isolate overflow-hidden px-4 py-8 sm:px-6 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--muted)_35%,var(--background)))]"
      />
      <GravityStarsBackground
        aria-hidden="true"
        className="absolute inset-0 text-[#3E3E75]/90 dark:text-[#C4C4E8]"
        starsCount={70}
        starsSize={2.5}
        starsOpacity={0.8}
        glowIntensity={18}
        movementSpeed={0.25}
        mouseInfluence={120}
        gravityStrength={70}
      />

      <div className="relative z-10 mx-auto max-w-5xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
          {t("about.journey.eyebrow")}
        </p>

        <div className="mt-8 grid items-stretch gap-8 lg:grid-cols-2 lg:gap-10">
          <ol className="flex flex-col">
            {PILLARS.map((pillar, index) => (
              <li key={pillar.index}>
                <div className="flex items-start gap-4 py-4 sm:gap-5 sm:py-5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#3E3E75]/20 bg-background/80 text-xs font-semibold tracking-wide text-[#3E3E75] dark:border-[#C4C4E8]/25 dark:text-[#C4C4E8] sm:size-10 sm:text-sm">
                    {pillar.index}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold tracking-tight sm:text-lg">
                      {t(pillar.titleKey)}
                    </h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                      {t(pillar.bodyKey)}
                    </p>
                  </div>
                </div>
                {index !== PILLARS.length - 1 ? (
                  <hr className="border-0 border-t border-border/70" />
                ) : null}
              </li>
            ))}
          </ol>

          <SolutionCollage className="h-full" />
        </div>
      </div>
    </section>
  );
}
