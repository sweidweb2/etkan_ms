"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/components/animate-ui/primitives/animate/tabs";
import { CAREERS_ROADMAP_CARDS } from "@/lib/constants/careers-roadmaps";
import { getCareersRoadmapDetailRoute } from "@/lib/constants/routes";
import type { MessageKey } from "@/lib/i18n/messages";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

type CareersTab = "roadmap" | "workshops" | "online";

type WorkshopCard = {
  id: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  badgeKey: MessageKey;
  imageSrc: string;
};

type OnlineCard = {
  id: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  format: "oneOnOne" | "public";
  imageSrc: string;
};
const WORKSHOP_CARDS: WorkshopCard[] = [
  {
    id: "arduino-1",
    titleKey: "careers.workshop.arduino1.title",
    bodyKey: "careers.workshop.arduino1.body",
    badgeKey: "careers.workshop.badge.level1",
    imageSrc:
      "https://images.unsplash.com/photo-1553406830-ef2513450d76?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "arduino-2",
    titleKey: "careers.workshop.arduino2.title",
    bodyKey: "careers.workshop.arduino2.body",
    badgeKey: "careers.workshop.badge.level2",
    imageSrc:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "web",
    titleKey: "careers.workshop.web.title",
    bodyKey: "careers.workshop.web.body",
    badgeKey: "careers.workshop.badge.workshop",
    imageSrc:
      "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "solidworks",
    titleKey: "careers.workshop.solidworks.title",
    bodyKey: "careers.workshop.solidworks.body",
    badgeKey: "careers.workshop.badge.workshop",
    imageSrc:
      "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?q=80&w=800&auto=format&fit=crop",
  },
  {
    id: "printing",
    titleKey: "careers.workshop.printing.title",
    bodyKey: "careers.workshop.printing.body",
    badgeKey: "careers.workshop.badge.workshop",
    imageSrc:
      "https://images.unsplash.com/photo-1704283860614-803aa8be7993?q=80&w=800&auto=format&fit=crop",
  },
];

const ONLINE_CARDS: OnlineCard[] = [
  {
    id: "arduino",
    titleKey: "careers.online.arduino.title",
    bodyKey: "careers.online.arduino.body",
    format: "oneOnOne",
    imageSrc:
      "https://images.unsplash.com/photo-1553406830-ef2513450d76?q=80&w=700&auto=format&fit=crop",
  },
  {
    id: "python",
    titleKey: "careers.online.python.title",
    bodyKey: "careers.online.python.body",
    format: "oneOnOne",
    imageSrc:
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=700&auto=format&fit=crop",
  },
  {
    id: "java",
    titleKey: "careers.online.java.title",
    bodyKey: "careers.online.java.body",
    format: "oneOnOne",
    imageSrc:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=700&auto=format&fit=crop",
  },
  {
    id: "web",
    titleKey: "careers.online.web.title",
    bodyKey: "careers.online.web.body",
    format: "public",
    imageSrc:
      "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?q=80&w=700&auto=format&fit=crop",
  },
  {
    id: "mobile",
    titleKey: "careers.online.mobile.title",
    bodyKey: "careers.online.mobile.body",
    format: "oneOnOne",
    imageSrc:
      "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=700&auto=format&fit=crop",
  },
  {
    id: "modeling",
    titleKey: "careers.online.modeling.title",
    bodyKey: "careers.online.modeling.body",
    format: "public",
    imageSrc:
      "https://images.unsplash.com/photo-1612222867048-0d0bfd5664a4?q=80&w=700&auto=format&fit=crop",
  },
  {
    id: "electronics",
    titleKey: "careers.online.electronics.title",
    bodyKey: "careers.online.electronics.body",
    format: "oneOnOne",
    imageSrc:
      "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=700&auto=format&fit=crop",
  },
  {
    id: "machining",
    titleKey: "careers.online.machining.title",
    bodyKey: "careers.online.machining.body",
    format: "public",
    imageSrc:
      "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=700&auto=format&fit=crop",
  },
];

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

const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 sm:px-5",
  "text-muted-foreground hover:text-foreground",
  "data-[state=active]:bg-[#3E3E75] data-[state=active]:text-white data-[state=active]:shadow-md",
  "dark:data-[state=active]:bg-[#C4C4E8] dark:data-[state=active]:text-[#2A2A52]",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3E3E75]/35"
);

export function CareersSection() {
  const { t } = usePublicI18n();
  const [tab, setTab] = useState<CareersTab>("roadmap");

  return (
    <section className="relative isolate overflow-hidden px-4 pt-20 pb-16 sm:px-6 sm:pt-24 sm:pb-20">
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

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as CareersTab)}
          className="mt-10 flex flex-col gap-8 sm:mt-12"
        >
          <div className="flex justify-center">
            <TabsList
              aria-label={t("careers.tabsLabel")}
              className="inline-flex h-auto w-full max-w-xl flex-wrap justify-center gap-1 rounded-full bg-muted/70 p-1.5 ring-1 ring-[#3E3E75]/10 sm:w-auto sm:flex-nowrap dark:ring-[#C4C4E8]/15"
            >
              <TabsTrigger value="roadmap" className={TAB_TRIGGER_CLASS}>
                {t("careers.tab.roadmap")}
              </TabsTrigger>
              <TabsTrigger value="workshops" className={TAB_TRIGGER_CLASS}>
                {t("careers.tab.workshops")}
              </TabsTrigger>
              <TabsTrigger value="online" className={TAB_TRIGGER_CLASS}>
                {t("careers.tab.online")}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContents
            transition={{
              type: "spring",
              stiffness: 260,
              damping: 32,
              bounce: 0,
            }}
          >
            <TabsContent value="roadmap" className="outline-none">
              <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
                <div className="flex flex-col gap-5 sm:gap-6">
                  {CAREERS_ROADMAP_CARDS.map((card) => (
                    <Link
                      key={card.id}
                      href={getCareersRoadmapDetailRoute(card.id)}
                      className="group overflow-hidden rounded-2xl border border-[#3E3E75]/15 bg-background/90 shadow-[0_20px_50px_-36px_rgba(62,62,117,0.45)] transition-transform duration-300 hover:-translate-y-0.5 dark:border-[#C4C4E8]/15"
                    >
                      <article className="grid sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
                        <div className="relative aspect-[16/11] sm:aspect-auto sm:min-h-[10.5rem]">
                          <Image
                            src={card.imageSrc}
                            alt={t(card.imageAltKey)}
                            fill
                            sizes="(max-width: 640px) 100vw, 220px"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                        <div className="flex flex-col justify-center p-4 sm:p-5 lg:p-6">
                          <h2 className="text-lg font-semibold tracking-tight text-balance sm:text-xl">
                            {t(card.titleKey)}
                          </h2>
                          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
                            {t(card.bodyKey)}
                          </p>
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>

                <div className="relative w-full lg:sticky lg:top-24">
                  <div
                    aria-hidden="true"
                    className="absolute top-[-0.7rem] left-1/2 z-20 h-5 w-24 -translate-x-1/2 rotate-[-2deg] rounded-[2px] bg-[#3E3E75]/55 shadow-sm backdrop-blur-[1px] dark:bg-[#9A9AD0]/50"
                  />

                  <article
                    className={cn(
                      "relative overflow-hidden rounded-[2px] px-5 py-7 sm:px-7 sm:py-8",
                      "rotate-[-0.7deg] border border-[#3E3E75]/12 bg-[#FFFEF7] text-slate-800",
                      "shadow-[0_18px_40px_-24px_rgba(62,62,117,0.35),0_1px_0_rgba(62,62,117,0.08)]",
                      "dark:border-[#C4C4E8]/15 dark:bg-[#2F2F4A] dark:text-[#F4F2FF]"
                    )}
                  >
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 opacity-70"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(transparent, transparent 27px, rgba(62,62,117,0.08) 28px)",
                        backgroundPosition: "0 2.75rem",
                      }}
                    />
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 start-8 w-px bg-[#F5B7B1]/70 sm:start-10 dark:bg-[#9A9AD0]/25"
                    />

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

                      <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
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

                      <p className="mt-6 border-t border-[#3E3E75]/15 pt-4 text-sm leading-relaxed text-pretty sm:text-[0.95rem] dark:border-[#C4C4E8]/15">
                        {t("careers.roadmap.note.closing")}
                      </p>
                    </div>
                  </article>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="workshops" className="outline-none">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {WORKSHOP_CARDS.map((card) => (
                  <article
                    key={card.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[#3E3E75]/15 bg-background shadow-[0_18px_44px_-34px_rgba(62,62,117,0.5)] transition-transform duration-300 hover:-translate-y-1 dark:border-[#C4C4E8]/15"
                  >
                    <div className="relative aspect-[16/11] overflow-hidden">
                      <Image
                        src={card.imageSrc}
                        alt={t(card.titleKey)}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      <span className="absolute top-3 start-3 rounded-full bg-[#3E3E75] px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.12em] text-white uppercase">
                        {t(card.badgeKey)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h2 className="text-lg font-semibold tracking-tight">
                        {t(card.titleKey)}
                      </h2>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                        {t(card.bodyKey)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="online" className="outline-none">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {ONLINE_CARDS.map((card) => (
                  <article
                    key={card.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[#3E3E75]/12 bg-background/95 shadow-[0_16px_40px_-32px_rgba(62,62,117,0.45)] transition-transform duration-300 hover:-translate-y-1 dark:border-[#C4C4E8]/12"
                  >
                    <div className="relative aspect-[5/3] overflow-hidden">
                      <Image
                        src={card.imageSrc}
                        alt={t(card.titleKey)}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                      {card.format === "oneOnOne" ? (
                        <span className="absolute top-3 start-3 rounded-full bg-[#3E3E75] px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-white uppercase shadow-sm">
                          {t("careers.online.discountBadge")}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-1 flex-col p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "w-fit rounded-full px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.14em] uppercase",
                            card.format === "oneOnOne"
                              ? "bg-[#3E3E75]/12 text-[#3E3E75] dark:bg-[#C4C4E8]/15 dark:text-[#C4C4E8]"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {t(
                            card.format === "oneOnOne"
                              ? "careers.online.format.oneOnOne"
                              : "careers.online.format.public"
                          )}
                        </span>
                        {card.format === "oneOnOne" ? (
                          <span className="inline-flex items-baseline gap-1.5 tabular-nums">
                            <span className="text-xs text-muted-foreground line-through">
                              {t("careers.online.price.oneOnOneWas")}
                            </span>
                            <span className="text-sm font-semibold text-[#3E3E75] dark:text-[#C4C4E8]">
                              {t("careers.online.price.oneOnOne")}
                            </span>
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-2.5 text-base font-semibold tracking-tight">
                        {t(card.titleKey)}
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
                        {t(card.bodyKey)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </TabsContent>
          </TabsContents>
        </Tabs>
      </div>
    </section>
  );
}
