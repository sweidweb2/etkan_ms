"use client";

import { motion, useReducedMotion } from "motion/react";
import { useHydrated } from "@/hooks/use-hydrated";
import type { MessageKey } from "@/lib/i18n/messages";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

type FloatChip = {
  kind: "course" | "skill";
  labelKey: MessageKey;
  /** Irregular left/top % — scattered, not along a ring. */
  left: number;
  top: number;
  hideBelow?: "sm" | "md" | "lg";
  delay: number;
  duration: number;
  driftY: number;
  driftX: number;
};

/** Course chips + skills derived from those courses, placed at irregular spots. */
const FLOAT_CHIPS: FloatChip[] = [
  // Courses
  { kind: "course", labelKey: "careerStages.stage1.course1.title", left: 6, top: 14, delay: 0.08, duration: 5.4, driftY: 9, driftX: 5 },
  { kind: "course", labelKey: "careerStages.stage1.course2.title", left: 72, top: 11, hideBelow: "sm", delay: 0.22, duration: 6.2, driftY: 11, driftX: -4 },
  { kind: "course", labelKey: "careerStages.stage2.course1.title", left: 3, top: 48, delay: 0.14, duration: 5.8, driftY: 8, driftX: 6 },
  { kind: "course", labelKey: "careerStages.stage3.course3.title", left: 78, top: 38, hideBelow: "sm", delay: 0.18, duration: 6.6, driftY: 12, driftX: -5 },
  { kind: "course", labelKey: "careerStages.stage3.course1.title", left: 18, top: 78, hideBelow: "sm", delay: 0.4, duration: 5.5, driftY: 7, driftX: 4 },
  { kind: "course", labelKey: "careerStages.stage5.course6.title", left: 58, top: 8, hideBelow: "md", delay: 0.32, duration: 7.1, driftY: 10, driftX: -6 },
  { kind: "course", labelKey: "careerStages.stage5.course3.title", left: 86, top: 62, hideBelow: "md", delay: 0.26, duration: 6.0, driftY: 9, driftX: 3 },
  { kind: "course", labelKey: "careerStages.stage2.course3.title", left: 42, top: 84, hideBelow: "lg", delay: 0.48, duration: 5.9, driftY: 8, driftX: -4 },

  // Skills tied to courses
  { kind: "skill", labelKey: "about.hero.skill.programming", left: 28, top: 9, hideBelow: "sm", delay: 0.12, duration: 5.7, driftY: 10, driftX: 4 },
  { kind: "skill", labelKey: "about.hero.skill.embedded", left: 88, top: 18, hideBelow: "md", delay: 0.3, duration: 6.3, driftY: 8, driftX: -5 },
  { kind: "skill", labelKey: "about.hero.skill.dataLiteracy", left: 11, top: 32, hideBelow: "sm", delay: 0.36, duration: 5.2, driftY: 11, driftX: 5 },
  { kind: "skill", labelKey: "about.hero.skill.cad", left: 68, top: 22, hideBelow: "md", delay: 0.2, duration: 6.8, driftY: 9, driftX: -3 },
  { kind: "skill", labelKey: "about.hero.skill.circuitDesign", left: 2, top: 68, hideBelow: "sm", delay: 0.44, duration: 5.6, driftY: 7, driftX: 6 },
  { kind: "skill", labelKey: "about.hero.skill.machining", left: 51, top: 72, hideBelow: "md", delay: 0.28, duration: 6.4, driftY: 12, driftX: -4 },
  { kind: "skill", labelKey: "about.hero.skill.uiDev", left: 34, top: 18, hideBelow: "lg", delay: 0.16, duration: 5.9, driftY: 8, driftX: 3 },
  { kind: "skill", labelKey: "about.hero.skill.appDev", left: 91, top: 46, hideBelow: "md", delay: 0.38, duration: 6.1, driftY: 10, driftX: -6 },
  { kind: "skill", labelKey: "about.hero.skill.apiDesign", left: 4, top: 58, hideBelow: "lg", delay: 0.24, duration: 7.0, driftY: 9, driftX: 5 },
  { kind: "skill", labelKey: "about.hero.skill.projectPlanning", left: 82, top: 54, hideBelow: "sm", delay: 0.42, duration: 5.4, driftY: 11, driftX: -3 },
  { kind: "skill", labelKey: "about.hero.skill.productThinking", left: 8, top: 84, hideBelow: "md", delay: 0.5, duration: 6.5, driftY: 8, driftX: 4 },
  { kind: "skill", labelKey: "about.hero.skill.assembly", left: 81, top: 78, hideBelow: "lg", delay: 0.34, duration: 5.8, driftY: 10, driftX: -5 },
  { kind: "skill", labelKey: "about.hero.skill.electronics", left: 46, top: 4, hideBelow: "sm", delay: 0.1, duration: 6.7, driftY: 7, driftX: 6 },
  { kind: "skill", labelKey: "about.hero.skill.logicDesign", left: 15, top: 22, hideBelow: "lg", delay: 0.46, duration: 5.3, driftY: 12, driftX: -4 },
  { kind: "skill", labelKey: "about.hero.skill.firmware", left: 84, top: 72, hideBelow: "lg", delay: 0.52, duration: 6.9, driftY: 9, driftX: 3 },
  { kind: "skill", labelKey: "about.hero.skill.sensors", left: 32, top: 74, hideBelow: "md", delay: 0.19, duration: 5.5, driftY: 8, driftX: -6 },
  { kind: "skill", labelKey: "about.hero.skill.schematic", left: 88, top: 28, hideBelow: "lg", delay: 0.55, duration: 6.2, driftY: 11, driftX: 4 },
  { kind: "skill", labelKey: "about.hero.skill.pcbLayout", left: 27, top: 88, hideBelow: "md", delay: 0.33, duration: 5.7, driftY: 7, driftX: -3 },
  { kind: "skill", labelKey: "about.hero.skill.moldMaking", left: 62, top: 88, hideBelow: "lg", delay: 0.41, duration: 6.0, driftY: 10, driftX: 5 },
  { kind: "skill", labelKey: "about.hero.skill.sheetMetal", left: 74, top: 70, hideBelow: "md", delay: 0.27, duration: 7.2, driftY: 9, driftX: -4 },
];

const HIDE_BELOW_CLASS: Record<NonNullable<FloatChip["hideBelow"]>, string> = {
  sm: "max-sm:hidden",
  md: "max-md:hidden",
  lg: "max-lg:hidden",
};

type BgShape = {
  id: string;
  className: string;
  kind: "circle" | "ring" | "square" | "diamond" | "pill" | "dot" | "line";
  duration: number;
  delay: number;
  drift: number;
};

const BG_SHAPES: BgShape[] = [
  { id: "c1", kind: "circle", className: "start-[6%] top-[10%] size-3 bg-[#9A9AD0]/35", duration: 7, delay: 0, drift: 14 },
  { id: "c2", kind: "circle", className: "end-[12%] top-[14%] size-2 bg-[#C4C4E8]/30", duration: 5.5, delay: 0.4, drift: 10 },
  { id: "c3", kind: "circle", className: "start-[18%] top-[28%] size-1.5 bg-white/25", duration: 6.2, delay: 0.8, drift: 8 },
  { id: "c4", kind: "circle", className: "end-[22%] top-[32%] size-2.5 bg-[#7B7BB8]/25", duration: 7.4, delay: 0.2, drift: 12 },
  { id: "c5", kind: "circle", className: "start-[40%] top-[8%] size-2 bg-[#C4C4E8]/20", duration: 5.8, delay: 1.1, drift: 9 },
  { id: "c6", kind: "circle", className: "end-[38%] top-[18%] size-1 bg-white/30", duration: 4.8, delay: 0.6, drift: 7 },
  { id: "c7", kind: "circle", className: "start-[8%] bottom-[18%] size-2 bg-[#9A9AD0]/25", duration: 6.6, delay: 0.3, drift: 11 },
  { id: "c8", kind: "circle", className: "end-[8%] bottom-[22%] size-3 bg-[#C4C4E8]/15", duration: 7.2, delay: 0.9, drift: 13 },
  { id: "c9", kind: "circle", className: "start-[48%] bottom-[12%] size-1.5 bg-white/20", duration: 5.2, delay: 1.4, drift: 8 },
  { id: "c10", kind: "circle", className: "end-[48%] top-[42%] size-2 bg-[#9A9AD0]/20", duration: 6, delay: 0.5, drift: 10 },
  { id: "r1", kind: "ring", className: "start-[14%] top-[55%] size-16 border border-[#9A9AD0]/25", duration: 9, delay: 0.2, drift: 16 },
  { id: "r2", kind: "ring", className: "end-[16%] top-[58%] size-12 border border-white/10", duration: 8.2, delay: 0.7, drift: 14 },
  { id: "r3", kind: "ring", className: "start-[52%] top-[16%] size-20 border border-[#C4C4E8]/20", duration: 10, delay: 0.1, drift: 18 },
  { id: "r4", kind: "ring", className: "end-[50%] bottom-[20%] size-10 border border-[#7B7BB8]/25", duration: 7.6, delay: 1.2, drift: 12 },
  { id: "s1", kind: "square", className: "start-[26%] top-[20%] size-4 rotate-12 border border-[#9A9AD0]/30", duration: 6.8, delay: 0.4, drift: 11 },
  { id: "s2", kind: "square", className: "end-[28%] top-[26%] size-3 -rotate-6 border border-white/15", duration: 5.9, delay: 0.9, drift: 9 },
  { id: "s3", kind: "square", className: "start-[62%] bottom-[28%] size-5 rotate-[18deg] border border-[#C4C4E8]/20", duration: 7.8, delay: 0.3, drift: 13 },
  { id: "s4", kind: "square", className: "end-[62%] top-[62%] size-3.5 -rotate-12 bg-[#7B7BB8]/15", duration: 6.3, delay: 1, drift: 10 },
  { id: "d1", kind: "diamond", className: "start-[34%] bottom-[34%] size-3 rotate-45 border border-[#9A9AD0]/35", duration: 6.5, delay: 0.6, drift: 10 },
  { id: "d2", kind: "diamond", className: "end-[34%] top-[48%] size-2.5 rotate-45 bg-[#C4C4E8]/20", duration: 5.4, delay: 1.3, drift: 8 },
  { id: "d3", kind: "diamond", className: "start-[72%] top-[36%] size-4 rotate-45 border border-white/12", duration: 7.1, delay: 0.2, drift: 12 },
  { id: "d4", kind: "diamond", className: "end-[72%] bottom-[40%] size-2 rotate-45 bg-white/15", duration: 4.9, delay: 0.8, drift: 7 },
  { id: "p1", kind: "pill", className: "start-[44%] top-[68%] h-2 w-8 rounded-full bg-[#9A9AD0]/25", duration: 6.7, delay: 0.5, drift: 9 },
  { id: "p2", kind: "pill", className: "end-[44%] top-[72%] h-1.5 w-10 rounded-full bg-white/15", duration: 5.6, delay: 1.1, drift: 8 },
  { id: "p3", kind: "pill", className: "start-[20%] top-[72%] h-2 w-6 rounded-full bg-[#C4C4E8]/25", duration: 7.3, delay: 0.15, drift: 11 },
  { id: "dot1", kind: "dot", className: "start-[30%] top-[38%] size-1 rounded-full bg-[#C4C4E8]/40", duration: 4.5, delay: 0.2, drift: 6 },
  { id: "dot2", kind: "dot", className: "end-[30%] top-[44%] size-1 rounded-full bg-[#9A9AD0]/40", duration: 5, delay: 0.7, drift: 7 },
  { id: "dot3", kind: "dot", className: "start-[58%] bottom-[36%] size-1.5 rounded-full bg-white/25", duration: 4.7, delay: 1, drift: 6 },
  { id: "dot4", kind: "dot", className: "end-[58%] bottom-[44%] size-1 rounded-full bg-[#C4C4E8]/30", duration: 5.3, delay: 0.35, drift: 7 },
  { id: "dot5", kind: "dot", className: "start-[78%] top-[24%] size-1 rounded-full bg-white/20", duration: 4.2, delay: 0.9, drift: 5 },
  { id: "dot6", kind: "dot", className: "end-[78%] bottom-[30%] size-1 rounded-full bg-[#9A9AD0]/30", duration: 4.8, delay: 1.5, drift: 6 },
  { id: "l1", kind: "line", className: "start-[10%] top-[36%] h-px w-16 bg-gradient-to-r from-transparent via-[#9A9AD0]/35 to-transparent", duration: 8, delay: 0.4, drift: 10 },
  { id: "l2", kind: "line", className: "end-[10%] top-[50%] h-px w-20 bg-gradient-to-l from-transparent via-white/20 to-transparent", duration: 7.5, delay: 0.8, drift: 9 },
  { id: "l3", kind: "line", className: "start-[36%] bottom-[22%] h-px w-14 rotate-12 bg-gradient-to-r from-transparent via-[#C4C4E8]/30 to-transparent", duration: 6.9, delay: 0.25, drift: 8 },
];

function shapeRadius(kind: BgShape["kind"]) {
  if (kind === "circle" || kind === "ring" || kind === "dot" || kind === "pill") {
    return "rounded-full";
  }
  return "rounded-sm";
}

export function AboutHero() {
  const { t } = usePublicI18n();
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;

  return (
    <section
      className="relative isolate flex min-h-[min(100dvh,54rem)] items-center overflow-hidden bg-[#3E3E75] text-white"
      aria-labelledby="about-hero-title"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(154,154,208,0.22),transparent_55%),linear-gradient(180deg,#343463,#3E3E75_45%,#2F2F5A)]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(196,196,232,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(196,196,232,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(rgba(154,154,208,0.28) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage:
            "radial-gradient(ellipse at 30% 20%, black 10%, transparent 55%), radial-gradient(ellipse at 70% 80%, black 8%, transparent 50%)",
        }}
      />

      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {BG_SHAPES.map((shape) => (
          <motion.span
            key={shape.id}
            className={cn(
              "absolute",
              shapeRadius(shape.kind),
              shape.className
            )}
            initial={canAnimate ? { opacity: 0, scale: 0.85 } : false}
            animate={
              canAnimate
                ? {
                    opacity: 1,
                    scale: 1,
                    y: [0, -shape.drift, 0, shape.drift * 0.6, 0],
                    x: [0, shape.drift * 0.35, 0, -shape.drift * 0.25, 0],
                  }
                : { opacity: 1 }
            }
            transition={{
              opacity: { duration: 0.9, ease: EASE, delay: shape.delay * 0.15 },
              scale: { duration: 0.9, ease: EASE, delay: shape.delay * 0.15 },
              y: {
                duration: shape.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: shape.delay,
              },
              x: {
                duration: shape.duration * 1.15,
                repeat: Infinity,
                ease: "easeInOut",
                delay: shape.delay + 0.2,
              },
            }}
          />
        ))}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        {FLOAT_CHIPS.map((chip) => (
          <motion.div
            key={`${chip.kind}-${chip.labelKey}`}
            className={cn(
              "absolute z-[1]",
              chip.hideBelow && HIDE_BELOW_CLASS[chip.hideBelow]
            )}
            style={{ left: `${chip.left}%`, top: `${chip.top}%` }}
            initial={canAnimate ? { opacity: 0, y: 16 } : false}
            animate={
              canAnimate
                ? {
                    opacity: 1,
                    y: [0, -chip.driftY, 0, chip.driftY * 0.45, 0],
                    x: [0, chip.driftX, 0, -chip.driftX * 0.6, 0],
                  }
                : { opacity: 1 }
            }
            transition={{
              opacity: { duration: 0.8, ease: EASE, delay: chip.delay },
              y: {
                duration: chip.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: chip.delay + 0.4,
              },
              x: {
                duration: chip.duration * 1.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: chip.delay + 0.55,
              },
            }}
          >
            <div
              className={cn(
                "border px-3 py-1.5 text-xs shadow-[0_12px_40px_-20px_rgba(0,0,0,0.8)] backdrop-blur-md sm:px-3.5 sm:py-2 sm:text-sm",
                chip.kind === "course"
                  ? "border-white/20 bg-[#2F2F5A]/75 text-[#C4C4E8]"
                  : "border-white/15 bg-[#343463]/70 text-white/85"
              )}
            >
              <span
                className={cn(
                  "me-2 text-[0.65rem] font-semibold tracking-[0.16em] uppercase",
                  chip.kind === "course" ? "text-[#9A9AD0]" : "text-white/50"
                )}
              >
                {t(chip.kind === "course" ? "about.hero.chip.course" : "about.hero.chip.skill")}
              </span>
              <span className="font-medium">{t(chip.labelKey)}</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-4 py-28 text-center sm:px-6 sm:py-32">
        <motion.p
          className="text-sm font-semibold tracking-[0.22em] text-white/55 uppercase"
          initial={canAnimate ? { opacity: 0, y: 18 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE }}
        >
          {t("about.hero.eyebrow")}
        </motion.p>

        <motion.h1
          id="about-hero-title"
          className="mt-6 text-4xl font-semibold tracking-tight text-balance text-white sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]"
          initial={canAnimate ? { opacity: 0, y: 22 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.08 }}
        >
          {t("about.hero.title")}
        </motion.h1>

        <motion.p
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-pretty text-white/75 sm:text-lg"
          initial={canAnimate ? { opacity: 0, y: 22 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE, delay: 0.16 }}
        >
          {t("about.hero.lead")}
        </motion.p>
      </div>
    </section>
  );
}
