import { PAGE_SEO } from "@/lib/seo/page-seo";
import {
  buildOgImageResponse,
  OG_CONTENT_TYPE,
  OG_SIZE,
} from "@/lib/seo/og-image";

export const alt = PAGE_SEO.about.title;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return buildOgImageResponse({
    title: PAGE_SEO.about.title,
    description: PAGE_SEO.about.description,
  });
}
