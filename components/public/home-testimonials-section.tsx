"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { StarIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  HOME_TESTIMONIALS,
  type HomeTestimonial,
} from "@/lib/constants/home-testimonials";
import type { TextDirection } from "@/lib/i18n/locales";
import type { MessageKey } from "@/lib/i18n/messages";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.2, margin: "0px 0px -8% 0px" } as const;
const MARQUEE_SPEED_PX = 36;
const GAP_PX = 16;

function StarRating({ rating }: { rating: 5 }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon
          key={star}
          className="size-3.5 fill-[#C4C4E8] text-[#C4C4E8]"
          aria-hidden
        />
      ))}
    </div>
  );
}

function TestimonialCard({
  quote,
  rating,
}: {
  quote: string;
  rating: 5;
}) {
  return (
    <figure
      className={cn(
        "relative flex w-[min(15.5rem,72vw)] shrink-0 flex-col overflow-hidden rounded-2xl sm:w-[16.5rem]",
        "border border-white/15 bg-[#2F2F5A]/75 p-4 backdrop-blur-sm",
        "shadow-[0_20px_50px_-24px_rgba(0,0,0,0.55)]"
      )}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px] bg-[#C4C4E8]/70"
      />
      <div className="flex items-center justify-between gap-2">
        <StarRating rating={rating} />
        <span className="text-[0.6rem] font-semibold tracking-[0.14em] text-[#C4C4E8] tabular-nums">
          {rating.toFixed(1)}
        </span>
      </div>
      <blockquote className="mt-3 line-clamp-5 text-[0.8rem] leading-relaxed text-white/85 text-pretty">
        {quote}
      </blockquote>
    </figure>
  );
}

function TestimonialSequence({
  items,
  t,
  sequenceRef,
  ariaHidden,
}: {
  items: HomeTestimonial[];
  t: (key: MessageKey) => string;
  sequenceRef?: RefObject<HTMLDivElement | null>;
  ariaHidden?: boolean;
}) {
  return (
    <div
      ref={sequenceRef}
      className="flex shrink-0"
      style={{ gap: GAP_PX, paddingInlineEnd: GAP_PX }}
      aria-hidden={ariaHidden || undefined}
    >
      {items.map((item) => (
        <TestimonialCard
          key={item.id}
          quote={t(item.quoteKey)}
          rating={item.rating}
        />
      ))}
    </div>
  );
}

/** Seamless circular marquee: translate by measured sequence width, wrap with modulo. */
function TestimonialsMarquee({
  t,
  dir,
  enabled,
}: {
  t: (key: MessageKey) => string;
  dir: TextDirection;
  enabled: boolean;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const seqRef = useRef<HTMLDivElement | null>(null);
  const [seqWidth, setSeqWidth] = useState(0);
  const [copyCount, setCopyCount] = useState(2);
  const [paused, setPaused] = useState(false);
  const offsetRef = useRef(0);
  const rafRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  const measure = useCallback(() => {
    const width = seqRef.current?.getBoundingClientRect().width ?? 0;
    const viewport = trackRef.current?.parentElement?.clientWidth ?? 0;
    if (width > 0) {
      setSeqWidth(Math.ceil(width));
      setCopyCount(Math.max(2, Math.ceil(viewport / width) + 2));
    }
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    const sequence = seqRef.current;
    const viewportEl = trackRef.current?.parentElement;
    if (sequence) ro.observe(sequence);
    if (viewportEl) ro.observe(viewportEl);
    return () => ro.disconnect();
  }, [measure]);

  useEffect(() => {
    offsetRef.current = 0;
    measure();
  }, [dir, measure]);

  useEffect(() => {
    if (!enabled || seqWidth <= 0) return;

    const tick = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = Math.min(64, ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;

      if (!paused) {
        offsetRef.current += MARQUEE_SPEED_PX * dt;
        if (offsetRef.current >= seqWidth) {
          offsetRef.current %= seqWidth;
        }
        const x = dir === "rtl" ? offsetRef.current : -offsetRef.current;
        if (trackRef.current) {
          trackRef.current.style.transform = `translate3d(${x}px, 0, 0)`;
        }
      } else {
        lastTsRef.current = ts;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [enabled, seqWidth, dir, paused]);

  if (!enabled) {
    return (
      <div className="overflow-x-auto">
        <div className="flex w-max" style={{ gap: GAP_PX }}>
          {HOME_TESTIMONIALS.map((item) => (
            <TestimonialCard
              key={item.id}
              quote={t(item.quoteKey)}
              rating={item.rating}
            />
          ))}
        </div>
      </div>
    );
  }

  const trackStyle = {
    willChange: "transform",
  } satisfies CSSProperties;

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div ref={trackRef} className="flex w-max" style={trackStyle}>
        {Array.from({ length: copyCount }, (_, copyIndex) => (
          <TestimonialSequence
            key={copyIndex}
            items={HOME_TESTIMONIALS}
            t={t}
            sequenceRef={copyIndex === 0 ? seqRef : undefined}
            ariaHidden={copyIndex > 0}
          />
        ))}
      </div>
    </div>
  );
}

export function HomeTestimonialsSection() {
  const { t, dir } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;

  return (
    <section className="relative isolate overflow-hidden bg-[#3E3E75] px-4 py-10 text-white sm:px-6 sm:py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(154,154,208,0.22),transparent_55%),linear-gradient(180deg,#343463,#3E3E75_45%,#2F2F5A)]"
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <motion.p
            className="text-xs font-semibold tracking-[0.18em] text-white/55 uppercase"
            initial={canAnimate ? { opacity: 0, y: 16 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.8, ease: EASE }}
          >
            {t("homeTestimonials.eyebrow")}
          </motion.p>
          <motion.h2
            className="mt-3 text-2xl font-semibold tracking-tight text-balance text-white sm:text-3xl"
            initial={canAnimate ? { opacity: 0, y: 20 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.9, ease: EASE, delay: 0.05 }}
          >
            {t("homeTestimonials.title")}
          </motion.h2>
          <motion.p
            className="mt-3 text-base leading-relaxed text-white/65 text-pretty sm:text-lg"
            initial={canAnimate ? { opacity: 0, y: 16 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.85, ease: EASE, delay: 0.1 }}
          >
            {t("homeTestimonials.lead")}
          </motion.p>
        </div>
      </div>

      <div
        className="relative z-10 mt-8 sm:mt-10"
        aria-label={t("homeTestimonials.ariaLabel")}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 start-0 z-10 w-12 bg-gradient-to-r from-[#343463] to-transparent sm:w-20 rtl:bg-gradient-to-l"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 end-0 z-10 w-12 bg-gradient-to-l from-[#2F2F5A] to-transparent sm:w-20 rtl:bg-gradient-to-r"
        />

        <TestimonialsMarquee
          key={dir}
          t={t}
          dir={dir}
          enabled={!!canAnimate}
        />
      </div>
    </section>
  );
}
