"use client";

import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import type { MessageKey } from "@/lib/i18n/messages";
import { cn } from "@/lib/utils";

type Particle = { x: number; y: number; r: number; opacity: number };

/** Fixed decimals so server HTML and client hydration emit the same attributes. */
function svgNum(value: number) {
  return Math.round(value * 100) / 100;
}

function particleRandom(seed: number) {
  let value = seed;
  return () => {
    value = (value + 0x6d2b79f5) | 0;
    let t = Math.imul(value ^ (value >>> 15), 1 | value);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function scatteredParticles(): Particle[] {
  const random = particleRandom(11);
  return Array.from({ length: 72 }, () => ({
    x: svgNum(18 + random() * 284),
    y: svgNum(14 + random() * 154),
    r: svgNum(1.15 + random() * 2.1),
    opacity: svgNum(0.28 + random() * 0.62),
  }));
}

function clusteredParticles(): Particle[] {
  const random = particleRandom(29);
  const groups = [
    { x: 72, y: 98, spread: 52, count: 34 },
    { x: 168, y: 78, spread: 36, count: 42 },
    { x: 250, y: 108, spread: 44, count: 32 },
  ];
  return groups.flatMap((group) =>
    Array.from({ length: group.count }, () => {
      const angle = random() * Math.PI * 2;
      const distance = Math.pow(random(), 0.65) * group.spread;
      return {
        x: svgNum(group.x + Math.cos(angle) * distance),
        y: svgNum(group.y + Math.sin(angle) * distance * 0.82),
        r: svgNum(1.2 + random() * 2),
        opacity: svgNum(0.4 + random() * 0.55),
      };
    })
  );
}

function networkParticles() {
  const count = 58;
  const golden = Math.PI * (3 - Math.sqrt(5));
  const nodes = Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * index;
    return { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius };
  });
  const links: Array<[number, number]> = [];
  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dz = nodes[i].z - nodes[j].z;
      if (dx * dx + dy * dy + dz * dz < 0.34) links.push([i, j]);
    }
  }
  const project = (node: (typeof nodes)[number]) => ({
    x: svgNum(160 + (node.x + node.z * 0.28) * 78),
    y: svgNum(92 + node.y * 72),
    r: svgNum(1.5 + (node.z + 1) * 0.7),
    opacity: svgNum(0.45 + (node.z + 1) * 0.25),
  });
  return { nodes: nodes.map(project), links, raw: nodes };
}

const STAGES: Array<{
  number: string;
  titleKey: MessageKey;
  bodyKey: MessageKey;
  art: "scattered" | "clustered" | "unified";
}> = [
  {
    number: "01",
    titleKey: "homeLearningPath.step1.title",
    bodyKey: "homeLearningPath.step1.body",
    art: "scattered",
  },
  {
    number: "02",
    titleKey: "homeLearningPath.step2.title",
    bodyKey: "homeLearningPath.step2.body",
    art: "clustered",
  },
  {
    number: "03",
    titleKey: "homeLearningPath.step3.title",
    bodyKey: "homeLearningPath.step3.body",
    art: "unified",
  },
];

const ART_CLASS =
  "h-40 w-full text-[#3E3E75] dark:text-[#C4C4E8]";

function LearningPathArt({ kind }: { kind: (typeof STAGES)[number]["art"] }) {
  if (kind === "unified") {
    const { nodes, links, raw } = networkParticles();
    return (
      <svg viewBox="0 0 320 180" className={ART_CLASS} aria-hidden>
        {links.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={nodes[from].x}
            y1={nodes[from].y}
            x2={nodes[to].x}
            y2={nodes[to].y}
            stroke="currentColor"
            strokeWidth="0.6"
            opacity={svgNum(0.22 + ((raw[from].z + raw[to].z + 2) / 4) * 0.35)}
          />
        ))}
        {nodes.map((node, index) => (
          <circle
            key={index}
            cx={node.x}
            cy={node.y}
            r={node.r}
            fill="currentColor"
            opacity={node.opacity}
          />
        ))}
      </svg>
    );
  }

  const particles =
    kind === "scattered" ? scatteredParticles() : clusteredParticles();
  return (
    <svg viewBox="0 0 320 180" className={ART_CLASS} aria-hidden>
      {particles.map((particle, index) => (
        <circle
          key={index}
          cx={particle.x}
          cy={particle.y}
          r={particle.r}
          fill="currentColor"
          opacity={particle.opacity}
        />
      ))}
    </svg>
  );
}

export function HomeLearningPathSection() {
  const { t } = usePublicI18n();
  const titleId = "home-learning-path-title";

  return (
    <section
      className="relative isolate overflow-hidden border-b border-border bg-[color-mix(in_oklch,var(--primary)_8%,var(--background))] px-4 py-10 sm:px-6 sm:py-14"
      aria-labelledby={titleId}
    >
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-10 sm:gap-14">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id={titleId}
            className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            {t("homeLearningPath.title")}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground text-pretty sm:text-base">
            {t("homeLearningPath.lead")}
          </p>
        </div>

        <div className="grid md:grid-cols-3">
          {STAGES.map((stage, index) => (
            <article
              key={stage.number}
              className={cn(
                "flex flex-col",
                index > 0 &&
                  "mt-10 border-t border-border pt-10 md:mt-0 md:border-t-0 md:border-s md:pt-0 md:ps-8",
                index < STAGES.length - 1 && "md:pe-8"
              )}
            >
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                {stage.number}
              </p>
              <h3 className="mt-3 text-base font-semibold tracking-tight">
                {t(stage.titleKey)}
              </h3>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                {t(stage.bodyKey)}
              </p>
              <div className="mt-8">
                <LearningPathArt kind={stage.art} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
