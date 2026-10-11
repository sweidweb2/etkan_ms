"use client";

import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { GravityStarsBackground } from "@/components/animate-ui/components/backgrounds/gravity-stars";
import { GalleryPublicImage } from "@/components/public/gallery-public-image";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";
import type { ManagerGalleryImageRow } from "@/types/manager-gallery-image";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.12, margin: "0px 0px -6% 0px" } as const;

const ASPECT_CLASSES = [
  "aspect-[3/4]",
  "aspect-[4/3]",
  "aspect-square",
  "aspect-[16/10]",
  "aspect-[3/5]",
  "aspect-[5/4]",
] as const;

/** Even columns go up (bottom → top); odd columns go down (top → bottom). */
const COLUMN_DURATIONS_UP_S = [280, 320, 350] as const;
const COLUMN_DURATIONS_DOWN_S = [480, 540, 510] as const;

type GallerySectionProps = {
  images: ManagerGalleryImageRow[];
};

function getColumnCount(width: number) {
  if (width < 640) return 2;
  if (width < 1024) return 3;
  return 4;
}

function useGalleryColumnCount() {
  const [columnCount, setColumnCount] = useState(3);

  useEffect(() => {
    const update = () => setColumnCount(getColumnCount(window.innerWidth));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columnCount;
}

function splitIntoColumns(
  images: ManagerGalleryImageRow[],
  columnCount: number
) {
  const columns: ManagerGalleryImageRow[][] = Array.from(
    { length: columnCount },
    () => []
  );

  images.forEach((image, index) => {
    columns[index % columnCount]?.push(image);
  });

  return columns;
}

function GalleryColumnCard({
  image,
  aspectClass,
  priority,
}: {
  image: ManagerGalleryImageRow;
  aspectClass: string;
  priority?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  );

  return (
    <figure
      className={cn(
        "relative w-full overflow-hidden bg-transparent",
        aspectClass,
        status === "error" && "invisible"
      )}
      aria-hidden={status === "error" || undefined}
    >
      {status === "loading" ? (
        <div
          className="absolute inset-0 z-10 overflow-hidden bg-muted/40"
          role="status"
          aria-busy="true"
          aria-label="Loading image"
        >
          <div
            aria-hidden="true"
            className="image-skeleton-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          />
        </div>
      ) : null}

      {status !== "error" ? (
        <GalleryPublicImage
          src={image.direct_url}
          alt={image.name}
          priority={priority}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={cn(
            "object-cover transition-opacity duration-500 ease-out",
            status === "loaded" ? "opacity-100" : "opacity-0"
          )}
        />
      ) : null}
    </figure>
  );
}

function GalleryMarqueeColumn({
  images,
  columnIndex,
  animate,
}: {
  images: ManagerGalleryImageRow[];
  columnIndex: number;
  animate: boolean;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const goesUp = columnIndex % 2 === 0;
  const durationPool = goesUp ? COLUMN_DURATIONS_UP_S : COLUMN_DURATIONS_DOWN_S;
  const duration =
    durationPool[Math.floor(columnIndex / 2) % durationPool.length] ??
    (goesUp ? 320 : 510);
  const loopImages = useMemo(() => [...images, ...images], [images]);

  if (images.length === 0) {
    return null;
  }

  if (!animate) {
    return (
      <div className="flex flex-col gap-2.5 sm:gap-3">
        {images.map((image, index) => (
          <GalleryColumnCard
            key={image.id}
            image={image}
            aspectClass={
              ASPECT_CLASSES[(columnIndex + index) % ASPECT_CLASSES.length]
            }
            priority={columnIndex < 2 && index < 2}
          />
        ))}
      </div>
    );
  }

  const trackStyle = {
    "--gallery-marquee-duration": `${duration}s`,
    animationPlayState: isPaused ? "paused" : "running",
  } as CSSProperties;

  return (
    <div
      className="relative h-full min-w-0 overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
    >
      <div
        className={cn(
          "flex flex-col gap-2.5 will-change-transform sm:gap-3",
          goesUp ? "gallery-marquee-up" : "gallery-marquee-down"
        )}
        style={trackStyle}
      >
        {loopImages.map((image, index) => {
          const isClone = index >= images.length;
          return (
            <GalleryColumnCard
              key={`${image.id}-${isClone ? "b" : "a"}-${index}`}
              image={image}
              aspectClass={
                ASPECT_CLASSES[
                  (columnIndex + (index % images.length)) %
                    ASPECT_CLASSES.length
                ]
              }
              priority={!isClone && columnIndex < 2 && index < 2}
            />
          );
        })}
      </div>
    </div>
  );
}



export function GallerySection({ images }: GallerySectionProps) {
  const { t } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;
  const columnCount = useGalleryColumnCount();

  const columns = useMemo(
    () => splitIntoColumns(images, columnCount),
    [images, columnCount]
  );

  return (
    <section className="relative isolate overflow-hidden bg-background px-4 pt-28 sm:px-6">
      <GravityStarsBackground
        aria-hidden="true"
        className="absolute inset-0 text-[#3E3E75]/90 dark:text-[#C4C4E8]"
        starsCount={120}
        starsSize={2.5}
        starsOpacity={0.8}
        glowIntensity={18}
        movementSpeed={0.25}
        mouseInfluence={120}
        gravityStrength={70}
      />

      <div className="relative z-10 mx-auto max-w-[90rem]">
        <motion.p
          className="text-sm font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]"
          initial={canAnimate ? { opacity: 0, y: 16 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {t("gallery.eyebrow")}
        </motion.p>

        <motion.h1
          className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]"
          initial={canAnimate ? { opacity: 0, y: 20 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.8, ease: EASE, delay: 0.05 }}
        >
          {t("gallery.title")}
        </motion.h1>

        <motion.p
          className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg"
          initial={canAnimate ? { opacity: 0, y: 20 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
        >
          {t("gallery.lead")}
        </motion.p>

        {images.length === 0 ? (
          <p className="mt-12 text-center text-sm text-muted-foreground">
            {t("gallery.empty")}
          </p>
        ) : (
          <motion.div
            className="relative mt-10 sm:mt-12"
            initial={canAnimate ? { opacity: 0, y: 24 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.85, ease: EASE, delay: 0.12 }}
          >
            <div
              className="gallery-marquee-viewport relative h-[min(280vh,200rem)] overflow-hidden"
              aria-label={t("gallery.listLabel")}
            >
              <div
                className="grid h-full gap-3 px-1 pt-10 sm:gap-4 sm:px-2 sm:pt-12"
                style={{
                  gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                }}
              >
                {columns.map((columnImages, columnIndex) => (
                  <GalleryMarqueeColumn
                    key={`col-${columnCount}-${columnIndex}`}
                    images={columnImages}
                    columnIndex={columnIndex}
                    animate={!!canAnimate}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
