import Image from "next/image";
import { cn } from "@/lib/utils";

/** Temporary: same asset ×4 for collage layout testing. */
const COLLAGE_IMAGES = [
  "/public_images/solution-built-1.jpg",
  "/public_images/solution-built-1.jpg",
  "/public_images/solution-built-1.jpg",
  "/public_images/solution-built-1.jpg",
] as const;

type SolutionCollageProps = {
  className?: string;
};

export function SolutionCollage({ className }: SolutionCollageProps) {
  return (
    <div
      className={cn(
        "relative isolate min-h-[22rem] rounded-2xl sm:min-h-[26rem] lg:min-h-[28rem]",
        className
      )}
      aria-hidden="true"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-[12%] left-[8%] size-[42%] border border-cyan-400/25" />
        <div className="absolute top-[18%] right-[10%] size-[28%] border border-cyan-400/20" />
        <div className="absolute right-[22%] bottom-[22%] size-[18%] border border-cyan-400/30" />
      </div>

      <div className="relative h-full min-h-[22rem] w-full sm:min-h-[26rem] lg:min-h-[28rem]">
        {/* Large — left */}
        <div
          className={cn(
            "absolute top-[10%] left-[6%] z-10 w-[52%] max-w-[17rem]",
            "origin-center rotate-[-4deg] [transform:perspective(900px)_rotateY(6deg)_rotate(-4deg)]",
            "border-[5px] border-white"
          )}
        >
          <Image
            src={COLLAGE_IMAGES[0]}
            alt=""
            width={800}
            height={1000}
            className="aspect-[4/5] h-auto w-full object-cover"
          />
        </div>

        {/* Medium — upper right */}
        <div
          className={cn(
            "absolute top-[8%] right-[6%] z-20 w-[40%] max-w-[13rem]",
            "origin-center rotate-[5deg] [transform:perspective(900px)_rotateY(-5deg)_rotate(5deg)]",
            "border-[5px] border-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
          )}
        >
          <Image
            src={COLLAGE_IMAGES[1]}
            alt=""
            width={700}
            height={700}
            className="aspect-square h-auto w-full object-cover"
          />
        </div>

        {/* Medium — bottom center, overlapping */}
        <div
          className={cn(
            "absolute bottom-[8%] left-[28%] z-30 w-[42%] max-w-[13.5rem]",
            "origin-center rotate-[-2deg] [transform:perspective(900px)_rotateY(3deg)_rotate(-2deg)]",
            "border-[5px] border-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
          )}
        >
          <Image
            src={COLLAGE_IMAGES[2]}
            alt=""
            width={800}
            height={600}
            className="aspect-[5/4] h-auto w-full object-cover"
          />
        </div>

        {/* Medium — bottom right, overlapping */}
        <div
          className={cn(
            "absolute right-[4%] bottom-[12%] z-40 w-[36%] max-w-[11.5rem]",
            "origin-center rotate-[6deg] [transform:perspective(900px)_rotateY(-4deg)_rotate(6deg)]",
            "border-[5px] border-white shadow-[0_12px_28px_rgba(0,0,0,0.18)]"
          )}
        >
          <Image
            src={COLLAGE_IMAGES[3]}
            alt=""
            width={700}
            height={700}
            className="aspect-square h-auto w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
