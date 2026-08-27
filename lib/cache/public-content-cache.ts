import { revalidatePath, revalidateTag } from "next/cache";
import { ROUTES } from "@/lib/constants/routes";

/** Shared public marketing lists — keep in sync with docs caching inventory. */
export const PUBLIC_CONTENT_CACHE_TAGS = {
  GALLERY: "public-gallery",
  PROJECTS: "public-projects",
} as const;

const REVALIDATE_PROFILE = "max" as const;

export function revalidatePublicGallery(): void {
  revalidateTag(PUBLIC_CONTENT_CACHE_TAGS.GALLERY, REVALIDATE_PROFILE);
  revalidatePath(ROUTES.GALLERY);
  revalidatePath(ROUTES.ABOUT);
}

export function revalidatePublicProjects(): void {
  revalidateTag(PUBLIC_CONTENT_CACHE_TAGS.PROJECTS, REVALIDATE_PROFILE);
  revalidatePath(ROUTES.PROJECTS);
}
