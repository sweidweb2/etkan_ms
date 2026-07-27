"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { LifeBlogCardLink } from "@/components/public/life-blog-card";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  LIFE_BLOG_FILTER_LABEL_KEYS,
  LIFE_BLOG_FILTERS,
  PUBLIC_LIFE_BLOGS,
  type LifeBlogFilter,
} from "@/lib/constants/public-life-blogs";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.12, margin: "0px 0px -6% 0px" } as const;

const FILTER_TRIGGER_CLASS = cn(
  "inline-flex items-center justify-center rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 sm:px-4",
  "text-muted-foreground hover:text-foreground",
  "data-[active=true]:bg-[#3E3E75] data-[active=true]:text-white data-[active=true]:shadow-md",
  "dark:data-[active=true]:bg-[#C4C4E8] dark:data-[active=true]:text-[#2A2A52]",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3E3E75]/35"
);

export function LifeBlogsSection() {
  const { t } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;
  const [activeFilter, setActiveFilter] = useState<LifeBlogFilter>("all");

  const filteredPosts = useMemo(
    () =>
      activeFilter === "all"
        ? PUBLIC_LIFE_BLOGS
        : PUBLIC_LIFE_BLOGS.filter((post) => post.category === activeFilter),
    [activeFilter]
  );

  return (
    <section className="relative px-4 pt-2 pb-20 sm:px-6 sm:pt-3 sm:pb-28">
      <div className="mx-auto max-w-7xl">
        <div className="flex justify-center">
          <div
            role="tablist"
            aria-label={t("life.filterLabel")}
            className="inline-flex h-auto w-full max-w-4xl flex-wrap justify-center gap-1 rounded-full bg-muted/70 p-1.5 ring-1 ring-[#3E3E75]/10 dark:ring-[#C4C4E8]/15"
          >
            {LIFE_BLOG_FILTERS.map((filter) => {
              const isActive = activeFilter === filter;
              return (
                <button
                  key={filter}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  data-active={isActive}
                  className={FILTER_TRIGGER_CLASS}
                  onClick={() => setActiveFilter(filter)}
                >
                  {t(LIFE_BLOG_FILTER_LABEL_KEYS[filter])}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeFilter}
            initial={hydrated ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {filteredPosts.length === 0 ? (
              <p className="mt-12 text-center text-sm text-muted-foreground">
                {t("life.empty")}
              </p>
            ) : (
              <ul
                className="mt-10 grid gap-x-5 gap-y-10 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-10"
                aria-label={t("life.listLabel")}
              >
                {filteredPosts.map((post, index) => (
                  <motion.li
                    key={post.id}
                    className="min-w-0"
                    initial={canAnimate ? { opacity: 0, y: 24 } : false}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={VIEWPORT}
                    transition={{
                      duration: 0.65,
                      ease: EASE,
                      delay: Math.min(index * 0.05, 0.25),
                    }}
                  >
                    <LifeBlogCardLink post={post} priority={index < 4} />
                  </motion.li>
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
