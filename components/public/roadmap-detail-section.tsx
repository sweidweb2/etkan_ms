"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useState, type ReactNode } from "react";
import { ArrowLeftIcon, ChevronDownIcon } from "lucide-react";
import LineSidebar, {
  type LineSidebarItem,
} from "@/components/LineSidebar";
import { CAREER_SPECIALITY_OUTLINE } from "@/lib/constants/career-specialities";
import { CAREER_STAGE_OUTLINE } from "@/lib/constants/career-stages";
import type { CareersRoadmapCard } from "@/lib/constants/careers-roadmaps";
import { ROUTES } from "@/lib/constants/routes";
import type { MessageKey } from "@/lib/i18n/messages";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

type RoadmapDetailSectionProps = {
  roadmap: CareersRoadmapCard;
};

type OutlineTarget = {
  id: string;
  item: LineSidebarItem;
};

type RoadmapQaItemProps = {
  question: string;
  children: ReactNode;
};

function RoadmapQaItem({ question, children }: RoadmapQaItemProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className="overflow-hidden rounded-xl border border-[#3E3E75]/10 dark:border-[#C4C4E8]/10">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-3.5 text-start transition-colors sm:px-5",
          "hover:bg-[color-mix(in_oklch,var(--primary)_6%,transparent)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset",
          open && "border-b border-[#3E3E75]/10 dark:border-[#C4C4E8]/10"
        )}
      >
        <h3 className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-[#3E3E75] dark:text-[#C4C4E8]">
          {question}
        </h3>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-[#3E3E75]/70 transition-transform duration-300 ease-in-out dark:text-[#C4C4E8]/70",
            open && "rotate-180"
          )}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-in-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 py-4 sm:px-5">{children}</div>
        </div>
      </div>
    </div>
  );
}

const QA_STAGE_ANSWER_KEYS = [
  "careers.roadmap.detail.qa.a1.stage1",
  "careers.roadmap.detail.qa.a1.stage2",
  "careers.roadmap.detail.qa.a1.stage3",
  "careers.roadmap.detail.qa.a1.stage4",
  "careers.roadmap.detail.qa.a1.stage5",
  "careers.roadmap.detail.qa.a1.stage6",
] as const satisfies readonly MessageKey[];

function RoadmapPricingBlock({ t }: { t: (key: MessageKey) => string }) {
  return (
    <section
      id="pricing"
      className="scroll-mt-28 rounded-2xl border border-[#3E3E75]/12 bg-background/90 p-6 sm:p-8 dark:border-[#C4C4E8]/12"
    >
      <p className="text-xs font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
        {t("careers.roadmap.detail.outline.pricing")}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
        {t("careers.roadmap.detail.pricingTitle")}
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
        {t("careers.roadmap.detail.pricingLead")}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[#3E3E75]/10 bg-[color-mix(in_oklch,var(--primary)_6%,var(--background))] p-4 sm:p-5 dark:border-[#C4C4E8]/10">
          <h3 className="text-sm font-semibold tracking-tight text-[#3E3E75] dark:text-[#C4C4E8]">
            {t("careers.roadmap.detail.pricing.costTitle")}
          </h3>
          <p className="mt-2 text-2xl font-semibold tracking-tight">
            {t("careers.roadmap.detail.pricing.costAmount")}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("careers.roadmap.detail.pricing.costDuration")}
          </p>
        </div>

        <div className="rounded-xl border border-[#3E3E75]/10 bg-[color-mix(in_oklch,var(--primary)_6%,var(--background))] p-4 sm:p-5 dark:border-[#C4C4E8]/10">
          <h3 className="text-sm font-semibold tracking-tight text-[#3E3E75] dark:text-[#C4C4E8]">
            {t("careers.roadmap.detail.pricing.planTitle")}
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-2">
              <span
                aria-hidden="true"
                className="mt-2 size-1.5 shrink-0 rounded-full bg-[#3E3E75] dark:bg-[#C4C4E8]"
              />
              <span>{t("careers.roadmap.detail.pricing.planUpfront")}</span>
            </li>
            <li className="flex gap-2">
              <span
                aria-hidden="true"
                className="mt-2 size-1.5 shrink-0 rounded-full bg-[#3E3E75] dark:bg-[#C4C4E8]"
              />
              <span>{t("careers.roadmap.detail.pricing.planSchedule")}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div className="rounded-xl border border-[#3E3E75]/10 p-4 sm:p-5 dark:border-[#C4C4E8]/10">
          <h3 className="text-sm font-semibold tracking-tight text-[#3E3E75] dark:text-[#C4C4E8]">
            {t("careers.roadmap.detail.pricing.progressTitle")}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            {t("careers.roadmap.detail.pricing.progressBody")}
          </p>
        </div>

        <div className="rounded-xl border border-[#3E3E75]/10 p-4 sm:p-5 dark:border-[#C4C4E8]/10">
          <h3 className="text-sm font-semibold tracking-tight text-[#3E3E75] dark:text-[#C4C4E8]">
            {t("careers.roadmap.detail.pricing.lateTitle")}
          </h3>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-2">
              <span
                aria-hidden="true"
                className="mt-2 size-1.5 shrink-0 rounded-full bg-[#3E3E75] dark:bg-[#C4C4E8]"
              />
              <span>{t("careers.roadmap.detail.pricing.latePenalty")}</span>
            </li>
            <li className="flex gap-2">
              <span
                aria-hidden="true"
                className="mt-2 size-1.5 shrink-0 rounded-full bg-[#3E3E75] dark:bg-[#C4C4E8]"
              />
              <span>{t("careers.roadmap.detail.pricing.aidBody")}</span>
            </li>
          </ul>
        </div>

        <div className="rounded-xl border border-[#3E3E75]/10 p-4 sm:p-5 dark:border-[#C4C4E8]/10">
          <h3 className="text-sm font-semibold tracking-tight text-[#3E3E75] dark:text-[#C4C4E8]">
            {t("careers.roadmap.detail.pricing.workTitle")}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            {t("careers.roadmap.detail.pricing.workBody")}
          </p>
        </div>
      </div>
    </section>
  );
}

export function RoadmapDetailSection({ roadmap }: RoadmapDetailSectionProps) {
  const { t } = usePublicI18n();
  const [activeIndex, setActiveIndex] = useState(0);
  const isSpecialized = roadmap.id === "specialized";

  const outlineTargets = useMemo<OutlineTarget[]>(() => {
    const treeParent: OutlineTarget = isSpecialized
      ? {
          id: "specialities",
          item: {
            label: t("careers.roadmap.detail.outline.specialities"),
            id: "specialities",
          },
        }
      : {
          id: "stages",
          item: {
            label: t("careers.roadmap.detail.outline.stages"),
            id: "stages",
          },
        };

    const treeChildren: OutlineTarget[] = isSpecialized
      ? CAREER_SPECIALITY_OUTLINE.map((speciality) => ({
          id: `speciality-${speciality.id}`,
          item: {
            label: t(speciality.titleKey),
            id: `speciality-${speciality.id}`,
            depth: 1,
          },
        }))
      : CAREER_STAGE_OUTLINE.map((stage) => ({
          id: `stage-${stage.id}`,
          item: {
            label: t(stage.titleKey),
            id: `stage-${stage.id}`,
            depth: 1,
          },
        }));

    return [
      {
        id: "main",
        item: {
          label: t("careers.roadmap.detail.outline.main"),
          id: "main",
        },
      },
      treeParent,
      ...treeChildren,
      {
        id: "pricing",
        item: {
          label: t("careers.roadmap.detail.outline.pricing"),
          id: "pricing",
        },
      },
      {
        id: "qa",
        item: {
          label: t("careers.roadmap.detail.outline.qa"),
          id: "qa",
        },
      },
    ];
  }, [isSpecialized, t]);

  const outlineItems = outlineTargets.map((entry) => entry.item);

  const scrollToSection = (index: number) => {
    setActiveIndex(index);
    const targetId = outlineTargets[index]?.id;
    if (!targetId) return;
    document
      .getElementById(targetId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="relative isolate px-4 pt-20 pb-16 sm:px-6 sm:pt-24 sm:pb-20">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--muted)_32%,var(--background)))]"
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <Link
          href={ROUTES.CAREERS}
          suppressHydrationWarning
          className="inline-flex items-center gap-2 text-sm font-medium text-[#3E3E75] transition-colors hover:text-[#2F2F5A] dark:text-[#C4C4E8] dark:hover:text-white"
        >
          <ArrowLeftIcon className="size-4 rtl:rotate-180" aria-hidden="true" />
          <span suppressHydrationWarning>{t("careers.roadmap.detail.back")}</span>
        </Link>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(15rem,17.5rem)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <aside className="lg:sticky lg:top-24 lg:z-20">
            <div className="flex max-h-[min(32rem,70dvh)] flex-col overflow-hidden rounded-2xl border border-[#3E3E75]/15 bg-background/95 shadow-[0_16px_40px_-28px_rgba(62,62,117,0.45)] lg:max-h-[calc(100dvh-7.5rem)] dark:border-[#C4C4E8]/15 dark:bg-[#2A2A45]/95">
              <div className="shrink-0 border-b border-[#3E3E75]/10 px-4 py-3 dark:border-[#C4C4E8]/10">
                <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
                  {t("careers.roadmap.detail.outlineLabel")}
                </p>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 sm:px-4">
                <LineSidebar
                  items={outlineItems}
                  accentColor="var(--primary)"
                  textColor="var(--foreground)"
                  markerColor="var(--ring)"
                  showIndex
                  showMarker
                  proximityRadius={100}
                  maxShift={18}
                  falloff="smooth"
                  markerLength={40}
                  markerGap={0}
                  tickScale={0.5}
                  scaleTick
                  itemGap={14}
                  fontSize={0.98}
                  smoothing={100}
                  defaultActive={0}
                  activeIndex={activeIndex}
                  onItemClick={(index) => scrollToSection(index)}
                />
              </div>
            </div>
          </aside>

          <div className="flex min-w-0 flex-col gap-10 sm:gap-12">
            <article
              id="main"
              className="scroll-mt-28 overflow-hidden rounded-2xl border border-[#3E3E75]/15 bg-background/90 shadow-[0_20px_50px_-36px_rgba(62,62,117,0.45)] dark:border-[#C4C4E8]/15"
            >
              <div className="relative aspect-[16/9]">
                <Image
                  src={roadmap.imageSrc}
                  alt={t(roadmap.imageAltKey)}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 720px"
                  className="object-cover"
                />
              </div>
              <div className="p-6 sm:p-8">
                <p className="text-xs font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
                  {t("careers.tab.roadmap")}
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
                  {t(roadmap.titleKey)}
                </h1>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
                  {t(roadmap.bodyKey)}
                </p>
              </div>
            </article>

            {isSpecialized ? (
              <section id="specialities" className="scroll-mt-28">
                <p className="text-xs font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
                  {t("careers.roadmap.detail.outline.specialities")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                  {t("careers.roadmap.detail.specialitiesTitle")}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
                  {t("careers.roadmap.detail.specialitiesLead")}
                </p>

                <div className="mt-6 flex flex-col gap-4">
                  {CAREER_SPECIALITY_OUTLINE.map((speciality, index) => (
                    <article
                      key={speciality.id}
                      id={`speciality-${speciality.id}`}
                      className="scroll-mt-28 rounded-2xl border border-[#3E3E75]/12 bg-background/90 p-5 sm:p-6 dark:border-[#C4C4E8]/12"
                    >
                      <p className="font-mono text-xs tracking-[0.14em] text-[#3E3E75]/80 uppercase dark:text-[#C4C4E8]/80">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
                        {t(speciality.titleKey)}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                        {t(speciality.descKey)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : (
              <section id="stages" className="scroll-mt-28">
                <p className="text-xs font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
                  {t("careers.roadmap.detail.outline.stages")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                  {t("careers.roadmap.detail.stagesTitle")}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
                  {t("careers.roadmap.detail.stagesLead")}
                </p>

                <div className="mt-6 flex flex-col gap-4">
                  {CAREER_STAGE_OUTLINE.map((stage, index) => (
                    <article
                      key={stage.id}
                      id={`stage-${stage.id}`}
                      className="scroll-mt-28 rounded-2xl border border-[#3E3E75]/12 bg-background/90 p-5 sm:p-6 dark:border-[#C4C4E8]/12"
                    >
                      <p className="font-mono text-xs tracking-[0.14em] text-[#3E3E75]/80 uppercase dark:text-[#C4C4E8]/80">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
                        {t(stage.titleKey)}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                        {t(stage.descKey)}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <RoadmapPricingBlock t={t} />

            <section
              id="qa"
              className="scroll-mt-28 rounded-2xl border border-[#3E3E75]/12 bg-background/90 p-6 sm:p-8 dark:border-[#C4C4E8]/12"
            >
              <p className="text-xs font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
                {t("careers.roadmap.detail.outline.qa")}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {t("careers.roadmap.detail.qaTitle")}
              </h2>

              <div className="mt-6 space-y-3">
                {isSpecialized ? (
                  <RoadmapQaItem
                    question={t("careers.roadmap.detail.qa.specialized.q1")}
                  >
                    <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                      {t("careers.roadmap.detail.qa.specialized.a1")}
                    </p>
                  </RoadmapQaItem>
                ) : (
                  <RoadmapQaItem question={t("careers.roadmap.detail.qa.q1")}>
                    <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                      {t("careers.roadmap.detail.qa.a1")}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
                      {QA_STAGE_ANSWER_KEYS.map((key) => (
                        <li key={key} className="flex gap-2">
                          <span
                            aria-hidden="true"
                            className="mt-2 size-1.5 shrink-0 rounded-full bg-[#3E3E75] dark:bg-[#C4C4E8]"
                          />
                          <span>{t(key)}</span>
                        </li>
                      ))}
                    </ul>
                  </RoadmapQaItem>
                )}

                <RoadmapQaItem
                  question={t("careers.roadmap.detail.qa.enterSpecialized.q")}
                >
                  <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
                    {t("careers.roadmap.detail.qa.enterSpecialized.a")}
                  </p>
                </RoadmapQaItem>
              </div>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}
