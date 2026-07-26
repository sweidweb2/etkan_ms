"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { GravityStarsBackground } from "@/components/animate-ui/components/backgrounds/gravity-stars";
import { useHydrated } from "@/hooks/use-hydrated";
import type { MessageKey } from "@/lib/i18n/messages";
import { en } from "@/lib/i18n/messages/en";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.12, margin: "0px 0px -6% 0px" } as const;

const IMAGE_SIZES =
  "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw";

const GALLERY_CATEGORIES = [
  "roadmap",
  "workshop",
  "onlineCourses",
  "archive",
  "projects",
  "students",
  "teachers",
] as const;

type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

const CATEGORY_LABEL_KEYS = {
  roadmap: "gallery.filter.roadmap",
  workshop: "gallery.filter.workshop",
  onlineCourses: "gallery.filter.onlineCourses",
  archive: "gallery.filter.archive",
  projects: "gallery.filter.projects",
  students: "gallery.filter.students",
  teachers: "gallery.filter.teachers",
} as const satisfies Record<GalleryCategory, MessageKey>;

const FILTER_TRIGGER_CLASS = cn(
  "inline-flex items-center justify-center rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 sm:px-4",
  "text-muted-foreground hover:text-foreground",
  "data-[active=true]:bg-[#3E3E75] data-[active=true]:text-white data-[active=true]:shadow-md",
  "dark:data-[active=true]:bg-[#C4C4E8] dark:data-[active=true]:text-[#2A2A52]",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3E3E75]/35"
);

const GALLERY_ITEMS: Array<{
  id: string;
  src: string;
  altKey: MessageKey;
  aspectClass: string;
  category: GalleryCategory;
}> = [
  {
    id: "1",
    src: "https://images.unsplash.com/photo-1690683789978-3cf73960d650?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.1.alt",
    aspectClass: "aspect-[3/4]",
    category: "workshop",
  },
  {
    id: "2",
    src: "https://images.unsplash.com/photo-1621839673705-6617adf9e890?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.2.alt",
    aspectClass: "aspect-[4/3]",
    category: "onlineCourses",
  },
  {
    id: "3",
    src: "https://images.unsplash.com/photo-1704283860614-803aa8be7993?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.3.alt",
    aspectClass: "aspect-square",
    category: "workshop",
  },
  {
    id: "4",
    src: "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.4.alt",
    aspectClass: "aspect-[5/4]",
    category: "roadmap",
  },
  {
    id: "5",
    src: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.5.alt",
    aspectClass: "aspect-[3/4]",
    category: "workshop",
  },
  {
    id: "6",
    src: "https://images.unsplash.com/photo-1553406830-ef2513450d76?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.6.alt",
    aspectClass: "aspect-[4/5]",
    category: "workshop",
  },
  {
    id: "7",
    src: "/public_images/solution-built-1.jpg",
    altKey: "gallery.item.7.alt",
    aspectClass: "aspect-[16/10]",
    category: "projects",
  },
  {
    id: "8",
    src: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.8.alt",
    aspectClass: "aspect-[3/4]",
    category: "onlineCourses",
  },
  {
    id: "9",
    src: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.9.alt",
    aspectClass: "aspect-[5/4]",
    category: "workshop",
  },
  {
    id: "10",
    src: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.10.alt",
    aspectClass: "aspect-square",
    category: "roadmap",
  },
  {
    id: "11",
    src: "https://images.unsplash.com/photo-1565043666747-69f6646db940?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.11.alt",
    aspectClass: "aspect-[4/3]",
    category: "projects",
  },
  {
    id: "12",
    src: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.12.alt",
    aspectClass: "aspect-[3/4]",
    category: "onlineCourses",
  },
  {
    id: "13",
    src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.13.alt",
    aspectClass: "aspect-[4/3]",
    category: "roadmap",
  },
  {
    id: "14",
    src: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.14.alt",
    aspectClass: "aspect-[3/4]",
    category: "archive",
  },
  {
    id: "15",
    src: "https://images.unsplash.com/photo-1581092162384-8987c1d64718?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.15.alt",
    aspectClass: "aspect-[5/4]",
    category: "teachers",
  },
  {
    id: "16",
    src: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.16.alt",
    aspectClass: "aspect-square",
    category: "projects",
  },
  {
    id: "17",
    src: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.17.alt",
    aspectClass: "aspect-[16/10]",
    category: "students",
  },
  {
    id: "18",
    src: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.18.alt",
    aspectClass: "aspect-[4/5]",
    category: "onlineCourses",
  },
  {
    id: "19",
    src: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.19.alt",
    aspectClass: "aspect-[3/4]",
    category: "teachers",
  },
  {
    id: "20",
    src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.20.alt",
    aspectClass: "aspect-[5/4]",
    category: "archive",
  },
  {
    id: "21",
    src: "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.21.alt",
    aspectClass: "aspect-[4/3]",
    category: "workshop",
  },
  {
    id: "22",
    src: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.22.alt",
    aspectClass: "aspect-square",
    category: "archive",
  },
  {
    id: "23",
    src: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.23.alt",
    aspectClass: "aspect-[16/10]",
    category: "roadmap",
  },
  {
    id: "24",
    src: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=900&auto=format&fit=crop",
    altKey: "gallery.item.24.alt",
    aspectClass: "aspect-[3/4]",
    category: "students",
  },
];

export function GallerySection() {
  const { t } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;
  const [activeCategory, setActiveCategory] =
    useState<GalleryCategory>("roadmap");

  const filteredItems = useMemo(
    () => GALLERY_ITEMS.filter((item) => item.category === activeCategory),
    [activeCategory]
  );

  return (
    <section className="relative isolate overflow-hidden px-4 pt-28 pb-20 sm:px-6 sm:pb-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--muted)_35%,var(--background)))]"
      />
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

      <div className="relative z-10 mx-auto max-w-7xl">
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

        <motion.div
          className="mt-8 flex justify-center sm:mt-10"
          initial={canAnimate ? { opacity: 0, y: 16 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.7, ease: EASE, delay: 0.12 }}
        >
          <div
            role="tablist"
            aria-label={t("gallery.filterLabel")}
            className="inline-flex h-auto w-full max-w-4xl flex-wrap justify-center gap-1 rounded-full bg-muted/70 p-1.5 ring-1 ring-[#3E3E75]/10 dark:ring-[#C4C4E8]/15"
          >
            {GALLERY_CATEGORIES.map((category) => {
              const isActive = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-active={isActive}
                  className={FILTER_TRIGGER_CLASS}
                  onClick={() => setActiveCategory(category)}
                >
                  {t(CATEGORY_LABEL_KEYS[category])}
                </button>
              );
            })}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={hydrated ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {filteredItems.length === 0 ? (
              <p className="mt-12 text-center text-sm text-muted-foreground">
                {t("gallery.empty")}
              </p>
            ) : (
              <ul
                className="mt-10 columns-2 gap-2.5 sm:mt-12 sm:columns-3 sm:gap-3 lg:columns-4 lg:gap-3.5 xl:columns-5 xl:gap-4"
                aria-label={t("gallery.listLabel")}
              >
                {filteredItems.map((item, index) => {
                  const alt = t(item.altKey) || en[item.altKey];

                  return (
                    <motion.li
                      key={item.id}
                      className="mb-2.5 break-inside-avoid sm:mb-3 lg:mb-3.5 xl:mb-4"
                      initial={canAnimate ? { opacity: 0, y: 28 } : false}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={VIEWPORT}
                      transition={{
                        duration: 0.7,
                        ease: EASE,
                        delay: Math.min(index * 0.04, 0.28),
                      }}
                    >
                      <figure
                        className={cn(
                          "group relative overflow-hidden bg-[#3E3E75]/5 ring-1 ring-[#3E3E75]/10 dark:bg-[#C4C4E8]/5 dark:ring-[#C4C4E8]/10",
                          item.aspectClass
                        )}
                      >
                        <Image
                          src={item.src}
                          alt={alt}
                          fill
                          sizes={IMAGE_SIZES}
                          className="object-cover transition duration-500 ease-out group-hover:scale-[1.03]"
                          priority={index < 5}
                        />
                      </figure>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
