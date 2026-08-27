"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import CurvedInput from "@/components/CurvedInput";
import { CourseCardImage } from "@/components/public/course-card-image";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TypewriterPoint } from "@/components/public/typewriter-point";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 10_000;
const SLIDE_EASE = [0.22, 1, 0.36, 1] as const;
const SLIDE_MS = 0.5;

/** Shared indigo brand theme for all slides (#3E3E75). */
const HERO_THEME = {
  accent: "bg-[#7B7BB8]",
  accentSoft: "bg-[#9A9AD0]/40",
  accentMid: "bg-[#C4C4E8]/55",
  patternSquare: "border-[#7B7BB8]/35",
  patternCircle: "border-[#3E3E75]/30",
  cta: "bg-[#3E3E75] text-white hover:bg-[#2F2F5A]",
  arrow: "border-border bg-white text-foreground hover:bg-muted",
  dot: "bg-[#C4C4E8]",
  dotActive: "bg-[#3E3E75]",
  eyebrow: "text-[#3E3E75]",
} as const;

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
        imageSrc:
          "https://images.unsplash.com/photo-1690683789978-3cf73960d650?q=80&w=1509&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        titleKey: "hero.slide1.card2.title",
        bodyKey: "hero.slide1.card2.body",
        imageSrc:
          "https://media.istockphoto.com/id/2276854525/photo/electronic-components-and-hardware-engineering-tools-organized-on-a-dark-work-desk-close-up.jpg?s=2048x2048&w=is&k=20&c=vL9Xly7erRY2XdCOi8Wss3hhe5ZsY7i9jFRZe9JbZdQ=",
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
        imageSrc:
          "https://images.unsplash.com/photo-1621839673705-6617adf9e890?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        titleKey: "hero.slide2.card2.title",
        bodyKey: "hero.slide2.card2.body",
        imageSrc:
          "https://media.istockphoto.com/id/1355140477/photo/top-view-of-laptop-with-text-html5.jpg?s=2048x2048&w=is&k=20&c=uSkopBhFAAajALqs8xZCXZODKXaOklYH_OikPcytYEI=",
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
        imageSrc:
          "https://images.unsplash.com/photo-1704283860614-803aa8be7993?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
      {
        titleKey: "hero.slide3.card2.title",
        bodyKey: "hero.slide3.card2.body",
        imageSrc:
          "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=1073&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      },
    ],
  },
];

function HeroAmbientBackground() {
  const dots = [
    { top: "68%", left: "28%", size: "size-2.5", duration: 7 },
    { top: "18%", left: "58%", size: "size-2", duration: 8.5 },
    { top: "62%", left: "60%", size: "size-3", duration: 10 },
    { top: "42%", left: "15%", size: "size-2", duration: 6.5 },
    { top: "78%", left: "78%", size: "size-2.5", duration: 9 },
    { top: "30%", left: "78%", size: "size-2", duration: 7.5 },
    { top: "52%", left: "48%", size: "size-1.5", duration: 6 },
    { top: "8%", left: "32%", size: "size-2", duration: 8 },
    { top: "88%", left: "40%", size: "size-2.5", duration: 11 },
    { top: "36%", left: "88%", size: "size-2", duration: 9.5 },
  ] as const;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-zinc-100"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-zinc-50/70" />

      <motion.div
        className={cn(
          "absolute -top-24 -right-16 size-[24rem] rounded-full blur-3xl",
          HERO_THEME.accent
        )}
        animate={{ x: [0, 28, -14, 0], y: [0, 18, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.28 }}
      />
      <motion.div
        className={cn(
          "absolute -bottom-24 -left-20 size-[28rem] rounded-full blur-3xl",
          HERO_THEME.accentSoft
        )}
        animate={{ x: [0, -22, 16, 0], y: [0, -14, 12, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.48 }}
      />
      <motion.div
        className={cn(
          "absolute top-[38%] left-[42%] size-[20rem] rounded-full blur-3xl",
          HERO_THEME.accentMid
        )}
        animate={{ scale: [1, 1.2, 0.92, 1], x: [0, 24, -18, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.34 }}
      />
      <motion.div
        className={cn(
          "absolute top-[8%] left-[8%] size-[16rem] rounded-full blur-3xl",
          HERO_THEME.accentSoft
        )}
        animate={{ x: [0, 16, -10, 0], y: [0, 14, -8, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.3 }}
      />
      <motion.div
        className={cn(
          "absolute right-[5%] bottom-[8%] size-[14rem] rounded-full blur-3xl",
          HERO_THEME.accent
        )}
        animate={{ scale: [1, 1.15, 0.9, 1], y: [0, -12, 8, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.22 }}
      />

      <motion.div
        className={cn(
          "absolute top-[30%] -left-6 size-44 rotate-12 rounded-[1.75rem] blur-2xl",
          HERO_THEME.accentMid
        )}
        animate={{ rotate: [12, 28, 6, 12], y: [0, -22, 10, 0], x: [0, 12, -8, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute top-[55%] right-[2%] size-36 -rotate-6 rounded-[1.25rem] blur-2xl",
          HERO_THEME.accent
        )}
        animate={{ rotate: [-6, 8, -14, -6], y: [0, 14, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.35 }}
      />

      <motion.div
        className={cn(
          "absolute top-[14%] left-[20%] size-[4.25rem] rounded-lg border-2 opacity-40",
          HERO_THEME.patternSquare
        )}
        animate={{ rotate: [0, 18, -10, 0], y: [0, -14, 8, 0], x: [0, 10, -6, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute top-[40%] right-[22%] size-12 rounded-md border-2 opacity-35",
          HERO_THEME.patternSquare
        )}
        animate={{ rotate: [8, -12, 16, 8], y: [0, 12, -8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute bottom-[18%] left-[18%] size-9 rounded-sm border opacity-30",
          HERO_THEME.patternSquare
        )}
        animate={{ rotate: [0, 25, -15, 0], x: [0, 10, -6, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className={cn(
          "absolute right-[26%] top-[48%] size-11 rounded-full border-2 opacity-35",
          HERO_THEME.patternCircle
        )}
        animate={{ y: [0, 16, -8, 0], x: [0, -12, 8, 0], scale: [1, 1.12, 0.94, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute top-[26%] left-[48%] size-8 rounded-full border-2 opacity-30",
          HERO_THEME.patternCircle
        )}
        animate={{ y: [0, -12, 8, 0], x: [0, 14, -8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute bottom-[28%] right-[12%] size-7 rounded-full border opacity-30",
          HERO_THEME.patternCircle
        )}
        animate={{ scale: [1, 1.25, 0.9, 1], y: [0, -10, 6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className={cn(
          "absolute top-[20%] right-[16%] size-9 border-2 opacity-35",
          HERO_THEME.patternSquare
        )}
        animate={{ rotate: [45, 70, 35, 45], y: [0, -18, 10, 0], x: [0, 14, -8, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute bottom-[40%] left-[8%] size-7 border opacity-30",
          HERO_THEME.patternSquare
        )}
        animate={{ rotate: [45, 20, 60, 45], y: [0, 14, -8, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-[56%] left-[10%] h-24 w-8 rounded-full border-2 border-zinc-400/35 opacity-45"
        animate={{ y: [0, -20, 12, 0], rotate: [-8, 10, -4, -8] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[7%] top-[24%] h-7 w-28 rounded-full border-2 border-slate-400/35 opacity-40"
        animate={{ x: [0, -22, 14, 0], rotate: [0, -6, 4, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[72%] left-[52%] h-5 w-20 rounded-full border border-zinc-400/30 opacity-40"
        animate={{ x: [0, 18, -12, 0], y: [0, -8, 6, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[12%] left-[62%] h-16 w-6 rounded-full border-2 border-slate-400/30 opacity-35"
        animate={{ y: [0, 16, -10, 0], rotate: [6, -8, 4, 6] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute bottom-[20%] right-[38%] size-20 rounded-full border-[3px] border-zinc-400/30 opacity-45"
        animate={{ scale: [1, 1.18, 0.9, 1], rotate: [0, 40, -20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[24%] right-[40.5%] size-12 rounded-full border border-slate-500/30 opacity-40"
        animate={{ scale: [1, 0.85, 1.1, 1], rotate: [0, -50, 25, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[34%] left-[68%] size-16 rounded-full border-2 border-zinc-400/25 opacity-40"
        animate={{ scale: [1, 1.2, 0.88, 1], x: [0, -10, 8, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-[46%] left-[34%] size-14 opacity-30"
        style={{
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          backgroundColor: "rgba(113,113,122,0.4)",
        }}
        animate={{ y: [0, -16, 8, 0], rotate: [0, 15, -8, 0], x: [0, 12, -6, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[18%] left-[38%] size-10 opacity-25"
        style={{
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          backgroundColor: "rgba(100,116,139,0.45)",
        }}
        animate={{ y: [0, 12, -8, 0], rotate: [180, 195, 170, 180] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-[10%] left-[52%] h-16 w-px bg-zinc-400/35"
        animate={{ y: [0, 18, -8, 0], opacity: [0.3, 0.5, 0.25, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[16%] left-[49%] h-px w-16 bg-zinc-400/35"
        animate={{ x: [0, 14, -10, 0], opacity: [0.25, 0.45, 0.2, 0.25] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[32%] left-[72%] h-12 w-px bg-slate-400/30"
        animate={{ y: [0, -14, 8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[36%] left-[69%] h-px w-12 bg-slate-400/30"
        animate={{ x: [0, -10, 8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {dots.map((dot, i) => (
        <motion.div
          key={`dot-${i}`}
          className={cn("absolute rounded-full bg-slate-500/40", dot.size)}
          style={{ top: dot.top, left: dot.left }}
          animate={{
            y: [0, i % 2 === 0 ? -22 : 18, i % 2 === 0 ? 10 : -10, 0],
            x: [0, i % 2 === 0 ? 14 : -12, i % 2 === 0 ? -8 : 8, 0],
            scale: [1, 1.25, 0.9, 1],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}

      <motion.div
        className="absolute bottom-[12%] left-[40%] size-14 rounded-md border-2 border-dashed border-zinc-400/35 opacity-45"
        animate={{ rotate: [0, -20, 12, 0], y: [0, 12, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[58%] left-[78%] size-10 rounded-full border border-dashed border-slate-400/35 opacity-40"
        animate={{ rotate: [0, 40, -20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-[60%] right-[12%] h-20 w-20 rounded-full border-t-[3px] border-r-[3px] border-slate-400/30 opacity-45"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute top-[8%] right-[32%] h-14 w-14 rounded-full border-b-[2px] border-l-[2px] border-zinc-400/30 opacity-40"
        animate={{ rotate: [360, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute bottom-[8%] left-[28%] h-16 w-16 rounded-full border-t-[2px] border-l-[2px] border-slate-500/25 opacity-35"
        animate={{ rotate: [0, -360] }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

function slideOffset(isActive: boolean, isExiting: boolean, direction: number, isRtl: boolean) {
  if (isActive) return 0;
  const sign = isRtl ? -1 : 1;
  // Exiting slide drifts opposite to travel; idle slides sit offstage ready to enter.
  if (isExiting) return -direction * 36 * sign;
  return direction * 36 * sign;
}

export function HomeHero() {
  const { t, dir } = usePublicI18n();
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const isRtl = dir === "rtl";

  const goTo = (nextIndex: number, dirDelta: number) => {
    const normalized = (nextIndex + SLIDES.length) % SLIDES.length;
    if (normalized === index) return;
    setPrevIndex(index);
    setDirection(dirDelta);
    setIndex(normalized);
  };

  const goPrev = () => goTo(index - 1, -1);
  const goNext = () => goTo(index + 1, 1);

  useEffect(() => {
    if (isPaused) return;
    const timer = window.setInterval(() => {
      setPrevIndex(index);
      setDirection(1);
      setIndex((index + 1) % SLIDES.length);
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

            {/* Stack keeps height = tallest slide; only the active slide is in flow for hit-testing. */}
            <div className="relative mt-6 overflow-hidden">
              {SLIDES.map((item, i) => {
                const isActive = i === index;
                const isExiting = i === prevIndex && i !== index;
                return (
                  <motion.div
                    key={item.id}
                    initial={false}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      x: slideOffset(isActive, isExiting, direction, isRtl),
                    }}
                    transition={{
                      duration: isActive || isExiting ? SLIDE_MS : 0,
                      ease: SLIDE_EASE,
                    }}
                    className={cn(
                      "min-w-0",
                      isActive
                        ? "relative z-10"
                        : "pointer-events-none absolute inset-x-0 top-0 z-0"
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
                  </motion.div>
                );
              })}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
          <div className="relative grid min-h-0 overflow-hidden [&>*]:col-start-1 [&>*]:row-start-1">
              {SLIDES.map((item, i) => {
                const isActive = i === index;
                const isExiting = i === prevIndex && i !== index;
                return (
                  <motion.div
                    key={item.id}
                    initial={false}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      x: slideOffset(isActive, isExiting, direction, isRtl),
                    }}
                    transition={{
                      duration: isActive || isExiting ? SLIDE_MS : 0,
                      ease: SLIDE_EASE,
                    }}
                    className={cn(
                      "grid gap-4 sm:grid-cols-2",
                      isActive
                        ? "relative z-10"
                        : "pointer-events-none absolute inset-x-0 top-0 z-0"
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
                  </motion.div>
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
