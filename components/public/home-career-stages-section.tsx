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
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

const CAROUSEL_THRESHOLD = 3;
const EASE = [0.22, 1, 0.36, 1] as const;
const SECTION_VIEWPORT = { once: true, amount: 0.2, margin: "0px 0px -10% 0px" } as const;

type StageCourse = {
  titleKey: MessageKey;
  bodyKey: MessageKey;
  imageSrc: string;
};

type CareerStage = {
  id: string;
  titleKey: MessageKey;
  descKey: MessageKey;
  courses: StageCourse[];
};

const IMG = {
  python:
    "https://images.unsplash.com/photo-1690683789978-3cf73960d650?q=80&w=1509&auto=format&fit=crop",
  arduino:
    "https://media.istockphoto.com/id/2276854525/photo/electronic-components-and-hardware-engineering-tools-organized-on-a-dark-work-desk-close-up.jpg?s=2048x2048&w=is&k=20&c=vL9Xly7erRY2XdCOi8Wss3hhe5ZsY7i9jFRZe9JbZdQ=",
  computer:
    "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1170&auto=format&fit=crop",
  print3d:
    "https://images.unsplash.com/photo-1704283860614-803aa8be7993?q=80&w=1170&auto=format&fit=crop",
  circuit:
    "https://images.unsplash.com/photo-1553406830-ef2513450d76?q=80&w=1171&auto=format&fit=crop",
  machining:
    "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1170&auto=format&fit=crop",
  web: "https://media.istockphoto.com/id/1355140477/photo/top-view-of-laptop-with-text-html5.jpg?s=2048x2048&w=is&k=20&c=uSkopBhFAAajALqs8xZCXZODKXaOklYH_OikPcytYEI=",
  mobile:
    "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1170&auto=format&fit=crop",
  backend:
    "https://images.unsplash.com/photo-1621839673705-6617adf9e890?q=80&w=1332&auto=format&fit=crop",
  planning:
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1170&auto=format&fit=crop",
  business:
    "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1115&auto=format&fit=crop",
  assembly:
    "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=1170&auto=format&fit=crop",
  machines:
    "https://images.unsplash.com/photo-1565043666747-69f6646db940?q=80&w=1074&auto=format&fit=crop",
  electronics:
    "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1170&auto=format&fit=crop",
  logic:
    "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=1169&auto=format&fit=crop",
  mcu: "https://images.unsplash.com/photo-1553406830-ef2513450d76?q=80&w=1171&auto=format&fit=crop",
  transducer:
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1170&auto=format&fit=crop",
  schematic:
    "https://images.unsplash.com/photo-1581092162384-8987c1d64718?q=80&w=1170&auto=format&fit=crop",
  pcb: "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=1073&auto=format&fit=crop",
  process:
    "https://images.unsplash.com/photo-1565043589252-4e0a2a8a0b0e?q=80&w=1170&auto=format&fit=crop",
  mold: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?q=80&w=1170&auto=format&fit=crop",
  sheetMetal:
    "https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1170&auto=format&fit=crop",
} as const;

const STAGES: CareerStage[] = [
  {
    id: "1",
    titleKey: "careerStages.stage1.title",
    descKey: "careerStages.stage1.desc",
    courses: [
      {
        titleKey: "careerStages.stage1.course1.title",
        bodyKey: "careerStages.stage1.course1.body",
        imageSrc: IMG.python,
      },
      {
        titleKey: "careerStages.stage1.course2.title",
        bodyKey: "careerStages.stage1.course2.body",
        imageSrc: IMG.arduino,
      },
      {
        titleKey: "careerStages.stage1.course3.title",
        bodyKey: "careerStages.stage1.course3.body",
        imageSrc: IMG.computer,
      },
    ],
  },
  {
    id: "2",
    titleKey: "careerStages.stage2.title",
    descKey: "careerStages.stage2.desc",
    courses: [
      {
        titleKey: "careerStages.stage2.course1.title",
        bodyKey: "careerStages.stage2.course1.body",
        imageSrc: IMG.print3d,
      },
      {
        titleKey: "careerStages.stage2.course2.title",
        bodyKey: "careerStages.stage2.course2.body",
        imageSrc: IMG.circuit,
      },
      {
        titleKey: "careerStages.stage2.course3.title",
        bodyKey: "careerStages.stage2.course3.body",
        imageSrc: IMG.machining,
      },
    ],
  },
  {
    id: "3",
    titleKey: "careerStages.stage3.title",
    descKey: "careerStages.stage3.desc",
    courses: [
      {
        titleKey: "careerStages.stage3.course1.title",
        bodyKey: "careerStages.stage3.course1.body",
        imageSrc: IMG.web,
      },
      {
        titleKey: "careerStages.stage3.course2.title",
        bodyKey: "careerStages.stage3.course2.body",
        imageSrc: IMG.mobile,
      },
      {
        titleKey: "careerStages.stage3.course3.title",
        bodyKey: "careerStages.stage3.course3.body",
        imageSrc: IMG.backend,
      },
    ],
  },
  {
    id: "4",
    titleKey: "careerStages.stage4.title",
    descKey: "careerStages.stage4.desc",
    courses: [
      {
        titleKey: "careerStages.stage4.course1.title",
        bodyKey: "careerStages.stage4.course1.body",
        imageSrc: IMG.planning,
      },
      {
        titleKey: "careerStages.stage4.course2.title",
        bodyKey: "careerStages.stage4.course2.body",
        imageSrc: IMG.business,
      },
      {
        titleKey: "careerStages.stage4.course3.title",
        bodyKey: "careerStages.stage4.course3.body",
        imageSrc: IMG.assembly,
      },
      {
        titleKey: "careerStages.stage4.course4.title",
        bodyKey: "careerStages.stage4.course4.body",
        imageSrc: IMG.machines,
      },
    ],
  },
  {
    id: "5",
    titleKey: "careerStages.stage5.title",
    descKey: "careerStages.stage5.desc",
    courses: [
      {
        titleKey: "careerStages.stage5.course1.title",
        bodyKey: "careerStages.stage5.course1.body",
        imageSrc: IMG.electronics,
      },
      {
        titleKey: "careerStages.stage5.course2.title",
        bodyKey: "careerStages.stage5.course2.body",
        imageSrc: IMG.logic,
      },
      {
        titleKey: "careerStages.stage5.course3.title",
        bodyKey: "careerStages.stage5.course3.body",
        imageSrc: IMG.mcu,
      },
      {
        titleKey: "careerStages.stage5.course4.title",
        bodyKey: "careerStages.stage5.course4.body",
        imageSrc: IMG.transducer,
      },
      {
        titleKey: "careerStages.stage5.course5.title",
        bodyKey: "careerStages.stage5.course5.body",
        imageSrc: IMG.schematic,
      },
      {
        titleKey: "careerStages.stage5.course6.title",
        bodyKey: "careerStages.stage5.course6.body",
        imageSrc: IMG.pcb,
      },
    ],
  },
  {
    id: "6",
    titleKey: "careerStages.stage6.title",
    descKey: "careerStages.stage6.desc",
    courses: [
      {
        titleKey: "careerStages.stage6.course1.title",
        bodyKey: "careerStages.stage6.course1.body",
        imageSrc: IMG.machining,
      },
      {
        titleKey: "careerStages.stage6.course2.title",
        bodyKey: "careerStages.stage6.course2.body",
        imageSrc: IMG.mold,
      },
      {
        titleKey: "careerStages.stage6.course3.title",
        bodyKey: "careerStages.stage6.course3.body",
        imageSrc: IMG.sheetMetal,
      },
    ],
  },
];

function StageCourseCard({
  course,
  title,
  body,
}: {
  course: StageCourse;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={ROUTES.CAREERS}
      suppressHydrationWarning
      className="group block h-full rounded-xl outline-none transition-transform duration-500 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:shadow-xl focus-visible:ring-2 focus-visible:ring-white/40"
    >
      <Card
        size="sm"
        className="h-full gap-2 overflow-hidden border-0 bg-[#4A4A86] p-3 text-white shadow-sm ring-1 ring-white/15 transition-colors duration-500 group-hover:bg-[#52528F]"
      >
        <CourseCardImage
          src={course.imageSrc}
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
  const [activeId, setActiveId] = useState(STAGES[0]?.id ?? "1");

  const activeStage = STAGES.find((s) => s.id === activeId) ?? STAGES[0];

  const wheelStages: CareerStageOption[] = STAGES.map((stage, i) => ({
    id: stage.id,
    label: t(stage.titleKey),
    indexLabel: String(i + 1).padStart(2, "0"),
  }));

  const courseCount = activeStage?.courses.length ?? 0;
  const useCarousel = courseCount > CAROUSEL_THRESHOLD;
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
              onSelect={setActiveId}
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
                    {t("careerStages.coursesLabel")}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                    {t(activeStage.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/70 text-pretty">
                    {t(activeStage.descKey)}
                  </p>

                  {useCarousel ? (
                    <HorizontalScrollCarousel
                      className="mt-5"
                      resetScrollKey={activeStage.id}
                      ariaLabel={t("careerStages.coursesLabel")}
                      navButtonClassName="text-white/80 hover:bg-white/10 hover:text-white disabled:text-white/25"
                      contentClassName="px-1 py-1"
                    >
                      <div className="flex w-max gap-3">
                        {activeStage.courses.map((course) => (
                          <div
                            key={course.titleKey}
                            className="w-[13rem] shrink-0 snap-start sm:w-[14.5rem]"
                          >
                            <StageCourseCard
                              course={course}
                              title={t(course.titleKey)}
                              body={t(course.bodyKey)}
                            />
                          </div>
                        ))}
                      </div>
                    </HorizontalScrollCarousel>
                  ) : (
                    <div
                      className={cn(
                        "mt-5 grid grid-flow-col gap-3",
                        courseCount === 1 && "grid-cols-1",
                        courseCount === 2 && "grid-cols-2",
                        courseCount >= 3 && "grid-cols-3"
                      )}
                    >
                      {activeStage.courses.map((course) => (
                        <StageCourseCard
                          key={course.titleKey}
                          course={course}
                          title={t(course.titleKey)}
                          body={t(course.bodyKey)}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
