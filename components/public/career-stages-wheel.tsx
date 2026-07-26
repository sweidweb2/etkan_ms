"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export type CareerStageOption = {
  id: string;
  label: string;
  indexLabel: string;
};

type CareerStagesWheelProps = {
  stages: CareerStageOption[];
  activeId: string;
  onSelect: (id: string) => void;
  hubLabel: string;
  ariaLabel: string;
  className?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.35 } as const;

const SIZE = 320;
const CENTER = SIZE / 2;
const RING_R = 118;
const LABEL_R = 128;
const SEGMENT_INNER = 52;
const SEGMENT_OUTER = 108;

/** Stable decimals so SSR and client SVG/style attrs match. */
function round(n: number, digits = 3) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: round(cx + r * Math.cos(rad)),
    y: round(cy + r * Math.sin(rad)),
  };
}

function fmt(n: number) {
  return round(n).toFixed(3);
}

function segmentPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startDeg: number,
  endDeg: number
) {
  const startOuter = polar(cx, cy, outerR, startDeg);
  const endOuter = polar(cx, cy, outerR, endDeg);
  const startInner = polar(cx, cy, innerR, endDeg);
  const endInner = polar(cx, cy, innerR, startDeg);
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;

  return [
    `M ${fmt(startOuter.x)} ${fmt(startOuter.y)}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${fmt(endOuter.x)} ${fmt(endOuter.y)}`,
    `L ${fmt(startInner.x)} ${fmt(startInner.y)}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${fmt(endInner.x)} ${fmt(endInner.y)}`,
    "Z",
  ].join(" ");
}

export function CareerStagesWheel({
  stages,
  activeId,
  onSelect,
  hubLabel,
  ariaLabel,
  className,
}: CareerStagesWheelProps) {
  const reduceMotion = useReducedMotion();
  const count = stages.length;
  const slice = round(360 / count, 6);
  const gap = 2.5;
  const active = stages.find((s) => s.id === activeId) ?? stages[0];
  const origin = `${CENTER}px ${CENTER}px`;

  return (
    <div
      className={cn("relative mx-auto aspect-square w-full max-w-[22rem]", className)}
      role="listbox"
      aria-label={ariaLabel}
      aria-activedescendant={active ? `career-stage-${active.id}` : undefined}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-full overflow-visible"
        aria-hidden="true"
      >
        <motion.circle
          cx={CENTER}
          cy={CENTER}
          r={RING_R + 6}
          fill="none"
          className="stroke-white/15"
          strokeWidth={1.5}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.7 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={VIEWPORT}
          transition={{ duration: 1, ease: EASE }}
          style={{ transformOrigin: origin }}
        />

        {stages.map((stage, i) => {
          const start = round(i * slice + gap / 2);
          const end = round((i + 1) * slice - gap / 2);
          const mid = round((start + end) / 2);
          const isActive = stage.id === activeId;
          const labelPos = polar(CENTER, CENTER, LABEL_R, mid);

          return (
            <motion.g
              key={stage.id}
              initial={reduceMotion ? false : { opacity: 0, scale: 0.45 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={VIEWPORT}
              transition={{
                duration: 0.8,
                ease: EASE,
                delay: reduceMotion ? 0 : 0.12 + i * 0.1,
              }}
              style={{ transformOrigin: origin }}
            >
              <path
                d={segmentPath(
                  CENTER,
                  CENTER,
                  SEGMENT_INNER,
                  SEGMENT_OUTER,
                  start,
                  end
                )}
                className={cn(
                  "transition-[fill,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  isActive ? "fill-[#7B7BB8]" : "fill-white/10"
                )}
              />
              <text
                x={fmt(labelPos.x)}
                y={fmt(labelPos.y)}
                textAnchor="middle"
                dominantBaseline="middle"
                className={cn(
                  "pointer-events-none select-none font-semibold tracking-wide transition-colors duration-500",
                  isActive ? "fill-white" : "fill-white/45"
                )}
                style={{ fontSize: 10 }}
              >
                {stage.indexLabel}
              </text>
            </motion.g>
          );
        })}

        <motion.circle
          cx={CENTER}
          cy={CENTER}
          r={SEGMENT_INNER - 4}
          className="fill-[#3E3E75] stroke-white/20"
          strokeWidth={1.5}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={VIEWPORT}
          transition={{
            duration: 0.8,
            ease: EASE,
            delay: reduceMotion ? 0 : 0.3,
          }}
          style={{ transformOrigin: origin }}
        />
      </svg>

      <motion.div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={VIEWPORT}
        transition={{
          duration: 0.8,
          ease: EASE,
          delay: reduceMotion ? 0 : 0.5,
        }}
      >
        <div className="flex max-w-[7.5rem] flex-col items-center px-2 text-center">
          <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-white/50 uppercase">
            {hubLabel}
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums tracking-tight text-white">
            {active?.indexLabel ?? "01"}
            <span className="text-white/45">
              {" "}
              / {String(count).padStart(2, "0")}
            </span>
          </p>
          <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-white/90">
            {active?.label}
          </p>
        </div>
      </motion.div>

      {stages.map((stage, i) => {
        const mid = round(i * slice + slice / 2);
        const pos = polar(50, 50, 41.5, mid);
        const isActive = stage.id === activeId;

        return (
          <motion.button
            key={stage.id}
            id={`career-stage-${stage.id}`}
            type="button"
            role="option"
            aria-selected={isActive}
            aria-current={isActive ? "true" : undefined}
            aria-pressed={isActive}
            onClick={() => onSelect(stage.id)}
            initial={
              reduceMotion
                ? false
                : { opacity: 0, left: "50%", top: "50%" }
            }
            whileInView={{
              opacity: 1,
              left: `${fmt(pos.x)}%`,
              top: `${fmt(pos.y)}%`,
            }}
            viewport={VIEWPORT}
            transition={{
              duration: 0.95,
              ease: EASE,
              delay: reduceMotion ? 0 : 0.4 + i * 0.09,
            }}
            className={cn(
              "absolute z-10 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border text-[0.65rem] font-semibold tracking-wide outline-none transition-[transform,box-shadow,background-color,border-color,color] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:ring-2 focus-visible:ring-white/40",
              isActive
                ? "scale-110 border-[#9A9AD0] bg-[#9A9AD0] text-[#2A2A52] shadow-lg shadow-black/30"
                : "border-white/20 bg-[#3E3E75]/90 text-white/70 hover:scale-105 hover:border-white/40 hover:text-white"
            )}
            title={stage.label}
          >
            {stage.indexLabel}
          </motion.button>
        );
      })}
    </div>
  );
}
