/** Hex tokens for email HTML (clients do not support CSS variables). */
export const EMAIL_BRAND = {
  brand: "#3E3E75",
  brandDeep: "#2F2F5A",
  brandMid: "#4A4A86",
  onBrand: "#FFFFFF",
  pageBg: "#F8F8FC",
  cardBg: "#FFFFFF",
  border: "#EEEEF4",
  text: "#111827",
  muted: "#6b7280",
  bodyText: "#1f2937",
} as const;

/**
 * Email-safe pattern for header/footer bars (CSS only — no external images).
 * Soft diagonal stripes + light dots over brand indigo.
 */
export function emailBrandBarBackground(): string {
  return [
    `linear-gradient(135deg, ${EMAIL_BRAND.brandDeep} 0%, ${EMAIL_BRAND.brand} 48%, ${EMAIL_BRAND.brandMid} 100%)`,
    "repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0 2px, transparent 2px 10px)",
    "radial-gradient(circle at 12% 30%, rgba(255,255,255,0.14) 0 1px, transparent 1.5px)",
    "radial-gradient(circle at 78% 70%, rgba(255,255,255,0.1) 0 1px, transparent 1.5px)",
  ].join(", ");
}
