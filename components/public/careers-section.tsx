"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsContents,
  TabsList,
  TabsTrigger,
} from "@/components/animate-ui/primitives/animate/tabs";
import {
  CareersAddToCartButton,
  CareersCartDock,
} from "@/components/public/careers-cart";
import {
  isCareersTabId,
  type CareersTabId,
} from "@/lib/constants/about-services";
import { CAREERS_ROADMAP_CARDS } from "@/lib/constants/careers-roadmaps";
import { getCareersRoadmapDetailRoute } from "@/lib/constants/routes";
import type { MessageKey } from "@/lib/i18n/messages";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

type CareersTab = CareersTabId;

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

/** Stable strings — avoid cn() on anchors (SSR/client class order mismatches). */
const WORKSHOP_CARD_CLASS =
  "group relative flex flex-col overflow-hidden rounded-2xl border border-[#3E3E75]/15 bg-background shadow-[0_18px_44px_-34px_rgba(62,62,117,0.5)] transition-transform duration-300 hover:-translate-y-1 dark:border-[#C4C4E8]/15";

const ONLINE_CARD_CLASS =
  "group relative flex flex-col overflow-hidden rounded-2xl border border-[#3E3E75]/12 bg-background/95 shadow-[0_16px_40px_-32px_rgba(62,62,117,0.45)] transition-transform duration-300 hover:-translate-y-1 dark:border-[#C4C4E8]/12";

const TAB_TRIGGER_CLASS = cn(
  "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-all duration-300 sm:px-5",
  "text-muted-foreground hover:text-foreground",
  "data-[state=active]:bg-[#3E3E75] data-[state=active]:text-white data-[state=active]:shadow-md",
  "dark:data-[state=active]:bg-[#C4C4E8] dark:data-[state=active]:text-[#2A2A52]",
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[#3E3E75]/35"
);

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const tabParam = searchParams.get("tab");
  const tab: CareersTab =
    tabParam && isCareersTabId(tabParam) ? tabParam : "roadmap";

  function handleTabChange(value: string | null) {
    if (!value || !isCareersTabId(value)) {
      return;
    }
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }

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

        <Tabs
          value={tab}
          onValueChange={handleTabChange}
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
              <div className="relative mx-auto max-w-5xl">
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
                              index === 0
                                ? "rotate-[-0.8deg]"
                                : "rotate-[0.9deg]";
                            const tapeClass =
                              index === 0
                                ? "left-[22%] rotate-[-8deg] bg-[#FFF4A8]/90"
                                : "right-[18%] left-auto rotate-[7deg] bg-[#E8E4FF]/90";

                            return (
                              <Link
                                key={card.id}
                                href={getCareersRoadmapDetailRoute(card.id)}
                                suppressHydrationWarning
                                aria-label={title}
                                className={cn(
                                  "group relative block rounded-[2px] border border-[#3E3E75]/12 bg-[#FFFDF6]/95 p-3 transition-[transform,box-shadow] duration-300",
                                  "shadow-[1px_2px_0_rgba(62,62,117,0.08)] hover:-translate-y-0.5 hover:shadow-[2px_6px_0_rgba(62,62,117,0.12)]",
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
                                      className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
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
                                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-[#3E3E75] uppercase transition-colors group-hover:text-[#2A2A52] dark:text-[#C4C4E8] dark:group-hover:text-white">
                                      {t("careers.roadmap.book.openPath")}
                                      <span aria-hidden="true">→</span>
                                    </span>
                                  </div>
                                </div>
                              </Link>
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
            </TabsContent>

            <TabsContent value="workshops" className="outline-none">
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {WORKSHOP_CARDS.map((card) => (
                  <article key={card.id} className={WORKSHOP_CARD_CLASS}>
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
                    <div className="flex flex-1 flex-col p-5 pb-14">
                      <h2 className="text-lg font-semibold tracking-tight">
                        {t(card.titleKey)}
                      </h2>
                      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground text-pretty">
                        {t(card.bodyKey)}
                      </p>
                    </div>
                    <CareersAddToCartButton
                      kind="workshop"
                      courseId={card.id}
                      titleKey={card.titleKey}
                      imageSrc={card.imageSrc}
                    />
                  </article>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="online" className="outline-none">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {ONLINE_CARDS.map((card) => (
                  <article key={card.id} className={ONLINE_CARD_CLASS}>
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
                    <div className="flex flex-1 flex-col p-4 pb-14">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={
                            card.format === "oneOnOne"
                              ? "w-fit rounded-full bg-[#3E3E75]/12 px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.14em] text-[#3E3E75] uppercase dark:bg-[#C4C4E8]/15 dark:text-[#C4C4E8]"
                              : "w-fit rounded-full bg-muted px-2 py-0.5 text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
                          }
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
                    <CareersAddToCartButton
                      kind="online"
                      courseId={card.id}
                      titleKey={card.titleKey}
                      imageSrc={card.imageSrc}
                    />
                  </article>
                ))}
              </div>
            </TabsContent>
          </TabsContents>
        </Tabs>
      </div>

      <CareersCartDock />
    </section>
  );
}
