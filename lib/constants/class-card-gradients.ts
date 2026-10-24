/**
 * Curated class-card aurora gradients.
 * `classes.card_gradient` stores one of these keys.
 */

export const CLASS_CARD_GRADIENT_KEYS = [
  "violet-aurora",
  "teal-lagoon",
  "magenta-dusk",
  "sky-mint",
  "coral-bloom",
  "indigo-glow",
  "lime-breeze",
  "rose-mist",
  "cyan-flare",
  "amber-haze",
  "orchid-wave",
  "ocean-spark",
  "peach-sunset",
  "emerald-veil",
  "lavender-pulse",
  "sapphire-mist",
] as const;

export type ClassCardGradientKey = (typeof CLASS_CARD_GRADIENT_KEYS)[number];

export const DEFAULT_CLASS_CARD_GRADIENT: ClassCardGradientKey =
  CLASS_CARD_GRADIENT_KEYS[0];

export type ClassCardGradientBlob = {
  color: string;
  x: number;
  y: number;
  size: number;
  soft?: number;
};

export type ClassCardGradientDefinition = {
  key: ClassCardGradientKey;
  label: string;
  /** Light wash under the blobs (keep bright — not charcoal). */
  base: string;
  blobs: ClassCardGradientBlob[];
  /** Soft directional wash over the mesh */
  wash: string;
};

/**
 * Bright, premium mesh palettes. Lightness stays mid–high so cards do not
 * read as dark slabs; chroma stays soft enough for glass overlays.
 */
export const CLASS_CARD_GRADIENTS: Record<
  ClassCardGradientKey,
  ClassCardGradientDefinition
> = {
  "violet-aurora": {
    key: "violet-aurora",
    label: "Violet aurora",
    base: "oklch(0.82 0.06 290)",
    blobs: [
      { color: "oklch(0.72 0.18 295)", x: 18, y: 20, size: 70 },
      { color: "oklch(0.78 0.14 250)", x: 78, y: 28, size: 62 },
      { color: "oklch(0.84 0.12 320)", x: 42, y: 78, size: 55 },
      { color: "oklch(0.88 0.08 280 / 0.7)", x: 55, y: 45, size: 40, soft: 0.4 },
    ],
    wash: "linear-gradient(135deg, oklch(0.78 0.12 280 / 0.45), transparent 60%, oklch(0.86 0.1 240 / 0.4))",
  },
  "teal-lagoon": {
    key: "teal-lagoon",
    label: "Teal lagoon",
    base: "oklch(0.86 0.05 190)",
    blobs: [
      { color: "oklch(0.78 0.12 185)", x: 22, y: 25, size: 68 },
      { color: "oklch(0.82 0.11 160)", x: 75, y: 35, size: 58 },
      { color: "oklch(0.88 0.08 210)", x: 48, y: 80, size: 52 },
      { color: "oklch(0.9 0.07 145 / 0.65)", x: 60, y: 50, size: 36, soft: 0.42 },
    ],
    wash: "linear-gradient(150deg, oklch(0.84 0.09 175 / 0.4), transparent 55%, oklch(0.9 0.07 200 / 0.35))",
  },
  "magenta-dusk": {
    key: "magenta-dusk",
    label: "Magenta dusk",
    base: "oklch(0.84 0.06 330)",
    blobs: [
      { color: "oklch(0.74 0.18 340)", x: 20, y: 22, size: 66 },
      { color: "oklch(0.7 0.16 300)", x: 80, y: 30, size: 60 },
      { color: "oklch(0.8 0.12 265)", x: 45, y: 75, size: 54 },
      { color: "oklch(0.86 0.1 350 / 0.65)", x: 50, y: 48, size: 38, soft: 0.4 },
    ],
    wash: "linear-gradient(145deg, oklch(0.76 0.14 330 / 0.45), transparent 58%, oklch(0.82 0.1 280 / 0.35))",
  },
  "sky-mint": {
    key: "sky-mint",
    label: "Sky mint",
    base: "oklch(0.9 0.04 200)",
    blobs: [
      { color: "oklch(0.82 0.11 220)", x: 15, y: 30, size: 65 },
      { color: "oklch(0.86 0.1 165)", x: 70, y: 20, size: 58 },
      { color: "oklch(0.88 0.08 140)", x: 55, y: 78, size: 50 },
      { color: "oklch(0.92 0.06 190 / 0.7)", x: 40, y: 50, size: 35, soft: 0.45 },
    ],
    wash: "linear-gradient(160deg, oklch(0.88 0.08 210 / 0.4), transparent 55%, oklch(0.9 0.07 155 / 0.35))",
  },
  "coral-bloom": {
    key: "coral-bloom",
    label: "Coral bloom",
    base: "oklch(0.88 0.05 40)",
    blobs: [
      { color: "oklch(0.8 0.14 30)", x: 25, y: 18, size: 64 },
      { color: "oklch(0.78 0.13 350)", x: 78, y: 40, size: 56 },
      { color: "oklch(0.84 0.1 55)", x: 40, y: 78, size: 52 },
      { color: "oklch(0.9 0.08 20 / 0.65)", x: 55, y: 45, size: 36, soft: 0.42 },
    ],
    wash: "linear-gradient(130deg, oklch(0.84 0.1 35 / 0.4), transparent 55%, oklch(0.88 0.08 350 / 0.35))",
  },
  "indigo-glow": {
    key: "indigo-glow",
    label: "Indigo glow",
    base: "oklch(0.8 0.06 270)",
    blobs: [
      { color: "oklch(0.7 0.16 275)", x: 18, y: 25, size: 70 },
      { color: "oklch(0.76 0.14 240)", x: 75, y: 22, size: 60 },
      { color: "oklch(0.78 0.12 300)", x: 50, y: 80, size: 55 },
      { color: "oklch(0.86 0.09 255 / 0.7)", x: 48, y: 48, size: 38, soft: 0.4 },
    ],
    wash: "linear-gradient(140deg, oklch(0.74 0.12 270 / 0.45), transparent 58%, oklch(0.84 0.1 230 / 0.35))",
  },
  "lime-breeze": {
    key: "lime-breeze",
    label: "Lime breeze",
    base: "oklch(0.9 0.05 130)",
    blobs: [
      { color: "oklch(0.84 0.12 135)", x: 20, y: 28, size: 66 },
      { color: "oklch(0.86 0.1 105)", x: 72, y: 25, size: 58 },
      { color: "oklch(0.88 0.09 160)", x: 48, y: 78, size: 52 },
      { color: "oklch(0.92 0.06 120 / 0.65)", x: 55, y: 50, size: 34, soft: 0.45 },
    ],
    wash: "linear-gradient(155deg, oklch(0.88 0.08 130 / 0.4), transparent 55%, oklch(0.9 0.07 100 / 0.3))",
  },
  "rose-mist": {
    key: "rose-mist",
    label: "Rose mist",
    base: "oklch(0.88 0.05 10)",
    blobs: [
      { color: "oklch(0.8 0.12 15)", x: 22, y: 22, size: 64 },
      { color: "oklch(0.78 0.13 350)", x: 78, y: 35, size: 58 },
      { color: "oklch(0.84 0.1 330)", x: 42, y: 78, size: 50 },
      { color: "oklch(0.9 0.07 5 / 0.65)", x: 52, y: 48, size: 36, soft: 0.42 },
    ],
    wash: "linear-gradient(135deg, oklch(0.84 0.09 10 / 0.4), transparent 55%, oklch(0.88 0.08 340 / 0.35))",
  },
  "cyan-flare": {
    key: "cyan-flare",
    label: "Cyan flare",
    base: "oklch(0.88 0.05 210)",
    blobs: [
      { color: "oklch(0.8 0.13 210)", x: 16, y: 20, size: 68 },
      { color: "oklch(0.82 0.12 185)", x: 80, y: 30, size: 60 },
      { color: "oklch(0.78 0.14 240)", x: 45, y: 78, size: 55 },
      { color: "oklch(0.9 0.08 200 / 0.7)", x: 50, y: 45, size: 38, soft: 0.4 },
    ],
    wash: "linear-gradient(145deg, oklch(0.84 0.1 205 / 0.4), transparent 55%, oklch(0.86 0.1 230 / 0.35))",
  },
  "amber-haze": {
    key: "amber-haze",
    label: "Amber haze",
    base: "oklch(0.9 0.05 80)",
    blobs: [
      { color: "oklch(0.84 0.12 75)", x: 24, y: 22, size: 64 },
      { color: "oklch(0.82 0.11 50)", x: 76, y: 38, size: 56 },
      { color: "oklch(0.86 0.1 95)", x: 45, y: 78, size: 50 },
      { color: "oklch(0.92 0.07 70 / 0.65)", x: 55, y: 48, size: 34, soft: 0.45 },
    ],
    wash: "linear-gradient(150deg, oklch(0.88 0.08 75 / 0.4), transparent 55%, oklch(0.9 0.07 55 / 0.3))",
  },
  "orchid-wave": {
    key: "orchid-wave",
    label: "Orchid wave",
    base: "oklch(0.86 0.05 310)",
    blobs: [
      { color: "oklch(0.76 0.15 315)", x: 20, y: 25, size: 68 },
      { color: "oklch(0.78 0.13 280)", x: 75, y: 28, size: 58 },
      { color: "oklch(0.82 0.11 340)", x: 48, y: 78, size: 52 },
      { color: "oklch(0.88 0.09 300 / 0.65)", x: 52, y: 50, size: 36, soft: 0.42 },
    ],
    wash: "linear-gradient(140deg, oklch(0.8 0.11 310 / 0.4), transparent 58%, oklch(0.86 0.09 280 / 0.35))",
  },
  "ocean-spark": {
    key: "ocean-spark",
    label: "Ocean spark",
    base: "oklch(0.86 0.05 230)",
    blobs: [
      { color: "oklch(0.76 0.14 235)", x: 18, y: 28, size: 70 },
      { color: "oklch(0.8 0.12 195)", x: 78, y: 22, size: 58 },
      { color: "oklch(0.82 0.1 260)", x: 50, y: 80, size: 54 },
      { color: "oklch(0.9 0.08 220 / 0.7)", x: 45, y: 48, size: 38, soft: 0.4 },
    ],
    wash: "linear-gradient(155deg, oklch(0.8 0.1 230 / 0.4), transparent 55%, oklch(0.88 0.08 200 / 0.35))",
  },
  "peach-sunset": {
    key: "peach-sunset",
    label: "Peach sunset",
    base: "oklch(0.9 0.05 55)",
    blobs: [
      { color: "oklch(0.84 0.12 45)", x: 22, y: 20, size: 64 },
      { color: "oklch(0.8 0.13 25)", x: 78, y: 35, size: 58 },
      { color: "oklch(0.82 0.11 350)", x: 42, y: 78, size: 52 },
      { color: "oklch(0.92 0.07 60 / 0.65)", x: 55, y: 48, size: 36, soft: 0.42 },
    ],
    wash: "linear-gradient(130deg, oklch(0.86 0.09 50 / 0.4), transparent 55%, oklch(0.88 0.08 20 / 0.35))",
  },
  "emerald-veil": {
    key: "emerald-veil",
    label: "Emerald veil",
    base: "oklch(0.88 0.05 160)",
    blobs: [
      { color: "oklch(0.8 0.12 160)", x: 20, y: 25, size: 66 },
      { color: "oklch(0.82 0.11 140)", x: 75, y: 30, size: 58 },
      { color: "oklch(0.84 0.1 185)", x: 48, y: 78, size: 52 },
      { color: "oklch(0.9 0.07 155 / 0.65)", x: 52, y: 48, size: 36, soft: 0.42 },
    ],
    wash: "linear-gradient(145deg, oklch(0.84 0.09 160 / 0.4), transparent 55%, oklch(0.88 0.08 140 / 0.3))",
  },
  "lavender-pulse": {
    key: "lavender-pulse",
    label: "Lavender pulse",
    base: "oklch(0.88 0.05 295)",
    blobs: [
      { color: "oklch(0.8 0.12 295)", x: 22, y: 22, size: 66 },
      { color: "oklch(0.82 0.11 270)", x: 78, y: 32, size: 58 },
      { color: "oklch(0.84 0.1 320)", x: 45, y: 78, size: 52 },
      { color: "oklch(0.9 0.08 285 / 0.65)", x: 50, y: 48, size: 36, soft: 0.42 },
    ],
    wash: "linear-gradient(140deg, oklch(0.84 0.09 295 / 0.4), transparent 55%, oklch(0.88 0.08 270 / 0.35))",
  },
  "sapphire-mist": {
    key: "sapphire-mist",
    label: "Sapphire mist",
    base: "oklch(0.86 0.05 250)",
    blobs: [
      { color: "oklch(0.76 0.14 250)", x: 18, y: 24, size: 70 },
      { color: "oklch(0.8 0.12 220)", x: 76, y: 28, size: 60 },
      { color: "oklch(0.82 0.11 280)", x: 48, y: 78, size: 54 },
      { color: "oklch(0.9 0.08 240 / 0.7)", x: 50, y: 48, size: 38, soft: 0.4 },
    ],
    wash: "linear-gradient(150deg, oklch(0.8 0.1 250 / 0.4), transparent 55%, oklch(0.86 0.09 220 / 0.35))",
  },
};

export function isClassCardGradientKey(
  value: string | null | undefined
): value is ClassCardGradientKey {
  return (
    typeof value === "string" &&
    (CLASS_CARD_GRADIENT_KEYS as readonly string[]).includes(value)
  );
}

export function normalizeClassCardGradientKey(
  value: string | null | undefined
): ClassCardGradientKey {
  return isClassCardGradientKey(value) ? value : DEFAULT_CLASS_CARD_GRADIENT;
}

/** FNV-1a 32-bit — stable across JS runtimes. */
export function hashStringToSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic pick from the directory (same seed → same key). */
export function pickClassCardGradientKey(seed: string): ClassCardGradientKey {
  const index =
    hashStringToSeed(seed) % CLASS_CARD_GRADIENT_KEYS.length;
  return CLASS_CARD_GRADIENT_KEYS[index]!;
}
