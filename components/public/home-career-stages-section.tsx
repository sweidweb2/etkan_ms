"use client";

import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CareerStagesWheel,
  type CareerStageOption,
} from "@/components/public/career-stages-wheel";
import { CourseCardImage } from "@/components/public/course-card-image";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HorizontalScrollCarousel } from "@/components/ui/horizontal-scroll-carousel";
import { useHydrated } from "@/hooks/use-hydrated";
import { getCareersSyllabusCourseImage } from "@/lib/constants/careers-syllabus-images";
import { getCareersStageSyllabus } from "@/lib/constants/careers-roadmap-syllabus";
import {
  CAREERS_ROADMAP_STAGES,
  isCareersRoadmapStageId,
  type CareersRoadmapStageId,
} from "@/lib/constants/careers-roadmaps";
import { getCareersRoadmapDetailRoute } from "@/lib/constants/routes";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const SECTION_VIEWPORT = { once: true, amount: 0.2, margin: "0px 0px -10% 0px" } as const;

function StageCourseCard({
  stageHref,
  title,
  body,
  imageSrc,
}: {
  stageHref: string;
  title: string;
  body: string;
  imageSrc: string;
}) {
  return (
    <Link
      href={stageHref}
      suppressHydrationWarning
      className="group block h-full rounded-xl outline-none transition-transform duration-500 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl focus-visible:ring-2 focus-visible:ring-white/40"
    >
      <Card
        size="sm"
        className="h-full gap-2 overflow-hidden border-0 bg-[#4A4A86] p-3 text-white shadow-sm ring-1 ring-white/15 transition-colors duration-500 group-hover:bg-[#52528F]"
      >
        <CourseCardImage
          src={imageSrc}
          alt={title}
          className="bg-[#2F2F5A]"
        />
        <CardHeader className="gap-1 p-0 px-0.5">
          <CardTitle className="text-sm text-white" suppressHydrationWarning>
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 px-0.5 pb-0.5">
          <CardDescription
            className="line-clamp-2 text-pretty text-white/60"
            suppressHydrationWarning
          >
            {body}
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}

export function HomeCareerStagesSection() {
  const { t } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const [activeId, setActiveId] = useState<CareersRoadmapStageId>(
    CAREERS_ROADMAP_STAGES[0]?.id ?? "stage-1"
  );

  const activeStage =
    CAREERS_ROADMAP_STAGES.find((stage) => stage.id === activeId) ??
    CAREERS_ROADMAP_STAGES[0];
  const activeSyllabus = activeStage
    ? getCareersStageSyllabus(activeStage.id)
    : null;
  const activeCourses = activeSyllabus?.courses ?? [];
  const stageHref = activeStage
    ? getCareersRoadmapDetailRoute(activeStage.id)
    : "#";

  const wheelStages: CareerStageOption[] = CAREERS_ROADMAP_STAGES.map((stage) => ({
    id: stage.id,
    label: t(stage.titleKey),
    indexLabel: String(stage.index).padStart(2, "0"),
  }));

  const canAnimate = hydrated && !reduceMotion;

  return (
    <section className="relative isolate overflow-hidden bg-[#3E3E75] px-4 py-10 text-white sm:px-6 sm:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(154,154,208,0.22),transparent_55%),linear-gradient(180deg,#343463,#3E3E75_45%,#2F2F5A)]"
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        <motion.div
          className="mx-auto max-w-3xl text-center"
          initial={canAnimate ? { opacity: 0, y: 28 } : false}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={SECTION_VIEWPORT}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <p className="text-xs font-semibold tracking-[0.18em] text-white/55 uppercase">
            {t("careerStages.eyebrow")}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-balance text-white sm:text-3xl">
            {t("careerStages.title")}
          </h2>
        </motion.div>

        <div className="mt-10 grid items-start gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <motion.div
            initial={canAnimate ? { opacity: 0, scale: 0.82, x: -36 } : false}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={SECTION_VIEWPORT}
            transition={{ duration: 1.05, ease: EASE, delay: 0.12 }}
            className="lg:max-w-none"
          >
            <CareerStagesWheel
              stages={wheelStages}
              activeId={activeId}
              onSelect={(id) => {
                if (isCareersRoadmapStageId(id)) {
                  setActiveId(id);
                }
              }}
              hubLabel={t("careerStages.hubLabel")}
              ariaLabel={t("careerStages.wheelLabel")}
              className="lg:max-w-none"
            />
          </motion.div>

          <motion.div
            initial={canAnimate ? { opacity: 0, x: 40, y: 20 } : false}
            whileInView={{ opacity: 1, x: 0, y: 0 }}
            viewport={SECTION_VIEWPORT}
            transition={{ duration: 1, ease: EASE, delay: 0.28 }}
            className="min-h-[22rem] min-w-0 overflow-hidden rounded-2xl border border-white/15 bg-[#2F2F5A]/75 p-5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.55)] backdrop-blur-sm sm:p-6"
          >
            <AnimatePresence mode="wait">
              {activeStage ? (
                <motion.div
                  key={activeStage.id}
                  initial={hydrated ? { opacity: 0, y: 10 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.45, ease: EASE }}
                >
                  <p className="text-xs font-semibold tracking-[0.16em] text-[#C4C4E8] uppercase">
                    {t(activeStage.shortLabelKey)}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                    {t(activeStage.titleKey)}
                  </h3>

                  {activeSyllabus?.noteKey ? (
                    <p className="mt-2 text-sm leading-relaxed text-white/70 text-pretty">
                      {t(activeSyllabus.noteKey)}
                    </p>
                  ) : null}

                  {activeCourses.length > 0 ? (
                    <>
                      <p className="mt-4 text-xs font-semibold tracking-[0.16em] text-[#C4C4E8] uppercase">
                        {t("careerStages.coursesLabel")}
                      </p>

                      <HorizontalScrollCarousel
                        className="mt-3"
                        resetScrollKey={activeStage.id}
                        ariaLabel={t("careerStages.coursesLabel")}
                        navButtonClassName="text-white/80 hover:bg-white/10 hover:text-white disabled:text-white/25"
                        contentClassName="px-1 py-1"
                      >
                        <div
                          className={cn(
                            "flex w-max gap-3",
                            activeCourses.length === 1 && "min-w-full justify-center"
                          )}
                        >
                          {activeCourses.map((course) => (
                            <div
                              key={course.id}
                              className="w-[min(13rem,78vw)] shrink-0 snap-start sm:w-[14.5rem]"
                            >
                              <StageCourseCard
                                stageHref={stageHref}
                                title={t(course.titleKey)}
                                body={t(course.bodyKey)}
                                imageSrc={getCareersSyllabusCourseImage(course.id)}
                              />
                            </div>
                          ))}
                        </div>
                      </HorizontalScrollCarousel>
                    </>
                  ) : null}

                  <div className="mt-5">
                    <Link
                      href={stageHref}
                      suppressHydrationWarning
                      className="inline-flex text-sm font-medium text-[#C4C4E8] underline-offset-4 transition-colors hover:text-white hover:underline"
                    >
                      {t("careers.roadmap.book.openPath")}
                    </Link>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
