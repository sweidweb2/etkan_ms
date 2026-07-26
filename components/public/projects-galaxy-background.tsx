"use client";

import { motion, useReducedMotion } from "motion/react";
import { useHydrated } from "@/hooks/use-hydrated";
import { cn } from "@/lib/utils";

/** Deterministic positions — no Math.random() during render. */
const STARS = [
  { left: 4, top: 8, size: 1.5, delay: 0.2, duration: 3.2 },
  { left: 12, top: 22, size: 1, delay: 1.1, duration: 4.1 },
  { left: 18, top: 6, size: 2, delay: 0.4, duration: 2.8 },
  { left: 27, top: 38, size: 1.2, delay: 1.8, duration: 3.6 },
  { left: 33, top: 14, size: 1, delay: 0.9, duration: 4.4 },
  { left: 41, top: 28, size: 1.8, delay: 0.1, duration: 3.0 },
  { left: 48, top: 9, size: 1.1, delay: 2.2, duration: 3.8 },
  { left: 56, top: 44, size: 1.4, delay: 0.6, duration: 4.2 },
  { left: 63, top: 18, size: 2.2, delay: 1.4, duration: 2.6 },
  { left: 71, top: 32, size: 1, delay: 0.3, duration: 3.9 },
  { left: 78, top: 7, size: 1.6, delay: 1.7, duration: 3.3 },
  { left: 86, top: 26, size: 1.2, delay: 0.8, duration: 4.0 },
  { left: 92, top: 48, size: 1.9, delay: 2.0, duration: 2.9 },
  { left: 8, top: 58, size: 1.3, delay: 1.2, duration: 3.5 },
  { left: 16, top: 72, size: 1, delay: 0.5, duration: 4.3 },
  { left: 24, top: 64, size: 2, delay: 1.9, duration: 3.1 },
  { left: 35, top: 78, size: 1.1, delay: 0.7, duration: 3.7 },
  { left: 44, top: 56, size: 1.5, delay: 1.5, duration: 2.7 },
  { left: 52, top: 82, size: 1, delay: 0.2, duration: 4.5 },
  { left: 61, top: 68, size: 1.7, delay: 2.4, duration: 3.4 },
  { left: 69, top: 88, size: 1.2, delay: 1.0, duration: 3.8 },
  { left: 77, top: 62, size: 2.1, delay: 0.4, duration: 2.5 },
  { left: 85, top: 74, size: 1, delay: 1.6, duration: 4.1 },
  { left: 94, top: 84, size: 1.4, delay: 0.9, duration: 3.2 },
  { left: 6, top: 42, size: 1.1, delay: 2.1, duration: 3.6 },
  { left: 22, top: 48, size: 1.8, delay: 0.3, duration: 2.8 },
  { left: 38, top: 52, size: 1, delay: 1.3, duration: 4.0 },
  { left: 58, top: 36, size: 1.6, delay: 0.6, duration: 3.3 },
  { left: 74, top: 52, size: 1.2, delay: 1.8, duration: 3.9 },
  { left: 88, top: 40, size: 2, delay: 0.1, duration: 2.6 },
  { left: 14, top: 88, size: 1.3, delay: 2.3, duration: 3.5 },
  { left: 46, top: 92, size: 1, delay: 0.8, duration: 4.2 },
  { left: 66, top: 8, size: 1.5, delay: 1.1, duration: 3.0 },
  { left: 82, top: 16, size: 1.1, delay: 1.9, duration: 3.7 },
  { left: 30, top: 24, size: 1.9, delay: 0.5, duration: 2.9 },
  { left: 50, top: 64, size: 1.2, delay: 1.4, duration: 4.4 },
] as const;

const PLANETS = [
  {
    id: "p1",
    left: 8,
    top: 18,
    size: 72,
    hue: "from-[#4A4A86] to-[#2A2A52]",
    ring: true,
    duration: 28,
    driftX: 18,
    driftY: 12,
  },
  {
    id: "p2",
    left: 78,
    top: 12,
    size: 48,
    hue: "from-[#7B7BB8] to-[#3E3E75]",
    ring: false,
    duration: 22,
    driftX: -14,
    driftY: 16,
  },
  {
    id: "p3",
    left: 72,
    top: 68,
    size: 96,
    hue: "from-[#9A9AD0] to-[#343463]",
    ring: true,
    duration: 34,
    driftX: -20,
    driftY: -10,
  },
  {
    id: "p4",
    left: 14,
    top: 72,
    size: 36,
    hue: "from-[#C4C4E8] to-[#4A4A86]",
    ring: false,
    duration: 18,
    driftX: 12,
    driftY: -14,
  },
] as const;

const METEORS = [
  { id: "m1", top: 8, delay: 0, duration: 7, width: 140 },
  { id: "m2", top: 22, delay: 2.4, duration: 8.5, width: 110 },
  { id: "m3", top: 38, delay: 4.8, duration: 6.5, width: 160 },
  { id: "m4", top: 55, delay: 1.2, duration: 9, width: 100 },
  { id: "m5", top: 70, delay: 6.2, duration: 7.5, width: 130 },
] as const;

const METEORITES = [
  { id: "r1", left: 28, top: 30, size: 5, delay: 0.4, duration: 14 },
  { id: "r2", left: 62, top: 48, size: 4, delay: 1.8, duration: 16 },
  { id: "r3", left: 44, top: 76, size: 6, delay: 0.9, duration: 12 },
  { id: "r4", left: 86, top: 58, size: 3.5, delay: 2.6, duration: 15 },
  { id: "r5", left: 18, top: 52, size: 4.5, delay: 1.2, duration: 13 },
] as const;

type ProjectsGalaxyBackgroundProps = {
  className?: string;
};

export function ProjectsGalaxyBackground({
  className,
}: ProjectsGalaxyBackgroundProps) {
  const hydrated = useHydrated();
  const reduceMotion = useReducedMotion();
  const canAnimate = hydrated && !reduceMotion;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-[#070712]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,rgba(62,62,117,0.45),transparent_55%),radial-gradient(ellipse_at_80%_20%,rgba(154,154,208,0.18),transparent_50%),radial-gradient(ellipse_at_70%_80%,rgba(74,74,134,0.28),transparent_55%),radial-gradient(ellipse_at_15%_85%,rgba(42,42,82,0.5),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(26,26,46,0.9),transparent_55%)]" />

      <div
        className="absolute top-[28%] left-[-10%] h-[38%] w-[120%] -rotate-[18deg] opacity-40"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(196,196,232,0.08) 30%, rgba(154,154,208,0.14) 50%, rgba(196,196,232,0.08) 70%, transparent)",
          filter: "blur(28px)",
        }}
      />

      {STARS.map((star) => (
        <motion.span
          key={`${star.left}-${star.top}-${star.size}`}
          className="absolute rounded-full bg-[#F4F2FF]"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            boxShadow: `0 0 ${star.size * 3}px rgba(196,196,232,0.55)`,
          }}
          animate={
            canAnimate
              ? {
                  opacity: [0.25, 1, 0.35, 0.9, 0.25],
                  scale: [1, 1.35, 1, 1.2, 1],
                }
              : { opacity: 0.7 }
          }
          transition={
            canAnimate
              ? {
                  duration: star.duration,
                  delay: star.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : undefined
          }
        />
      ))}

      {PLANETS.map((planet) => (
        <motion.div
          key={planet.id}
          className="absolute"
          style={{
            left: `${planet.left}%`,
            top: `${planet.top}%`,
            width: planet.size,
            height: planet.size,
          }}
          animate={
            canAnimate
              ? {
                  x: [0, planet.driftX, 0, -planet.driftX * 0.6, 0],
                  y: [0, -planet.driftY, 0, planet.driftY * 0.5, 0],
                }
              : undefined
          }
          transition={
            canAnimate
              ? {
                  duration: planet.duration,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : undefined
          }
        >
          <div
            className={cn(
              "relative size-full rounded-full bg-gradient-to-br shadow-[0_0_40px_-8px_rgba(154,154,208,0.55)]",
              planet.hue
            )}
          >
            <div className="absolute inset-[18%] rounded-full bg-white/10 blur-[2px]" />
            <div className="absolute start-[18%] top-[16%] size-[28%] rounded-full bg-white/25 blur-[1px]" />
          </div>
          {planet.ring ? (
            <div className="pointer-events-none absolute top-1/2 left-1/2 h-[18%] w-[150%] -translate-x-1/2 -translate-y-1/2 rotate-[-24deg] rounded-[100%] border border-[#C4C4E8]/35 shadow-[0_0_12px_rgba(196,196,232,0.25)]" />
          ) : null}
        </motion.div>
      ))}

      {METEORITES.map((rock) => (
        <motion.span
          key={rock.id}
          className="absolute rounded-[30%_70%_55%_45%] bg-gradient-to-br from-[#9A9AD0]/80 to-[#2A2A52] shadow-[0_0_10px_rgba(154,154,208,0.35)]"
          style={{
            left: `${rock.left}%`,
            top: `${rock.top}%`,
            width: rock.size,
            height: rock.size * 0.85,
          }}
          animate={
            canAnimate
              ? {
                  x: [0, 24, -8, 16, 0],
                  y: [0, -18, 10, -6, 0],
                  rotate: [0, 40, -20, 55, 0],
                  opacity: [0.55, 0.9, 0.6, 0.85, 0.55],
                }
              : { opacity: 0.7 }
          }
          transition={
            canAnimate
              ? {
                  duration: rock.duration,
                  delay: rock.delay,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : undefined
          }
        />
      ))}

      {canAnimate
        ? METEORS.map((meteor) => (
            <motion.span
              key={meteor.id}
              className="absolute block h-px origin-left bg-gradient-to-r from-transparent via-[#F4F2FF] to-transparent"
              style={{
                top: `${meteor.top}%`,
                left: "-20%",
                width: meteor.width,
                boxShadow: "0 0 8px 1px rgba(196,196,232,0.55)",
              }}
              initial={{ x: 0, y: 0, opacity: 0, rotate: 28 }}
              animate={{
                x: ["0vw", "130vw"],
                y: ["0vh", "58vh"],
                opacity: [0, 1, 0.9, 0, 0],
                rotate: 28,
              }}
              transition={{
                duration: meteor.duration,
                delay: meteor.delay,
                repeat: Infinity,
                ease: "linear",
                times: [0, 0.08, 0.18, 0.32, 1],
              }}
            />
          ))
        : null}
    </div>
  );
}
