"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import {
  FEATURED_ABOUT_FOUNDATIONS,
  type AboutFoundation,
} from "@/lib/constants/about-services";
import { ROUTES } from "@/lib/constants/routes";
import { GalleryPublicImage } from "@/components/public/gallery-public-image";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.18, margin: "0px 0px -6% 0px" } as const;

const VIEW_ALL_CLASS =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 bg-transparent px-5 text-sm font-medium text-white/90 transition-colors hover:border-white/55 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-white/35";

function FoundationRow({
  foundation,
  index,
  canAnimate,
}: {
  foundation: AboutFoundation;
  index: number;
  canAnimate: boolean;
}) {
  const { t, dir } = usePublicI18n();
  const flip = index % 2 === 1;
  const client = t(foundation.clientKey);
  const headline = t(foundation.headlineKey);
  const explore = t("about.services.explore");
  const imageSrc = foundation.imageSrc?.trim() || null;

  const content = (
    <>
      <div
        className={cn(
          "relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#2A2A52] ring-1 ring-white/10 transition-[box-shadow,transform] duration-300",
          "group-hover:shadow-[0_0_0_1px_rgba(196,196,232,0.35),0_24px_60px_-28px_rgba(0,0,0,0.55)]"
        )}
      >
        {imageSrc ? (
          <>
            <GalleryPublicImage
              src={imageSrc}
              alt={t(foundation.imageAltKey)}
              priority={index === 0}
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/70 via-transparent to-transparent"
            />
          </>
        ) : (
          <div
            className="absolute inset-0 overflow-hidden bg-[#2A2A52]"
            aria-hidden="true"
          >
            <div className="image-skeleton-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-2 p-3 sm:p-4">
          {foundation.tagKeys.map((tagKey) => (
            <span
              key={tagKey}
              className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/95 backdrop-blur-md"
            >
              {t(tagKey)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-col justify-center">
        <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
          <span
            className="bg-gradient-to-br from-white to-[#C4C4E8] bg-clip-text text-[clamp(3rem,8vw,5.5rem)] leading-none font-extrabold tracking-tight text-transparent"
            aria-hidden="true"
          >
            {t(foundation.stat.valueKey)}
          </span>
          <span className="mb-1.5 max-w-[12rem] text-sm leading-snug text-white/55 sm:mb-2.5">
            {t(foundation.stat.unitKey)}
          </span>
        </div>

        <p className="mt-5 text-xs font-semibold tracking-[0.2em] text-[#C4C4E8] uppercase">
          {client}
        </p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-balance text-white sm:text-2xl">
          {headline}
        </h3>
        <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-white/65 text-pretty sm:text-base">
          {t(foundation.summaryKey)}
        </p>

        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-[#C4C4E8] transition-[gap,color] duration-300 group-hover:gap-2.5 group-hover:text-white">
          {explore}
          <ArrowRightIcon
            className={cn("size-4", dir === "rtl" && "rotate-180")}
            aria-hidden="true"
          />
        </span>
      </div>
    </>
  );

  const rowClassName = cn(
    "group grid gap-8 transition-transform duration-300 hover:-translate-y-1 sm:gap-10",
    "min-[860px]:grid-cols-2 min-[860px]:items-center",
    flip && "min-[860px]:[&>*:first-child]:order-2"
  );

  if (!canAnimate) {
    return (
      <Link
        href={foundation.href}
        aria-label={`${client}: ${headline}`}
        className={rowClassName}
      >
        {content}
      </Link>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: 0.55, ease: EASE, delay: index * 0.06 }}
    >
      <Link
        href={foundation.href}
        aria-label={`${client}: ${headline}`}
        className={rowClassName}
      >
        {content}
      </Link>
    </motion.div>
  );
}

function SectionPatterns() {
  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(196,196,232,0.16),transparent_55%),linear-gradient(180deg,#343463,#3E3E75_45%,#2F2F5A)]"
      />

      {/* Diagonal hatch */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-18deg, transparent, transparent 18px, rgba(196,196,232,0.22) 18px, rgba(196,196,232,0.22) 19px)",
        }}
      />

      {/* Soft orbs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-28 start-[-12%] size-[28rem] rounded-full bg-[#C4C4E8]/12 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 end-[-8%] size-[32rem] rounded-full bg-[#9A9AD0]/14 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 end-[18%] size-40 rounded-full bg-white/5 blur-2xl"
      />

      {/* Golden-triangle motif (outline only) */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute top-10 end-6 hidden h-44 w-44 text-[#C4C4E8]/20 sm:block lg:end-16 lg:h-56 lg:w-56"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          d="M100 28 L172 160 H28 Z"
          stroke="currentColor"
          strokeWidth="1.25"
        />
        <path
          d="M100 58 L148 148 H52 Z"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.7"
        />
        <circle cx="100" cy="28" r="3.5" fill="currentColor" opacity="0.55" />
        <circle cx="172" cy="160" r="3.5" fill="currentColor" opacity="0.55" />
        <circle cx="28" cy="160" r="3.5" fill="currentColor" opacity="0.55" />
      </svg>

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute bottom-16 start-4 hidden h-36 w-36 -rotate-12 text-[#C4C4E8]/12 md:block lg:start-10"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          d="M100 36 L164 152 H36 Z"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
      </svg>

      {/* Dot grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(196,196,232,0.55) 1px, transparent 1.5px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
        }}
      />

      {/* Curvy glowing silks */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        viewBox="0 0 1200 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id="about-silk-a" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C4C4E8" stopOpacity="0" />
            <stop offset="35%" stopColor="#E8E8F3" stopOpacity="0.85" />
            <stop offset="65%" stopColor="#9A9AD0" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#C4C4E8" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="about-silk-b" x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9A9AD0" stopOpacity="0" />
            <stop offset="40%" stopColor="#F5E6B8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#C4C4E8" stopOpacity="0" />
          </linearGradient>
          <filter
            id="about-silk-glow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#about-silk-glow)" opacity="0.55">
          <path
            d="M-40 180 C180 120, 320 260, 520 200 S860 90, 1240 160"
            stroke="url(#about-silk-a)"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M-20 220 C200 170, 360 300, 560 240 S900 140, 1260 210"
            stroke="url(#about-silk-a)"
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M-60 640 C160 580, 380 720, 620 650 S980 520, 1280 610"
            stroke="url(#about-silk-b)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M80 780 C280 720, 460 820, 700 760 S1040 680, 1220 740"
            stroke="url(#about-silk-a)"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M900 -20 C820 140, 980 280, 860 420 S720 620, 940 920"
            stroke="url(#about-silk-b)"
            strokeWidth="1.35"
            strokeLinecap="round"
            opacity="0.45"
          />
          <path
            d="M240 -10 C300 160, 160 300, 280 460 S400 680, 180 900"
            stroke="url(#about-silk-a)"
            strokeWidth="1.15"
            strokeLinecap="round"
            opacity="0.4"
          />
        </g>
      </svg>
    </>
  );
}

type AboutServicesSectionProps = {
  /** Random gallery Drive URLs (same source as /gallery). Missing URLs show a skeleton. */
  imageUrls?: string[];
};

export function AboutServicesSection({
  imageUrls = [],
}: AboutServicesSectionProps) {
  const { t, dir } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;
  const titleId = "about-services-title";

  const foundations = FEATURED_ABOUT_FOUNDATIONS.map((foundation, index) => {
    const galleryUrl = imageUrls[index]?.trim();
    return { ...foundation, imageSrc: galleryUrl || undefined };
  });

  return (
    <section
      aria-labelledby={titleId}
      className="relative isolate overflow-hidden bg-[#3E3E75] px-4 py-16 text-white sm:px-6 sm:py-20"
    >
      <SectionPatterns />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
          <div className="min-w-0 max-w-2xl">
            <p className="text-sm font-semibold tracking-[0.22em] text-white/55 uppercase">
              {t("about.services.eyebrow")}
            </p>
            <h2
              id={titleId}
              className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]"
            >
              {t("about.services.title")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/65 text-pretty sm:text-lg">
              {t("about.services.lead")}
            </p>
          </div>

          <Link href={ROUTES.CAREERS} className={VIEW_ALL_CLASS}>
            {t("about.services.viewAll")}
            <ArrowRightIcon
              className={cn("size-4", dir === "rtl" && "rotate-180")}
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="mt-14 flex flex-col gap-16 sm:mt-16 sm:gap-20">
          {foundations.map((foundation, index) => (
            <FoundationRow
              key={foundation.id}
              foundation={foundation}
              index={index}
              canAnimate={canAnimate}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
