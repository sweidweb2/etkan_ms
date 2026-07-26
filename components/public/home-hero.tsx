"use client";

import Link from "next/link";
import { Lightfall } from "@/components/public/lightfall";
import { buttonVariants } from "@/components/ui/button";
import { useNavbarDashboardHref } from "@/hooks/use-navbar-dashboard-href";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";

type HomeHeroProps = {
  initialDashboardHref: string | null;
};

export function HomeHero({ initialDashboardHref }: HomeHeroProps) {
  const { t } = usePublicI18n();
  const dashboardHref = useNavbarDashboardHref(initialDashboardHref);

  return (
    <section className="relative flex min-h-[min(78dvh,42rem)] overflow-hidden bg-[#0A29FF]">
      <div className="absolute inset-0 z-0">
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
        />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-12 sm:py-16">
        <p className="text-sm font-semibold tracking-[0.18em] text-sky-100/90 uppercase">
          {t("brand.name")}
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-6xl">
          {t("hero.title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-sky-100/85 text-pretty sm:text-lg">
          {t("hero.subtitle")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {dashboardHref ? (
            <Link
              href={dashboardHref}
              className={cn(
                buttonVariants({ size: "lg" }),
                "justify-center bg-white text-[#0A29FF] hover:bg-white/90"
              )}
            >
              {t("hero.ctaDashboard")}
            </Link>
          ) : (
            <>
              <Link
                href={ROUTES.LOGIN}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "justify-center bg-white text-[#0A29FF] hover:bg-white/90"
                )}
              >
                {t("hero.ctaLogin")}
              </Link>
              <Link
                href={ROUTES.SIGNUP}
                className={cn(
                  buttonVariants({ size: "lg", variant: "outline" }),
                  "justify-center border-white/40 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:text-white"
                )}
              >
                {t("hero.ctaRegister")}
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
