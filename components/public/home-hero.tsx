"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TypewriterPoint } from "@/components/public/typewriter-point";
import { useNavbarDashboardHref } from "@/hooks/use-navbar-dashboard-href";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 10_000;

/** Placeholder course images — replace per card when assets are ready. */
const PLACEHOLDER_IMAGE = "/public_images/solution-built-1.jpg";

/** Shared grey-blue theme for all slides. */
const HERO_THEME = {
  accent: "bg-zinc-400",
  accentSoft: "bg-slate-400/40",
  accentMid: "bg-zinc-300/55",
  patternSquare: "border-zinc-400/35",
  patternCircle: "border-slate-500/30",
  cta: "bg-slate-800 text-white hover:bg-slate-900",
  arrow: "border-border bg-white text-foreground hover:bg-muted",
  dot: "bg-zinc-300",
  dotActive: "bg-slate-800",
  eyebrow: "text-slate-600",
} as const;

type HeroSlide = {
  id: string;
  pointTitleKey: MessageKey;
  pointDescKey: MessageKey;
  ctaKey: MessageKey;
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
    cards: [
      {
        titleKey: "hero.slide1.card1.title",
        bodyKey: "hero.slide1.card1.body",
        imageSrc: PLACEHOLDER_IMAGE,
      },
      {
        titleKey: "hero.slide1.card2.title",
        bodyKey: "hero.slide1.card2.body",
        imageSrc: PLACEHOLDER_IMAGE,
      },
      {
        titleKey: "hero.slide1.card3.title",
        bodyKey: "hero.slide1.card3.body",
        imageSrc: PLACEHOLDER_IMAGE,
      },
    ],
  },
  {
    id: "planning",
    pointTitleKey: "hero.point2.title",
    pointDescKey: "hero.point2.desc",
    ctaKey: "hero.slide2.cta",
    cards: [
      {
        titleKey: "hero.slide2.card1.title",
        bodyKey: "hero.slide2.card1.body",
        imageSrc: PLACEHOLDER_IMAGE,
      },
      {
        titleKey: "hero.slide2.card2.title",
        bodyKey: "hero.slide2.card2.body",
        imageSrc: PLACEHOLDER_IMAGE,
      },
      {
        titleKey: "hero.slide2.card3.title",
        bodyKey: "hero.slide2.card3.body",
        imageSrc: PLACEHOLDER_IMAGE,
      },
    ],
  },
  {
    id: "teamwork",
    pointTitleKey: "hero.point3.title",
    pointDescKey: "hero.point3.desc",
    ctaKey: "hero.slide3.cta",
    cards: [
      {
        titleKey: "hero.slide3.card1.title",
        bodyKey: "hero.slide3.card1.body",
        imageSrc: PLACEHOLDER_IMAGE,
      },
      {
        titleKey: "hero.slide3.card2.title",
        bodyKey: "hero.slide3.card2.body",
        imageSrc: PLACEHOLDER_IMAGE,
      },
      {
        titleKey: "hero.slide3.card3.title",
        bodyKey: "hero.slide3.card3.body",
        imageSrc: PLACEHOLDER_IMAGE,
      },
    ],
  },
];

function HeroAmbientBackground() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-zinc-100"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-zinc-50/80" />
      <motion.div
        className={cn(
          "absolute -top-24 -right-20 size-[22rem] rounded-full blur-3xl",
          HERO_THEME.accent
        )}
        animate={{ x: [0, 18, -8, 0], y: [0, 12, -6, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.2 }}
      />
      <motion.div
        className={cn(
          "absolute -bottom-28 -left-24 size-[24rem] rounded-full blur-3xl",
          HERO_THEME.accentSoft
        )}
        animate={{ x: [0, -14, 10, 0], y: [0, -10, 8, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.4 }}
      />
      <motion.div
        className={cn(
          "absolute top-[38%] -left-10 size-40 rotate-12 rounded-[1.5rem] blur-2xl",
          HERO_THEME.accentMid
        )}
        animate={{ rotate: [12, 22, 8, 12], y: [0, -16, 8, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute right-[12%] bottom-[18%] size-28 rounded-full blur-xl",
          HERO_THEME.accent
        )}
        animate={{ scale: [1, 1.15, 0.95, 1], x: [0, 10, -6, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.16 }}
      />
      <motion.div
        className={cn(
          "absolute top-[18%] left-[28%] size-16 rounded-lg border-2 opacity-30",
          HERO_THEME.patternSquare
        )}
        animate={{ rotate: [0, 12, -6, 0], y: [0, -8, 4, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute right-[30%] top-[55%] size-10 rounded-full border opacity-25",
          HERO_THEME.patternCircle
        )}
        animate={{ y: [0, 10, -4, 0], x: [0, -6, 4, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

type HomeHeroProps = {
  initialDashboardHref: string | null;
};

export function HomeHero({ initialDashboardHref }: HomeHeroProps) {
  const { t, dir } = usePublicI18n();
  const dashboardHref = useNavbarDashboardHref(initialDashboardHref);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const slide = SLIDES[index] ?? SLIDES[0];
  const isRtl = dir === "rtl";

  const goTo = (nextIndex: number, dirDelta: number) => {
    const normalized = (nextIndex + SLIDES.length) % SLIDES.length;
    setDirection(dirDelta);
    setIndex(normalized);
  };

  const goPrev = () => goTo(index - 1, -1);
  const goNext = () => goTo(index + 1, 1);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setDirection(1);
      setIndex((current) => (current + 1) % SLIDES.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [isPaused, index]);

  const ctaHref =
    dashboardHref ??
    (slide.id === "teamwork" ? ROUTES.SIGNUP : ROUTES.CAREERS);
  const ctaLabel = dashboardHref
    ? t("hero.ctaDashboard")
    : t(slide.ctaKey);

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

      <div className="relative z-10 mx-auto w-full px-10 py-8 sm:px-14 sm:py-10 lg:px-20 xl:px-28">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * (isRtl ? -40 : 40) }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * (isRtl ? 40 : -40) }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10 xl:gap-12"
          >
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
              <p className="mt-6 text-xl leading-snug sm:text-2xl lg:text-[1.7rem] lg:leading-snug">
                <TypewriterPoint
                  key={slide.pointTitleKey}
                  text={t(slide.pointTitleKey)}
                  holdMs={5000}
                />
              </p>
              <p
                className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg"
                suppressHydrationWarning
              >
                {t(slide.pointDescKey)}
              </p>
              <Link
                href={ctaHref}
                suppressHydrationWarning
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "mt-8 border-transparent",
                  HERO_THEME.cta
                )}
              >
                {ctaLabel}
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {slide.cards.map((card) => (
                <Card
                  key={card.titleKey}
                  size="sm"
                  className="gap-3 bg-white p-3 shadow-sm ring-foreground/8"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={card.imageSrc}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 280px"
                    />
                  </div>
                  <CardHeader className="gap-1 p-0 px-0.5">
                    <CardTitle suppressHydrationWarning>
                      {t(card.titleKey)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 px-0.5 pb-0.5">
                    <CardDescription
                      className="line-clamp-3 text-pretty"
                      suppressHydrationWarning
                    >
                      {t(card.bodyKey)}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {SLIDES.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={`${t("hero.carouselLabel")} ${i + 1}`}
                onClick={() => goTo(i, i > index ? 1 : -1)}
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
