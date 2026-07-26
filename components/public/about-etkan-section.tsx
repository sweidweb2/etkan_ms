"use client";

import Image from "next/image";
import { GravityStarsBackground } from "@/components/animate-ui/components/backgrounds/gravity-stars";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";

export function AboutEtkanSection() {
  const { t } = usePublicI18n();

  return (
    <section className="relative isolate overflow-hidden px-4 pt-16 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--muted)_35%,var(--background)))]"
      />
      <GravityStarsBackground
        aria-hidden="true"
        className="absolute inset-0 text-[#3E3E75]/90 dark:text-[#C4C4E8]"
        starsCount={150}
        starsSize={2.5}
        starsOpacity={0.8}
        glowIntensity={18}
        movementSpeed={0.25}
        mouseInfluence={120}
        gravityStrength={70}
      />

      <div className="relative z-10 mx-auto max-w-5xl">
        <p className="text-sm font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
          {t("about.eyebrow")}
        </p>

        <div className="mt-6 grid gap-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-center">
          <div className="min-w-0">
            <h2 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
              {t("about.title")}
            </h2>
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

        <blockquote className="relative mt-16 max-w-4xl border-y border-[#3E3E75]/15 py-10 dark:border-[#C4C4E8]/15">
          <p className="text-lg leading-relaxed text-foreground/90 text-pretty sm:text-xl sm:leading-relaxed">
            {t("about.closing")}
          </p>
        </blockquote>
      </div>
    </section>
  );
}
