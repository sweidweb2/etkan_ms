"use client";

import { motion } from "motion/react";
import { HERO_THEME } from "@/components/public/home-hero-theme";
import { cn } from "@/lib/utils";

/** Motion-heavy ambient layer — loaded after first paint via dynamic import. */
export function HeroAmbientBackground() {
  const dots = [
    { top: "68%", left: "28%", size: "size-2.5", duration: 7 },
    { top: "18%", left: "58%", size: "size-2", duration: 8.5 },
    { top: "62%", left: "60%", size: "size-3", duration: 10 },
    { top: "42%", left: "15%", size: "size-2", duration: 6.5 },
    { top: "78%", left: "78%", size: "size-2.5", duration: 9 },
    { top: "30%", left: "78%", size: "size-2", duration: 7.5 },
    { top: "52%", left: "48%", size: "size-1.5", duration: 6 },
    { top: "8%", left: "32%", size: "size-2", duration: 8 },
    { top: "88%", left: "40%", size: "size-2.5", duration: 11 },
    { top: "36%", left: "88%", size: "size-2", duration: 9.5 },
  ] as const;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-zinc-100"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-zinc-50/70" />

      <motion.div
        className={cn(
          "absolute -top-24 -right-16 size-[24rem] rounded-full blur-3xl",
          HERO_THEME.accent
        )}
        animate={{ x: [0, 28, -14, 0], y: [0, 18, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.28 }}
      />
      <motion.div
        className={cn(
          "absolute -bottom-24 -left-20 size-[28rem] rounded-full blur-3xl",
          HERO_THEME.accentSoft
        )}
        animate={{ x: [0, -22, 16, 0], y: [0, -14, 12, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.48 }}
      />
      <motion.div
        className={cn(
          "absolute top-[38%] left-[42%] size-[20rem] rounded-full blur-3xl",
          HERO_THEME.accentMid
        )}
        animate={{ scale: [1, 1.2, 0.92, 1], x: [0, 24, -18, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.34 }}
      />
      <motion.div
        className={cn(
          "absolute top-[8%] left-[8%] size-[16rem] rounded-full blur-3xl",
          HERO_THEME.accentSoft
        )}
        animate={{ x: [0, 16, -10, 0], y: [0, 14, -8, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.3 }}
      />
      <motion.div
        className={cn(
          "absolute right-[5%] bottom-[8%] size-[14rem] rounded-full blur-3xl",
          HERO_THEME.accent
        )}
        animate={{ scale: [1, 1.15, 0.9, 1], y: [0, -12, 8, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.22 }}
      />

      <motion.div
        className={cn(
          "absolute top-[30%] -left-6 size-44 rotate-12 rounded-[1.75rem] blur-2xl",
          HERO_THEME.accentMid
        )}
        animate={{ rotate: [12, 28, 6, 12], y: [0, -22, 10, 0], x: [0, 12, -8, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute top-[55%] right-[2%] size-36 -rotate-6 rounded-[1.25rem] blur-2xl",
          HERO_THEME.accent
        )}
        animate={{ rotate: [-6, 8, -14, -6], y: [0, 14, -10, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        style={{ opacity: 0.35 }}
      />

      <motion.div
        className={cn(
          "absolute top-[14%] left-[20%] size-[4.25rem] rounded-lg border-2 opacity-40",
          HERO_THEME.patternSquare
        )}
        animate={{ rotate: [0, 18, -10, 0], y: [0, -14, 8, 0], x: [0, 10, -6, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute top-[40%] right-[22%] size-12 rounded-md border-2 opacity-35",
          HERO_THEME.patternSquare
        )}
        animate={{ rotate: [8, -12, 16, 8], y: [0, 12, -8, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute bottom-[18%] left-[18%] size-9 rounded-sm border opacity-30",
          HERO_THEME.patternSquare
        )}
        animate={{ rotate: [0, 25, -15, 0], x: [0, 10, -6, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className={cn(
          "absolute right-[26%] top-[48%] size-11 rounded-full border-2 opacity-35",
          HERO_THEME.patternCircle
        )}
        animate={{ y: [0, 16, -8, 0], x: [0, -12, 8, 0], scale: [1, 1.12, 0.94, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute top-[26%] left-[48%] size-8 rounded-full border-2 opacity-30",
          HERO_THEME.patternCircle
        )}
        animate={{ y: [0, -12, 8, 0], x: [0, 14, -8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute bottom-[28%] right-[12%] size-7 rounded-full border opacity-30",
          HERO_THEME.patternCircle
        )}
        animate={{ scale: [1, 1.25, 0.9, 1], y: [0, -10, 6, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className={cn(
          "absolute top-[20%] right-[16%] size-9 border-2 opacity-35",
          HERO_THEME.patternSquare
        )}
        animate={{ rotate: [45, 70, 35, 45], y: [0, -18, 10, 0], x: [0, 14, -8, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={cn(
          "absolute bottom-[40%] left-[8%] size-7 border opacity-30",
          HERO_THEME.patternSquare
        )}
        animate={{ rotate: [45, 20, 60, 45], y: [0, 14, -8, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-[56%] left-[10%] h-24 w-8 rounded-full border-2 border-zinc-400/35 opacity-45"
        animate={{ y: [0, -20, 12, 0], rotate: [-8, 10, -4, -8] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[7%] top-[24%] h-7 w-28 rounded-full border-2 border-slate-400/35 opacity-40"
        animate={{ x: [0, -22, 14, 0], rotate: [0, -6, 4, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[72%] left-[52%] h-5 w-20 rounded-full border border-zinc-400/30 opacity-40"
        animate={{ x: [0, 18, -12, 0], y: [0, -8, 6, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[12%] left-[62%] h-16 w-6 rounded-full border-2 border-slate-400/30 opacity-35"
        animate={{ y: [0, 16, -10, 0], rotate: [6, -8, 4, 6] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute bottom-[20%] right-[38%] size-20 rounded-full border-[3px] border-zinc-400/30 opacity-45"
        animate={{ scale: [1, 1.18, 0.9, 1], rotate: [0, 40, -20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[24%] right-[40.5%] size-12 rounded-full border border-slate-500/30 opacity-40"
        animate={{ scale: [1, 0.85, 1.1, 1], rotate: [0, -50, 25, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[34%] left-[68%] size-16 rounded-full border-2 border-zinc-400/25 opacity-40"
        animate={{ scale: [1, 1.2, 0.88, 1], x: [0, -10, 8, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-[46%] left-[34%] size-14 opacity-30"
        style={{
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          backgroundColor: "rgba(113,113,122,0.4)",
        }}
        animate={{ y: [0, -16, 8, 0], rotate: [0, 15, -8, 0], x: [0, 12, -6, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[18%] left-[38%] size-10 opacity-25"
        style={{
          clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)",
          backgroundColor: "rgba(100,116,139,0.45)",
        }}
        animate={{ y: [0, 12, -8, 0], rotate: [180, 195, 170, 180] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-[10%] left-[52%] h-16 w-px bg-zinc-400/35"
        animate={{ y: [0, 18, -8, 0], opacity: [0.3, 0.5, 0.25, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[16%] left-[49%] h-px w-16 bg-zinc-400/35"
        animate={{ x: [0, 14, -10, 0], opacity: [0.25, 0.45, 0.2, 0.25] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[32%] left-[72%] h-12 w-px bg-slate-400/30"
        animate={{ y: [0, -14, 8, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[36%] left-[69%] h-px w-12 bg-slate-400/30"
        animate={{ x: [0, -10, 8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {dots.map((dot, i) => (
        <motion.div
          key={`dot-${i}`}
          className={cn("absolute rounded-full bg-slate-500/40", dot.size)}
          style={{ top: dot.top, left: dot.left }}
          animate={{
            y: [0, i % 2 === 0 ? -22 : 18, i % 2 === 0 ? 10 : -10, 0],
            x: [0, i % 2 === 0 ? 14 : -12, i % 2 === 0 ? -8 : 8, 0],
            scale: [1, 1.25, 0.9, 1],
          }}
          transition={{
            duration: dot.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.15,
          }}
        />
      ))}

      <motion.div
        className="absolute bottom-[12%] left-[40%] size-14 rounded-md border-2 border-dashed border-zinc-400/35 opacity-45"
        animate={{ rotate: [0, -20, 12, 0], y: [0, 12, -10, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[58%] left-[78%] size-10 rounded-full border border-dashed border-slate-400/35 opacity-40"
        animate={{ rotate: [0, 40, -20, 0], scale: [1, 1.1, 0.95, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute top-[60%] right-[12%] h-20 w-20 rounded-full border-t-[3px] border-r-[3px] border-slate-400/30 opacity-45"
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute top-[8%] right-[32%] h-14 w-14 rounded-full border-b-[2px] border-l-[2px] border-zinc-400/30 opacity-40"
        animate={{ rotate: [360, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute bottom-[8%] left-[28%] h-16 w-16 rounded-full border-t-[2px] border-l-[2px] border-slate-500/25 opacity-35"
        animate={{ rotate: [0, -360] }}
        transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
