"use client";

import {
  SiAndroid,
  SiArduino,
  SiAutodesk,
  SiBlender,
  SiCss,
  SiHtml5,
  SiJavascript,
  SiOpenjdk,
  SiPython,
  SiRaspberrypi,
  SiReact,
} from "react-icons/si";
import {
  MdDeveloperBoard,
  MdPrecisionManufacturing,
  MdViewInAr,
} from "react-icons/md";
import { GiCircuitry, GiGears } from "react-icons/gi";
import LogoLoop, { type LogoLoopItem } from "@/components/LogoLoop";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";

const ICON_CLASS = "text-[#3E3E75] dark:text-[#C4C4E8]";

const COURSE_LOGOS: LogoLoopItem[] = [
  { node: <SiArduino className={ICON_CLASS} />, title: "Arduino" },
  { node: <SiPython className={ICON_CLASS} />, title: "Python" },
  { node: <SiOpenjdk className={ICON_CLASS} />, title: "Java" },
  { node: <SiHtml5 className={ICON_CLASS} />, title: "HTML" },
  { node: <SiCss className={ICON_CLASS} />, title: "CSS" },
  { node: <SiJavascript className={ICON_CLASS} />, title: "JavaScript" },
  { node: <SiReact className={ICON_CLASS} />, title: "Web development" },
  { node: <SiAndroid className={ICON_CLASS} />, title: "Mobile development" },
  { node: <SiBlender className={ICON_CLASS} />, title: "3D modeling" },
  { node: <SiAutodesk className={ICON_CLASS} />, title: "SolidWorks / CAD" },
  { node: <MdViewInAr className={ICON_CLASS} />, title: "3D printing" },
  { node: <MdDeveloperBoard className={ICON_CLASS} />, title: "Electronics & PCB" },
  { node: <GiCircuitry className={ICON_CLASS} />, title: "PCB design" },
  { node: <SiRaspberrypi className={ICON_CLASS} />, title: "Embedded systems" },
  { node: <GiGears className={ICON_CLASS} />, title: "Machining" },
  {
    node: <MdPrecisionManufacturing className={ICON_CLASS} />,
    title: "Assembly line",
  },
];

export function HomeCourseLogosSection() {
  const { t } = usePublicI18n();

  return (
    <section className="relative isolate overflow-hidden bg-[color-mix(in_oklch,var(--primary)_10%,var(--background))] px-4 py-2 sm:px-6">
      <div className="relative z-10 mx-auto max-w-6xl">
        <p className="text-center text-[0.65rem] font-semibold tracking-[0.2em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]">
          {t("courseLogos.eyebrow")}
        </p>
        <h2 className="mt-0.5 text-center text-sm font-semibold tracking-tight text-balance sm:text-base">
          {t("courseLogos.title")}
        </h2>

        <div className="relative mt-4 pt-1 h-16 overflow-hidden sm:mt-5 sm:h-[4.5rem]">
          <LogoLoop
            logos={COURSE_LOGOS}
            speed={90}
            direction="left"
            logoHeight={40}
            gap={48}
            hoverSpeed={0}
            scaleOnHover
            fadeOut
            fadeOutColor="color-mix(in oklch, var(--primary) 10%, var(--background))"
            ariaLabel={t("courseLogos.ariaLabel")}
          />
        </div>
      </div>
    </section>
  );
}
