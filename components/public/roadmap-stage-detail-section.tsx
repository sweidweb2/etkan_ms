"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ChevronDownIcon,
} from "lucide-react";
import {
  getAdjacentCareersRoadmapStages,
  type CareersRoadmapStage,
} from "@/lib/constants/careers-roadmaps";
import {
  getCareersStageSyllabus,
  type CareersSyllabusCourse,
} from "@/lib/constants/careers-roadmap-syllabus";
import {
  getCareersRoadmapDetailRoute,
  ROUTES,
} from "@/lib/constants/routes";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

type RoadmapStageDetailSectionProps = {
  stage: CareersRoadmapStage;
};

function CourseSyllabusCard({
  course,
  open,
  onToggle,
}: {
  course: CareersSyllabusCourse;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = usePublicI18n();
  const panelId = useId();
  const title = t(course.titleKey);
  const body = t(course.bodyKey);

  return (
    <li>
      <article
        className={cn(
          "overflow-hidden rounded-2xl border border-[#3E3E75]/20 bg-background shadow-[0_14px_36px_-30px_rgba(62,62,117,0.55)]",
          "dark:border-[#C4C4E8]/20 dark:bg-[#2A2A48]/80"
        )}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className={cn(
            "flex w-full items-start gap-3 px-5 py-4 text-start transition-colors",
            "hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3E3E75]/35 focus-visible:ring-inset"
          )}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
              {t("careers.syllabus.courseBadge")}
            </p>
            <h2
              className="mt-2 text-lg font-semibold tracking-tight text-balance sm:text-xl"
              suppressHydrationWarning
            >
              {title}
            </h2>
            <p
              className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty"
              suppressHydrationWarning
            >
              {body}
            </p>
          </div>
          <ChevronDownIcon
            className={cn(
              "mt-1 size-5 shrink-0 text-[#3E3E75] transition-transform duration-300 ease-out dark:text-[#C4C4E8]",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>

        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              id={panelId}
              key="milestones"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-[#3E3E75]/10 px-5 py-4 dark:border-[#C4C4E8]/10">
                {course.milestones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("careers.syllabus.empty")}
                  </p>
                ) : (
                  <ol className="flex flex-col gap-2.5">
                    {course.milestones.map((milestone, index) => (
                      <li key={milestone.id}>
                        <article
                          className={cn(
                            "rounded-xl border border-[#3E3E75]/12 bg-muted/30 px-4 py-3",
                            "dark:border-[#C4C4E8]/12 dark:bg-[#24243C]/70"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 inline-flex min-w-8 shrink-0 items-center justify-center rounded-md bg-[#3E3E75]/10 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-[#3E3E75] dark:bg-[#C4C4E8]/15 dark:text-[#C4C4E8]">
                              #{index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                                {t("careers.syllabus.milestoneBadge")}
                              </p>
                              <h3
                                className="mt-1 text-sm font-medium tracking-tight text-foreground"
                                suppressHydrationWarning
                              >
                                {t(milestone.titleKey)}
                              </h3>
                            </div>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </article>
    </li>
  );
}

export function RoadmapStageDetailSection({
  stage,
}: RoadmapStageDetailSectionProps) {
  const { t, dir } = usePublicI18n();
  const { prev, next } = getAdjacentCareersRoadmapStages(stage.id);
  const syllabus = getCareersStageSyllabus(stage.id);
  const courses = syllabus?.courses ?? [];
  const firstCourseId = courses[0]?.id ?? null;
  const [openCourseIds, setOpenCourseIds] = useState<Set<string>>(() =>
    firstCourseId ? new Set([firstCourseId]) : new Set()
  );
  const BackArrow = dir === "rtl" ? ArrowRightIcon : ArrowLeftIcon;
  const PrevArrow = dir === "rtl" ? ArrowRightIcon : ArrowLeftIcon;
  const NextArrow = dir === "rtl" ? ArrowLeftIcon : ArrowRightIcon;

  function toggleCourse(courseId: string) {
    setOpenCourseIds((current) => {
      const nextIds = new Set(current);
      if (nextIds.has(courseId)) {
        nextIds.delete(courseId);
      } else {
        nextIds.add(courseId);
      }
      return nextIds;
    });
  }

  return (
    <section className="relative px-4 pt-28 pb-20 sm:px-6 sm:pb-28">
      <div className="mx-auto max-w-3xl">
        <Link
          href={ROUTES.CAREERS}
          suppressHydrationWarning
          className="inline-flex items-center gap-2 text-sm font-medium text-[#3E3E75] transition-colors hover:text-[#2F2F5A] dark:text-[#C4C4E8] dark:hover:text-white"
        >
          <BackArrow className="size-4" aria-hidden="true" />
          {t("careers.roadmap.stage.back")}
        </Link>

        <p
          className="mt-8 text-xs font-extrabold tracking-[0.16em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]"
          suppressHydrationWarning
        >
          {t(stage.shortLabelKey)}
        </p>

        <h1
          className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          suppressHydrationWarning
        >
          {t(stage.titleKey)}
        </h1>

        <div className="mt-10">
          <h2
            className="text-sm font-semibold tracking-[0.14em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]"
            suppressHydrationWarning
          >
            {t("careers.syllabus.label")}
          </h2>

          {courses.length === 0 ? (
            <div className="mt-4 min-h-32 rounded-2xl border border-dashed border-[#3E3E75]/20 bg-muted/20 px-5 py-8 dark:border-[#C4C4E8]/15">
              <p
                className="text-sm leading-relaxed text-muted-foreground text-pretty"
                suppressHydrationWarning
              >
                {syllabus?.noteKey
                  ? t(syllabus.noteKey)
                  : t("careers.syllabus.empty")}
              </p>
            </div>
          ) : (
            <>
              {syllabus?.noteKey ? (
                <p
                  className="mt-4 text-sm leading-relaxed text-muted-foreground text-pretty"
                  suppressHydrationWarning
                >
                  {t(syllabus.noteKey)}
                </p>
              ) : null}

              <ol className="mt-5 flex flex-col gap-3">
                {courses.map((course) => (
                  <CourseSyllabusCard
                    key={course.id}
                    course={course}
                    open={openCourseIds.has(course.id)}
                    onToggle={() => toggleCourse(course.id)}
                  />
                ))}
              </ol>
            </>
          )}
        </div>

        <nav
          aria-label={t("careers.roadmap.stagesLabel")}
          className="mt-12 grid gap-3 sm:grid-cols-2"
        >
          {prev ? (
            <Link
              href={getCareersRoadmapDetailRoute(prev.id)}
              suppressHydrationWarning
              className={cn(
                "group flex items-start gap-3 rounded-2xl border border-[#3E3E75]/15 bg-background px-4 py-4 transition-colors hover:border-[#3E3E75]/35 hover:bg-muted/40",
                "dark:border-[#C4C4E8]/15 dark:hover:border-[#C4C4E8]/35"
              )}
            >
              <PrevArrow
                className="mt-0.5 size-4 shrink-0 text-[#3E3E75] dark:text-[#C4C4E8]"
                aria-hidden="true"
              />
              <span className="min-w-0">
                <span className="block text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {t("careers.roadmap.stage.prev")}
                </span>
                <span className="mt-1 block text-sm font-semibold tracking-tight group-hover:text-[#3E3E75] dark:group-hover:text-[#C4C4E8]">
                  {t(prev.titleKey)}
                </span>
              </span>
            </Link>
          ) : (
            <div aria-hidden="true" className="hidden sm:block" />
          )}

          {next ? (
            <Link
              href={getCareersRoadmapDetailRoute(next.id)}
              suppressHydrationWarning
              className={cn(
                "group flex items-start justify-end gap-3 rounded-2xl border border-[#3E3E75]/15 bg-background px-4 py-4 text-end transition-colors hover:border-[#3E3E75]/35 hover:bg-muted/40",
                "dark:border-[#C4C4E8]/15 dark:hover:border-[#C4C4E8]/35",
                !prev ? "sm:col-start-2" : null
              )}
            >
              <span className="min-w-0">
                <span className="block text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {t("careers.roadmap.stage.next")}
                </span>
                <span className="mt-1 block text-sm font-semibold tracking-tight group-hover:text-[#3E3E75] dark:group-hover:text-[#C4C4E8]">
                  {t(next.titleKey)}
                </span>
              </span>
              <NextArrow
                className="mt-0.5 size-4 shrink-0 text-[#3E3E75] dark:text-[#C4C4E8]"
                aria-hidden="true"
              />
            </Link>
          ) : null}
        </nav>
      </div>
    </section>
  );
}
