"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CAREERS_ROADMAP_CARDS,
  CAREERS_ROADMAP_STAGES,
} from "@/lib/constants/careers-roadmaps";
import { getCareersRoadmapDetailRoute } from "@/lib/constants/routes";
import type { MessageKey } from "@/lib/i18n/messages";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const ROADMAP_NOTE_POINTS: MessageKey[] = [
  "careers.roadmap.note.point1",
  "careers.roadmap.note.point2",
  "careers.roadmap.note.point3",
  "careers.roadmap.note.point4",
];

const STICKY_NOTE_STYLES = [
  "rotate-[-1.8deg] bg-[#FFF4A8] text-slate-800 shadow-[2px_4px_0_rgba(62,62,117,0.12)]",
  "rotate-[1.4deg] bg-[#E8E4FF] text-slate-800 shadow-[2px_4px_0_rgba(62,62,117,0.12)]",
  "rotate-[-0.9deg] bg-[#D9F5E8] text-slate-800 shadow-[2px_4px_0_rgba(62,62,117,0.12)]",
  "rotate-[2deg] bg-[#FFE4D6] text-slate-800 shadow-[2px_4px_0_rgba(62,62,117,0.12)]",
] as const;

function PaperLines({ offset = "2.5rem" }: { offset?: string }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-90"
      style={{
        backgroundImage:
          "repeating-linear-gradient(transparent, transparent 27px, rgba(62,62,117,0.16) 28px)",
        backgroundPosition: `0 ${offset}`,
      }}
    />
  );
}

function PaperMarginRule() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 start-8 w-px bg-[#F5B7B1]/70 sm:start-10 dark:bg-[#9A9AD0]/25"
    />
  );
}

export function CareersSection() {
  const { t, dir } = usePublicI18n();

  return (
    <section className="relative isolate overflow-hidden px-4 pt-20 pb-6 sm:px-6 sm:pt-24 sm:pb-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,var(--background),color-mix(in_oklch,var(--muted)_32%,var(--background)))]"
      />

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
            {t("careers.eyebrow")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("careers.title")}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
            {t("careers.lead")}
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-5xl sm:mt-12">
          {/* Book cover board — light beige rim */}
          <div
            dir="ltr"
            className={cn(
              "relative rounded-[8px] p-[3px] sm:p-[4px]",
              "bg-[#F7F2E8]",
              "shadow-[0_16px_36px_-28px_rgba(62,62,117,0.3)]"
            )}
          >
            {/* Open pages */}
            <div
              className={cn(
                "relative grid overflow-hidden rounded-[5px] bg-[#FFFEF7] lg:grid-cols-2",
                "ring-1 ring-[#3E3E75]/10",
                "dark:bg-[#24243C] dark:ring-[#C4C4E8]/12"
              )}
            >
              {/* Soft spine crease (no hard separator line) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-1/2 z-30 hidden w-20 -translate-x-1/2 lg:block"
                style={{
                  background:
                    "linear-gradient(90deg, transparent 0%, rgba(62,62,117,0.05) 30%, rgba(30,30,55,0.14) 47%, rgba(255,255,255,0.35) 50%, rgba(30,30,55,0.14) 53%, rgba(62,62,117,0.05) 70%, transparent 100%)",
                }}
              />
              {/* Spine stitch hint */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-6 bottom-6 left-1/2 z-30 hidden w-px -translate-x-1/2 bg-[#3E3E75]/12 lg:block dark:bg-white/10"
              />

              {/* Left page */}
              <article
                dir={dir}
                className={cn(
                  "relative min-h-full overflow-hidden px-5 py-7 sm:px-7 sm:py-8",
                  "border-b border-[#3E3E75]/10 bg-[#FFFEF7] text-slate-800 lg:border-b-0",
                  "dark:border-[#C4C4E8]/12 dark:bg-[#2F2F4A] dark:text-[#F4F2FF]",
                  "shadow-[inset_-28px_0_40px_-28px_rgba(62,62,117,0.32),inset_12px_0_20px_-16px_rgba(255,255,255,0.7)]",
                  "dark:shadow-[inset_-28px_0_40px_-28px_rgba(0,0,0,0.5),inset_12px_0_20px_-16px_rgba(255,255,255,0.05)]"
                )}
              >
                {/* Left outer page edges */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 z-20 hidden w-[7px] lg:block"
                  style={{
                    background:
                      "linear-gradient(90deg, #D9D0BA 0%, #F7F1E4 55%, #FFFDF8 100%)",
                    boxShadow:
                      "inset -1px 0 0 rgba(62,62,117,0.12), 1px 0 0 rgba(255,255,255,0.5)",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-[3px] z-20 hidden w-px bg-[#3E3E75]/10 lg:block"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-[5px] z-20 hidden w-px bg-[#3E3E75]/08 lg:block"
                />

                <PaperLines />
                <PaperMarginRule />

                <div
                  aria-hidden="true"
                  className="absolute top-[-0.55rem] left-[18%] z-20 h-4 w-16 rotate-[-6deg] rounded-[1px] bg-[#C4C4E8]/80 shadow-sm dark:bg-[#9A9AD0]/55"
                />

                <div className="relative z-10 ps-3 sm:ps-5">
                  <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
                    {t("careers.roadmap.book.pathsLabel")}
                  </p>
                  <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-slate-600 text-pretty dark:text-[#E8E4FF]/80">
                    {t("careers.roadmap.book.pathsLead")}
                  </p>

                  <div className="mt-6 flex flex-col gap-5">
                    {CAREERS_ROADMAP_CARDS.map((card, index) => {
                      const title = t(card.titleKey);
                      const taped =
                        index === 0 ? "rotate-[-0.8deg]" : "rotate-[0.9deg]";
                      const tapeClass =
                        index === 0
                          ? "left-[22%] rotate-[-8deg] bg-[#FFF4A8]/90"
                          : "right-[18%] left-auto rotate-[7deg] bg-[#E8E4FF]/90";

                      return (
                        <article
                          key={card.id}
                          aria-label={title}
                          className={cn(
                            "group relative block rounded-[2px] border border-[#3E3E75]/12 bg-[#FFFDF6]/95 p-3",
                            "shadow-[1px_2px_0_rgba(62,62,117,0.08)]",
                            "dark:border-[#C4C4E8]/15 dark:bg-[#35355A]/70 dark:shadow-[1px_2px_0_rgba(0,0,0,0.25)]",
                            taped
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute top-[-0.45rem] z-20 h-3.5 w-14 rounded-[1px] shadow-sm",
                              tapeClass
                            )}
                          />

                          <div className="grid gap-3 sm:grid-cols-[minmax(0,8.5rem)_minmax(0,1fr)] sm:gap-4">
                            <div className="relative aspect-[4/3] overflow-hidden rounded-[1px] border border-[#3E3E75]/15 bg-[#EDE6D6] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] dark:border-[#C4C4E8]/15 dark:bg-[#24243C]">
                              <Image
                                src={card.imageSrc}
                                alt={t(card.imageAltKey)}
                                fill
                                sizes="(max-width: 640px) 100vw, 180px"
                                className="object-cover"
                              />
                            </div>

                            <div className="flex min-w-0 flex-col justify-center">
                              <span className="text-[0.65rem] font-semibold tracking-[0.2em] text-[#3E3E75]/70 uppercase dark:text-[#C4C4E8]/70">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <h2 className="mt-1 text-base font-semibold tracking-tight text-balance sm:text-lg">
                                {title}
                              </h2>
                              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 text-pretty dark:text-[#E8E4FF]/75">
                                {t(card.bodyKey)}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </div>
              </article>

              {/* Right page — notes */}
              <article
                dir={dir}
                className={cn(
                  "relative min-h-full overflow-hidden px-5 py-7 sm:px-7 sm:py-8",
                  "bg-[#FFFEF7] text-slate-800",
                  "dark:bg-[#2F2F4A] dark:text-[#F4F2FF]",
                  "shadow-[inset_28px_0_40px_-28px_rgba(62,62,117,0.32),inset_-12px_0_20px_-16px_rgba(255,255,255,0.7)]",
                  "dark:shadow-[inset_28px_0_40px_-28px_rgba(0,0,0,0.5),inset_-12px_0_20px_-16px_rgba(255,255,255,0.05)]"
                )}
              >
                {/* Right outer page edges */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 z-20 hidden w-[7px] lg:block"
                  style={{
                    background:
                      "linear-gradient(270deg, #D9D0BA 0%, #F7F1E4 55%, #FFFDF8 100%)",
                    boxShadow:
                      "inset 1px 0 0 rgba(62,62,117,0.12), -1px 0 0 rgba(255,255,255,0.5)",
                  }}
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-[3px] z-20 hidden w-px bg-[#3E3E75]/10 lg:block"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-[5px] z-20 hidden w-px bg-[#3E3E75]/08 lg:block"
                />

                <div
                  aria-hidden="true"
                  className="absolute top-[-0.7rem] left-1/2 z-20 h-5 w-24 -translate-x-1/2 rotate-[-2deg] rounded-[2px] bg-[#3E3E75]/55 shadow-sm backdrop-blur-[1px] dark:bg-[#9A9AD0]/50"
                />

                <PaperLines offset="2.75rem" />
                <PaperMarginRule />

                <div className="relative z-10 ps-3 sm:ps-5">
                  <p className="text-[0.7rem] font-semibold tracking-[0.18em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
                    {t("careers.roadmap.note.label")}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                    {t("careers.roadmap.note.title")}
                  </h2>
                  <p className="mt-4 text-sm leading-relaxed text-pretty sm:text-[0.95rem]">
                    {t("careers.roadmap.note.intro")}
                  </p>

                  <p className="mt-5 text-xs font-semibold tracking-[0.16em] text-[#3E3E75]/80 uppercase dark:text-[#C4C4E8]/80">
                    {t("careers.roadmap.note.journeyLabel")}
                  </p>

                  <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                    {ROADMAP_NOTE_POINTS.map((pointKey, index) => (
                      <li
                        key={pointKey}
                        className={cn(
                          "rounded-[2px] px-3 py-2.5 text-sm leading-relaxed text-pretty",
                          STICKY_NOTE_STYLES[index]
                        )}
                      >
                        {t(pointKey)}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div
          id="roadmap-stages"
          className="mx-auto mt-14 max-w-5xl scroll-mt-28 sm:mt-16"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">
              {t("careers.roadmap.chain.title")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
              {t("careers.roadmap.chain.lead")}
            </p>
          </div>

          <nav
            aria-label={t("careers.roadmap.stagesLabel")}
            className="mt-8 sm:mt-10"
          >
          <ol className="flex flex-col gap-0 sm:flex-row sm:items-start sm:justify-between sm:gap-0">
            {CAREERS_ROADMAP_STAGES.map((stage, index) => {
              const isLast = index === CAREERS_ROADMAP_STAGES.length - 1;
              const title = t(stage.titleKey);

              return (
                <li
                  key={stage.id}
                  className="relative flex flex-1 flex-row items-start gap-4 sm:flex-col sm:items-center sm:gap-3"
                >
                  {!isLast ? (
                    <span
                      aria-hidden="true"
                      className="absolute start-[1.15rem] top-10 bottom-0 w-px bg-[#3E3E75]/25 sm:top-5 sm:bottom-auto sm:start-[calc(50%+1.35rem)] sm:h-px sm:w-[calc(100%-2.7rem)] dark:bg-[#C4C4E8]/25"
                    />
                  ) : null}

                  <Link
                    href={getCareersRoadmapDetailRoute(stage.id)}
                    suppressHydrationWarning
                    className={cn(
                      "relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-[#3E3E75] bg-background text-sm font-semibold text-[#3E3E75] shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-[#3E3E75] hover:text-white",
                      "dark:border-[#C4C4E8] dark:text-[#C4C4E8] dark:hover:bg-[#C4C4E8] dark:hover:text-[#2A2A52]",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3E3E75]/35",
                      "sm:size-11",
                      isLast
                        ? "border-dashed border-[#3E3E75]/70 dark:border-[#C4C4E8]/70"
                        : null
                    )}
                    aria-label={`${t(stage.shortLabelKey)}: ${title}`}
                  >
                    {stage.index}
                  </Link>

                  <div className="min-w-0 flex-1 pb-8 sm:flex sm:flex-col sm:items-center sm:pb-0 sm:text-center">
                    <p className="text-[0.65rem] font-semibold tracking-[0.16em] text-[#3E3E75]/70 uppercase dark:text-[#C4C4E8]/70">
                      {t(stage.shortLabelKey)}
                    </p>
                    <Link
                      href={getCareersRoadmapDetailRoute(stage.id)}
                      suppressHydrationWarning
                      className="mt-1 block text-sm font-semibold tracking-tight text-balance text-foreground transition-colors hover:text-[#3E3E75] dark:hover:text-[#C4C4E8]"
                    >
                      {title}
                    </Link>
                  </div>
                </li>
              );
            })}
          </ol>
          </nav>
        </div>
      </div>
    </section>
  );
}
