/**
 * Short unique display name for a gallery image (fits the 200-char name limit).
 */
export function generateGalleryImageName(): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 8)
      : Math.random().toString(36).slice(2, 10);

  return `gallery-${id}`;
}
