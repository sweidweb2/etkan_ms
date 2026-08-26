"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpRightIcon } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { HorizontalScrollCarousel } from "@/components/ui/horizontal-scroll-carousel";
import { ProjectsGalaxyBackground } from "@/components/public/projects-galaxy-background";
import { useHydrated } from "@/hooks/use-hydrated";
import type {
  PublicProjectCard,
  PublicProjectSection,
} from "@/lib/constants/public-projects";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.12, margin: "0px 0px -6% 0px" } as const;

const IMAGE_SIZES = "(max-width: 640px) 85vw, (max-width: 1024px) 40vw, 320px";

/** Stable string — avoid `cn()` on anchors (SSR/client class order mismatches). */
const PROJECT_CARD_CLASS =
  "group flex flex-col overflow-hidden rounded-2xl border border-[#C4C4E8]/15 bg-card/80 shadow-[0_20px_50px_-36px_rgba(0,0,0,0.65)] transition-transform duration-300 hover:-translate-y-0.5";

const PROJECT_CARD_STATIC_CLASS =
  "group flex flex-col overflow-hidden rounded-2xl border border-[#C4C4E8]/15 bg-card/80 shadow-[0_20px_50px_-36px_rgba(0,0,0,0.65)]";

const FILTER_TRIGGER_CLASS =
  "inline-flex items-center justify-center rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 sm:px-4 text-muted-foreground hover:text-foreground data-[active=true]:bg-[#C4C4E8] data-[active=true]:text-[#2A2A52] data-[active=true]:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#C4C4E8]/35";

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://");
}

function uniqueCategories(projects: PublicProjectCard[]) {
  const seen = new Set<string>();
  const categories: string[] = [];

  for (const project of projects) {
    const category = project.category.trim();
    if (!category || seen.has(category)) {
      continue;
    }
    seen.add(category);
    categories.push(category);
  }

  return categories;
}

function ProjectCard({ project }: { project: PublicProjectCard }) {
  const { t } = usePublicI18n();
  const content = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={project.imageSrc}
          alt={project.title}
          fill
          sizes={IMAGE_SIZES}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-col p-5 sm:p-6">
        <h3 className="text-lg font-semibold tracking-tight text-balance sm:text-xl">
          {project.title}
        </h3>
        {project.author?.trim() ? (
          <p className="mt-1 text-sm text-muted-foreground">
            {t("projects.card.by")} {project.author.trim()}
          </p>
        ) : null}
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground text-pretty">
          {project.body}
        </p>
        {project.href ? (
          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#C4C4E8]">
            {t("projects.card.open")}
            <ArrowUpRightIcon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </div>
    </>
  );

  if (project.href) {
    if (isExternalHref(project.href)) {
      return (
        <a
          href={project.href}
          target="_blank"
          rel="noopener noreferrer"
          suppressHydrationWarning
          className={PROJECT_CARD_CLASS}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        href={project.href}
        suppressHydrationWarning
        className={PROJECT_CARD_CLASS}
      >
        {content}
      </Link>
    );
  }

  return (
    <article suppressHydrationWarning className={PROJECT_CARD_STATIC_CLASS}>
      {content}
    </article>
  );
}

function ProjectSectionBlock({
  section,
  canAnimate,
}: {
  section: PublicProjectSection;
  canAnimate: boolean;
}) {
  const { t } = usePublicI18n();
  const [activeCategory, setActiveCategory] = useState("all");
  const categories = useMemo(
    () => uniqueCategories(section.projects),
    [section.projects]
  );
  const showFilters = categories.length > 1;

  const filteredProjects = useMemo(() => {
    if (activeCategory === "all") {
      return section.projects;
    }
    return section.projects.filter(
      (project) => project.category === activeCategory
    );
  }, [activeCategory, section.projects]);

  return (
    <section
      aria-labelledby={`projects-${section.id}-title`}
      className="scroll-mt-28"
    >
      <motion.h2
        id={`projects-${section.id}-title`}
        className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
        initial={canAnimate ? { opacity: 0, y: 16 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.7, ease: EASE }}
      >
        {t(section.titleKey)}
      </motion.h2>
      <motion.p
        className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base"
        initial={canAnimate ? { opacity: 0, y: 14 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={VIEWPORT}
        transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
      >
        {t(section.leadKey)}
      </motion.p>

      {showFilters ? (
        <motion.div
          className="mt-6"
          initial={canAnimate ? { opacity: 0, y: 12 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.65, ease: EASE, delay: 0.08 }}
        >
          <div
            role="tablist"
            aria-label={t("projects.filterLabel")}
            className="inline-flex h-auto max-w-full flex-wrap gap-1 rounded-full bg-muted/70 p-1.5 ring-1 ring-[#C4C4E8]/15"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === "all"}
              data-active={activeCategory === "all"}
              className={FILTER_TRIGGER_CLASS}
              onClick={() => setActiveCategory("all")}
            >
              {t("projects.filter.all")}
            </button>
            {categories.map((category) => {
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
                  {category}
                </button>
              );
            })}
          </div>
        </motion.div>
      ) : null}

      {section.projects.length === 0 || filteredProjects.length === 0 ? (
        <motion.p
          className="mt-8 rounded-2xl border border-dashed border-[#C4C4E8]/20 px-5 py-8 text-sm text-muted-foreground"
          initial={canAnimate ? { opacity: 0, y: 12 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.65, ease: EASE, delay: 0.05 }}
        >
          {t(section.emptyKey)}
        </motion.p>
      ) : (
        <>
          <HorizontalScrollCarousel
            className="mt-8 md:hidden"
            resetScrollKey={`${section.id}-${activeCategory}`}
            ariaLabel={t(section.titleKey)}
            navButtonClassName="text-[#C4C4E8]/80 hover:bg-[#C4C4E8]/10 hover:text-[#C4C4E8] disabled:text-[#C4C4E8]/25"
            contentClassName="px-1 py-1"
          >
            <ul className="flex w-max gap-4 sm:gap-5">
              {filteredProjects.map((project) => (
                <li
                  key={project.id}
                  className="w-[min(18rem,82vw)] shrink-0 snap-start sm:w-[20rem]"
                >
                  <ProjectCard project={project} />
                </li>
              ))}
            </ul>
          </HorizontalScrollCarousel>

          <ul
            className="mt-8 hidden md:block md:columns-2 md:gap-5 lg:columns-3 lg:gap-6"
            aria-label={t(section.titleKey)}
          >
            {filteredProjects.map((project) => (
              <li
                key={project.id}
                className="mb-5 break-inside-avoid lg:mb-6"
              >
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Projects page always uses the app dark theme tokens. */
export function ProjectsSection({
  sections,
}: {
  sections: PublicProjectSection[];
}) {
  const { t } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;

  return (
    <div className="dark relative isolate flex min-h-0 flex-1 flex-col overflow-hidden bg-[#070712] text-foreground">
      <ProjectsGalaxyBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-24 px-4 pt-32 pb-28 sm:gap-28 sm:px-6 sm:pt-36 sm:pb-36">
        <header className="max-w-3xl space-y-6 sm:space-y-7">
          <motion.p
            className="text-sm font-semibold tracking-[0.2em] text-[#C4C4E8] uppercase"
            initial={canAnimate ? { opacity: 0, y: 16 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.7, ease: EASE }}
          >
            {t("projects.eyebrow")}
          </motion.p>

          <motion.h1
            className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]"
            initial={canAnimate ? { opacity: 0, y: 20 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.8, ease: EASE, delay: 0.05 }}
          >
            {t("projects.title")}
          </motion.h1>

          <motion.p
            className="max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg"
            initial={canAnimate ? { opacity: 0, y: 20 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={VIEWPORT}
            transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
          >
            {t("projects.lead")}
          </motion.p>
        </header>

        {sections.map((section) => (
          <ProjectSectionBlock
            key={section.id}
            section={section}
            canAnimate={canAnimate}
          />
        ))}
      </div>
    </div>
  );
}
