"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  FEATURED_LIFE_BLOGS,
  LIFE_BLOG_CATEGORY_LABEL_KEYS,
  type FeaturedLifeBlog,
} from "@/lib/constants/public-life-blogs";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const AUTO_ADVANCE_MS = 8_000;
const SLIDE_EASE = [0.22, 1, 0.36, 1] as const;
const SLIDE_MS = 0.55;
const IMAGE_SIZES = "(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px";

function slideOffset(
  isActive: boolean,
  isExiting: boolean,
  direction: number,
  isRtl: boolean
) {
  if (isActive) return 0;
  const sign = isRtl ? -1 : 1;
  if (isExiting) return -direction * 40 * sign;
  return direction * 40 * sign;
}

function formatPublishedDate(isoDate: string, locale: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function FeaturedSlideOverlay({ post }: { post: FeaturedLifeBlog }) {
  const { t, locale } = usePublicI18n();

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/45 to-transparent px-5 pb-5 pt-24 sm:px-8 sm:pb-7 sm:pt-32 lg:px-10 lg:pb-8">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div className="min-w-0 max-w-2xl">
          <h2
            className="text-2xl font-semibold tracking-tight text-balance text-white sm:text-3xl lg:text-[2.15rem] lg:leading-tight"
            suppressHydrationWarning
          >
            {t(post.titleKey)}
          </h2>
          <p
            className="mt-2 max-w-xl text-sm leading-relaxed text-white/80 text-pretty sm:text-base"
            suppressHydrationWarning
          >
            {t(post.excerptKey)}
          </p>

          <div className="mt-5 flex flex-wrap gap-6 sm:gap-8">
            <div>
              <p
                className="text-[0.65rem] font-semibold tracking-[0.16em] text-white/55 uppercase"
                suppressHydrationWarning
              >
                {t("life.writtenBy")}
              </p>
              <div className="mt-2 flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/15 text-xs font-semibold tracking-wide text-white backdrop-blur-md"
                >
                  {post.authorInitials}
                </span>
                <span
                  className="text-sm font-medium text-white"
                  suppressHydrationWarning
                >
                  {t(post.authorNameKey)}
                </span>
              </div>
            </div>

            <div>
              <p
                className="text-[0.65rem] font-semibold tracking-[0.16em] text-white/55 uppercase"
                suppressHydrationWarning
              >
                {t("life.published")}
              </p>
              <time
                dateTime={post.publishedAt}
                className="mt-2 block text-sm font-medium text-white"
                suppressHydrationWarning
              >
                {formatPublishedDate(post.publishedAt, locale)}
              </time>
            </div>
          </div>
        </div>

        <div className="shrink-0 sm:max-w-[14rem] sm:text-end">
          <p
            className="text-[0.65rem] font-semibold tracking-[0.16em] text-white/55 uppercase"
            suppressHydrationWarning
          >
            {t("life.blogUnder")}
          </p>
          <div className="mt-2.5 flex flex-wrap gap-2 sm:justify-end">
            {post.categories.map((category) => (
              <span
                key={category}
                className="inline-flex items-center rounded-full border border-white/25 bg-white/12 px-3 py-1 text-xs font-medium text-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] backdrop-blur-md"
                suppressHydrationWarning
              >
                {t(LIFE_BLOG_CATEGORY_LABEL_KEYS[category])}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LifeFeaturedCarousel() {
  const { t, dir } = usePublicI18n();
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const isRtl = dir === "rtl";
  const slides = FEATURED_LIFE_BLOGS;

  const goTo = (nextIndex: number, dirDelta: number) => {
    const normalized = (nextIndex + slides.length) % slides.length;
    if (normalized === index) return;
    setPrevIndex(index);
    setDirection(dirDelta);
    setIndex(normalized);
  };

  const goPrev = () => goTo(index - 1, -1);
  const goNext = () => goTo(index + 1, 1);

  useEffect(() => {
    if (isPaused || slides.length < 2) return;
    const timer = window.setInterval(() => {
      setPrevIndex(index);
      setDirection(1);
      setIndex((current) => (current + 1) % slides.length);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [isPaused, index, slides.length]);

  const PrevIcon = isRtl ? ChevronRightIcon : ChevronLeftIcon;
  const NextIcon = isRtl ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <section
      className="relative px-4 pt-28 pb-4 sm:px-6 sm:pb-5"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carousel"
      aria-label={t("life.carouselLabel")}
    >
      <div className="mx-auto max-w-7xl">
        <div className="relative overflow-hidden rounded-2xl ring-1 ring-[#3E3E75]/12 dark:ring-[#C4C4E8]/15">
          <div className="relative aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9]">
            <div className="absolute inset-0 grid [&>*]:col-start-1 [&>*]:row-start-1">
              {slides.map((post, i) => {
                const isActive = i === index;
                const isExiting = i === prevIndex && i !== index;

                return (
                  <motion.article
                    key={post.id}
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
                      "relative h-full w-full",
                      isActive ? "z-10" : "pointer-events-none z-0"
                    )}
                    aria-hidden={!isActive}
                  >
                    <Image
                      src={post.imageSrc}
                      alt={t(post.imageAltKey)}
                      fill
                      priority={i === 0}
                      sizes={IMAGE_SIZES}
                      className="object-cover"
                    />
                    <FeaturedSlideOverlay post={post} />
                  </motion.article>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {slides.map((post, i) => (
              <button
                key={post.id}
                type="button"
                aria-label={`${t("life.carouselLabel")} ${i + 1}`}
                onClick={() => goTo(i, i > index ? 1 : -1)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index
                    ? "w-6 bg-[#3E3E75] dark:bg-[#C4C4E8]"
                    : "w-2 bg-[#C4C4E8] dark:bg-[#3E3E75]/70"
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("life.prev")}
              onClick={goPrev}
              className="rounded-full border-border bg-background text-foreground hover:bg-muted"
            >
              <PrevIcon />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("life.next")}
              onClick={goNext}
              className="rounded-full border-border bg-background text-foreground hover:bg-muted"
            >
              <NextIcon />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
