"use client";

import Link from "next/link";
import { useState } from "react";
import { Lightfall } from "@/components/public/lightfall";
import { useHydrated } from "@/hooks/use-hydrated";
import { useNavbarDashboardHref } from "@/hooks/use-navbar-dashboard-href";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type HomeHeroCopy = {
  brandName: string;
  title: string;
  subtitle: string;
  ctaLogin: string;
  ctaRegister: string;
  ctaDashboard: string;
};

type HomeHeroProps = {
  initialDashboardHref: string | null;
  copy: HomeHeroCopy;
};

const primaryCtaClassName = cn(
  "inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-transparent px-4 text-sm font-medium",
  "bg-white text-[#0A29FF] transition-colors hover:bg-white/90"
);

const secondaryCtaClassName = cn(
  "inline-flex h-10 shrink-0 items-center justify-center rounded-lg border px-4 text-sm font-medium",
  "border-white/40 bg-white/10 text-white backdrop-blur-sm transition-colors",
  "hover:bg-white/20 hover:text-white"
);

function HeroBackgroundSkeleton() {
  return (
    <div
      className="absolute inset-0 overflow-hidden bg-[#0A29FF]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 animate-pulse bg-[radial-gradient(ellipse_at_top,_#5B7CFF_0%,_#0A29FF_55%,_#0718A8_100%)]" />
      <div className="absolute inset-x-[8%] top-[12%] h-24 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute inset-x-[20%] top-[28%] h-40 rounded-full bg-[#A6C8FF]/20 blur-3xl" />
      <div className="absolute start-[12%] top-[42%] h-3 w-28 animate-pulse rounded-full bg-white/20" />
      <div className="absolute start-[18%] top-[52%] h-3 w-44 animate-pulse rounded-full bg-white/15 [animation-delay:120ms]" />
      <div className="absolute start-[15%] top-[62%] h-3 w-36 animate-pulse rounded-full bg-white/10 [animation-delay:240ms]" />
      <div className="absolute end-[16%] top-[36%] size-24 animate-pulse rounded-full bg-[#FF9FFC]/15 blur-2xl" />
      <div className="absolute end-[22%] top-[58%] h-20 w-32 animate-pulse rounded-2xl bg-white/10 [animation-delay:180ms]" />
    </div>
  );
}

export function HomeHero({ initialDashboardHref, copy }: HomeHeroProps) {
  const mounted = useHydrated();
  const dashboardHref = useNavbarDashboardHref(initialDashboardHref);
  const [isBgReady, setIsBgReady] = useState(false);

  return (
    <section className="relative flex min-h-[min(78dvh,42rem)] overflow-hidden bg-[#0A29FF]">
      <div className="absolute inset-0 z-0">
        {!isBgReady ? <HeroBackgroundSkeleton /> : null}
        {mounted ? (
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              isBgReady ? "opacity-100" : "opacity-0"
            )}
          >
            <Lightfall
              colors={["#A6C8FF", "#5227FF", "#FF9FFC"]}
              backgroundColor="#0A29FF"
              speed={0.5}
              streakCount={2}
              streakWidth={1}
              streakLength={1}
              glow={1}
              density={0.6}
              twinkle={1}
              zoom={3}
              backgroundGlow={0.5}
              opacity={1}
              mouseInteraction
              mouseStrength={0.5}
              mouseRadius={1}
              color1="#A6C8FF"
              color2="#5227FF"
              color3="#FF9FFC"
              onReady={() => setIsBgReady(true)}
            />
          </div>
        ) : null}
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-12 sm:py-16">
        <p
          className="text-sm font-semibold tracking-[0.18em] text-sky-100/90 uppercase"
          suppressHydrationWarning
        >
          {copy.brandName}
        </p>
        <h1
          className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-6xl"
          suppressHydrationWarning
        >
          {copy.title}
        </h1>
        <p
          className="mt-4 max-w-2xl text-base text-sky-100/85 text-pretty sm:text-lg"
          suppressHydrationWarning
        >
          {copy.subtitle}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {dashboardHref ? (
            <Link
              href={dashboardHref}
              className={primaryCtaClassName}
              suppressHydrationWarning
            >
              {copy.ctaDashboard}
            </Link>
          ) : (
            <>
              <Link
                href={ROUTES.LOGIN}
                className={primaryCtaClassName}
                suppressHydrationWarning
              >
                {copy.ctaLogin}
              </Link>
              <Link
                href={ROUTES.SIGNUP}
                className={secondaryCtaClassName}
                suppressHydrationWarning
              >
                {copy.ctaRegister}
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
