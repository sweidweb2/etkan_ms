import Image from "next/image";
import { cn } from "@/lib/utils";

const COLLAGE_IMAGES = [
  "https://images.unsplash.com/photo-1690683789978-3cf73960d650?q=80&w=1509&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1621839673705-6617adf9e890?q=80&w=1332&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1704283860614-803aa8be7993?q=80&w=1170&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1592659762303-90081d34b277?q=80&w=1073&auto=format&fit=crop",
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
        <div className="absolute top-[12%] left-[8%] size-[42%] border border-[#7B7BB8]/25" />
        <div className="absolute top-[18%] right-[10%] size-[28%] border border-[#7B7BB8]/20" />
        <div className="absolute right-[22%] bottom-[22%] size-[18%] border border-[#9A9AD0]/30" />
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
