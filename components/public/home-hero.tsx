"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { CourseCardImage } from "@/components/public/course-card-image";
import { HERO_THEME } from "@/components/public/home-hero-theme";
import { TypewriterPoint } from "@/components/public/typewriter-point";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 10_000;

/** Compact Unsplash URLs sized for ~280–560px display slots. */
function heroImage(photoId: string): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=800&q=70`;
}

type HeroSlide = {
  id: string;
  pointTitleKey: MessageKey;
  pointDescKey: MessageKey;
  ctaKey: MessageKey;
  ctaHref: string;
  cards: Array<{
    titleKey: MessageKey;
    bodyKey: MessageKey;
    imageSrc: string;
  }>;
};

const SLIDES: HeroSlide[] = [
  {
    id: "training",
    pointTitleKey: "hero.point1.title",
    pointDescKey: "hero.point1.desc",
    ctaKey: "hero.slide1.cta",
    ctaHref: ROUTES.CAREERS,
    cards: [
      {
        titleKey: "hero.slide1.card1.title",
        bodyKey: "hero.slide1.card1.body",
        imageSrc: heroImage("photo-1690683789978-3cf73960d650"),
      },
      {
        titleKey: "hero.slide1.card2.title",
        bodyKey: "hero.slide1.card2.body",
        imageSrc: heroImage("photo-1634452015397-ad0686a2ae2d"),
      },
    ],
  },
  {
    id: "planning",
    pointTitleKey: "hero.point2.title",
    pointDescKey: "hero.point2.desc",
    ctaKey: "hero.slide2.cta",
    ctaHref: `${ROUTES.CAREERS}#roadmap-stages`,
    cards: [
      {
        titleKey: "hero.slide2.card1.title",
        bodyKey: "hero.slide2.card1.body",
        imageSrc: heroImage("photo-1621839673705-6617adf9e890"),
      },
      {
        titleKey: "hero.slide2.card2.title",
        bodyKey: "hero.slide2.card2.body",
        imageSrc: heroImage("photo-1461749280684-dccba630e2f6"),
      },
    ],
  },
  {
    id: "teamwork",
    pointTitleKey: "hero.point3.title",
    pointDescKey: "hero.point3.desc",
    ctaKey: "hero.slide3.cta",
    ctaHref: ROUTES.REGISTER,
    cards: [
      {
        titleKey: "hero.slide3.card1.title",
        bodyKey: "hero.slide3.card1.body",
        imageSrc: heroImage("photo-1704283860614-803aa8be7993"),
      },
      {
        titleKey: "hero.slide3.card2.title",
        bodyKey: "hero.slide3.card2.body",
        imageSrc: heroImage("photo-1592659762303-90081d34b277"),
      },
    ],
  },
];

function HeroAmbientFallback() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-zinc-100"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-zinc-50/70" />
      <div
        className={cn(
          "absolute -top-24 -right-16 size-[24rem] rounded-full blur-3xl opacity-30",
          HERO_THEME.accent
        )}
      />
      <div
        className={cn(
          "absolute -bottom-24 -left-20 size-[28rem] rounded-full blur-3xl opacity-45",
          HERO_THEME.accentSoft
        )}
      />
    </div>
  );
}

const HeroAmbientBackground = dynamic(
  () =>
    import("@/components/public/home-hero-ambient").then(
      (m) => m.HeroAmbientBackground
    ),
  { ssr: false, loading: () => <HeroAmbientFallback /> }
);

const CurvedInput = dynamic(() => import("@/components/CurvedInput"), {
  ssr: false,
  loading: () => (
    <div
      className="h-14 w-full max-w-xl rounded-[18px] border border-slate-300 bg-white"
      aria-hidden="true"
    />
  ),
});

export function HomeHero() {
  const { t, dir } = usePublicI18n();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const isRtl = dir === "rtl";

  const goTo = (nextIndex: number) => {
    const normalized = (nextIndex + SLIDES.length) % SLIDES.length;
    if (normalized === index) return;
    setIndex(normalized);
  };

  const goPrev = () => goTo(index - 1);
  const goNext = () => goTo(index + 1);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [isPaused, index]);

  const PrevIcon = isRtl ? ChevronRightIcon : ChevronLeftIcon;
  const NextIcon = isRtl ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <section
      className="relative overflow-hidden pt-16 sm:pt-20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label={t("hero.carouselLabel")}
    >
      <HeroAmbientBackground />

      <div className="relative z-10 mx-auto w-full px-12 py-8 sm:px-16 sm:py-10 lg:px-24 xl:px-32">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 xl:gap-12">
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm font-semibold tracking-[0.18em] uppercase",
                HERO_THEME.eyebrow
              )}
              suppressHydrationWarning
            >
              {t("brand.name")}
            </p>
            <h1
              className="mt-4 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-[2.65rem] lg:leading-[1.2]"
              suppressHydrationWarning
            >
              {t("hero.topic")}
            </h1>

            <div className="relative mt-6 overflow-hidden">
              {SLIDES.map((item, i) => {
                const isActive = i === index;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "min-w-0 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      isActive
                        ? "relative z-10 opacity-100"
                        : "pointer-events-none absolute inset-x-0 top-0 z-0 opacity-0"
                    )}
                    aria-hidden={!isActive}
                  >
                    <p className="min-h-[2.75lh] text-xl leading-snug sm:text-2xl lg:min-h-[3.3lh] lg:text-[1.7rem] lg:leading-snug">
                      {isActive ? (
                        <TypewriterPoint
                          key={t(item.pointTitleKey)}
                          text={t(item.pointTitleKey)}
                          holdMs={5000}
                          startFilled
                        />
                      ) : (
                        <span className="invisible" aria-hidden="true">
                          {t(item.pointTitleKey)}
                        </span>
                      )}
                    </p>
                    <p
                      className="mt-4 min-h-[3.25rem] max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty sm:min-h-[3.5rem] sm:text-lg"
                      suppressHydrationWarning
                    >
                      {t(item.pointDescKey)}
                    </p>
                    <div className="mt-8">
                      <Link
                        href={item.ctaHref}
                        tabIndex={isActive ? undefined : -1}
                        suppressHydrationWarning
                        className={cn(
                          buttonVariants({ size: "lg" }),
                          "relative z-20 inline-flex border-transparent",
                          HERO_THEME.cta,
                          !isActive && "invisible"
                        )}
                      >
                        {t(item.ctaKey)}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <div className="relative grid min-h-0 overflow-hidden [&>*]:col-start-1 [&>*]:row-start-1">
              {SLIDES.map((item, i) => {
                const isActive = i === index;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "grid gap-4 transition-opacity duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:grid-cols-2",
                      isActive
                        ? "relative z-10 opacity-100"
                        : "pointer-events-none absolute inset-x-0 top-0 z-0 opacity-0"
                    )}
                    aria-hidden={!isActive}
                  >
                    {item.cards.map((card) => (
                      <Link
                        key={card.titleKey}
                        href={ROUTES.CAREERS}
                        tabIndex={isActive ? undefined : -1}
                        suppressHydrationWarning
                        className="group block rounded-xl outline-none transition-transform duration-500 ease-out hover:-translate-y-1.5 hover:scale-[1.025] hover:shadow-xl focus-visible:ring-2 focus-visible:ring-[#7B7BB8]/50"
                      >
                        <Card
                          size="sm"
                          className="h-full gap-3 overflow-hidden bg-white p-3 shadow-sm ring-foreground/8 transition-shadow duration-500 ease-out group-hover:shadow-lg group-hover:ring-foreground/12"
                        >
                          <CourseCardImage
                            src={card.imageSrc}
                            alt={t(card.titleKey)}
                            className="bg-muted"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 45vw, 280px"
                            priority={i === 0}
                          />
                          <CardHeader className="gap-1 p-0 px-0.5">
                            <CardTitle
                              className="min-h-[1.5lh]"
                              suppressHydrationWarning
                            >
                              {t(card.titleKey)}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-0 px-0.5 pb-0.5">
                            <CardDescription
                              className="line-clamp-3 min-h-[3.75em] text-pretty"
                              suppressHydrationWarning
                            >
                              {t(card.bodyKey)}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>

            <div className="flex w-full justify-center xl:justify-start">
              <CurvedInput
                placeholder={t("hero.curvedInput.placeholder")}
                buttonText={t("hero.curvedInput.button")}
                theme="light"
                bend={18}
                height={56}
                width="100%"
                showButton
                showIcon
                type="email"
                cornerRadius={18}
                borderWidth={1.5}
                fontSize={15}
                backgroundColor="#ffffff"
                textColor="#1e293b"
                borderColor="#cbd5e1"
                buttonColor="#1e293b"
                buttonTextColor="#ffffff"
                shadowSize="sm"
                onSubmit={() => {
                  router.push(ROUTES.REGISTER);
                }}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {SLIDES.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`${t("hero.carouselLabel")} ${i + 1}`}
                onClick={() => goTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index
                    ? cn("w-6", HERO_THEME.dotActive)
                    : cn("w-2", HERO_THEME.dot)
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("hero.prev")}
              onClick={goPrev}
              className={cn("rounded-full", HERO_THEME.arrow)}
            >
              <PrevIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("hero.next")}
              onClick={goNext}
              className={cn("rounded-full", HERO_THEME.arrow)}
            >
              <NextIcon />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
