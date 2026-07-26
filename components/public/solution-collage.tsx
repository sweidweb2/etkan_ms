"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEWPORT = { once: true, amount: 0.25, margin: "0px 0px -8% 0px" } as const;

const COLLAGE_IMAGES = [
  "https://images.unsplash.com/photo-1690683789978-3cf73960d650?q=80&w=1509&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1621839673705-6617adf9e890?q=80&w=1332&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1704283860614-803aa8be7993?q=80&w=1170&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=1073&auto=format&fit=crop",
] as const;

const FRAMES = [
  {
    src: COLLAGE_IMAGES[0],
    wrapClass:
      "absolute top-[10%] left-[6%] z-10 w-[52%] max-w-[17rem]",
    tiltClass:
      "origin-center rotate-[-4deg] [transform:perspective(900px)_rotateY(6deg)_rotate(-4deg)] border-[5px] border-white",
    width: 800,
    height: 1000,
    imageClass: "aspect-[4/5] h-auto w-full object-cover",
    from: { x: -28, y: 24 },
  },
  {
    src: COLLAGE_IMAGES[1],
    wrapClass:
      "absolute top-[8%] right-[6%] z-20 w-[40%] max-w-[13rem]",
    tiltClass:
      "origin-center rotate-[5deg] [transform:perspective(900px)_rotateY(-5deg)_rotate(5deg)] border-[5px] border-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]",
    width: 700,
    height: 700,
    imageClass: "aspect-square h-auto w-full object-cover",
    from: { x: 28, y: -18 },
  },
  {
    src: COLLAGE_IMAGES[2],
    wrapClass:
      "absolute bottom-[8%] left-[28%] z-30 w-[42%] max-w-[13.5rem]",
    tiltClass:
      "origin-center rotate-[-2deg] [transform:perspective(900px)_rotateY(3deg)_rotate(-2deg)] border-[5px] border-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]",
    width: 800,
    height: 600,
    imageClass: "aspect-[5/4] h-auto w-full object-cover",
    from: { x: -12, y: 32 },
  },
  {
    src: COLLAGE_IMAGES[3],
    wrapClass:
      "absolute right-[4%] bottom-[12%] z-40 w-[36%] max-w-[11.5rem]",
    tiltClass:
      "origin-center rotate-[6deg] [transform:perspective(900px)_rotateY(-4deg)_rotate(6deg)] border-[5px] border-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]",
    width: 700,
    height: 700,
    imageClass: "aspect-square h-auto w-full object-cover",
    from: { x: 24, y: 28 },
  },
] as const;

type SolutionCollageProps = {
  className?: string;
};

export function SolutionCollage({ className }: SolutionCollageProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={cn(
        "relative isolate min-h-[22rem] rounded-2xl sm:min-h-[26rem] lg:min-h-[28rem]",
        className
      )}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0">
        <motion.div
          className="absolute top-[12%] left-[8%] size-[42%] border border-[#7B7BB8]/25"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.9, ease: EASE, delay: 0.1 }}
        />
        <motion.div
          className="absolute top-[18%] right-[10%] size-[28%] border border-[#7B7BB8]/20"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}
        />
        <motion.div
          className="absolute right-[22%] bottom-[22%] size-[18%] border border-[#9A9AD0]/30"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={VIEWPORT}
          transition={{ duration: 0.9, ease: EASE, delay: 0.3 }}
        />
      </div>

      <div className="relative h-full min-h-[22rem] w-full sm:min-h-[26rem] lg:min-h-[28rem]">
        {FRAMES.map((frame, i) => (
          <motion.div
            key={frame.src}
            className={frame.wrapClass}
            initial={
              reduceMotion
                ? false
                : { opacity: 0, x: frame.from.x, y: frame.from.y, scale: 0.92 }
            }
            whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            viewport={VIEWPORT}
            transition={{
              duration: 1,
              ease: EASE,
              delay: reduceMotion ? 0 : 0.22 + i * 0.14,
            }}
          >
            <div className={frame.tiltClass}>
              <Image
                src={frame.src}
                alt=""
                width={frame.width}
                height={frame.height}
                className={frame.imageClass}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
