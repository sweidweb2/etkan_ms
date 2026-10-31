import { SITE } from "@/lib/config/site";
import { CONTACT } from "@/lib/constants/contact";
import { absoluteUrl } from "@/lib/seo/absolute-url";
import { PAGE_SEO } from "@/lib/seo/page-seo";

export type JsonLdObject = Record<string, unknown>;

export type BreadcrumbItem = {
  name: string;
  path: string;
};

export function buildOrganizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE.name,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.png"),
    description: PAGE_SEO.home.description,
    ...(SITE.sameAs.length > 0 ? { sameAs: [...SITE.sameAs] } : {}),
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        telephone: `+${CONTACT.whatsappE164}`,
        url: CONTACT.whatsappUrl,
        availableLanguage: ["en", "ar"],
      },
    ],
  };
}

export function buildWebSiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE.name,
    url: absoluteUrl("/"),
    description: PAGE_SEO.home.description,
    inLanguage: "en",
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      url: absoluteUrl("/"),
    },
  };
}

export function buildBreadcrumbJsonLd(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

type BlogPostingInput = {
  title: string;
  description: string;
  path: string;
  imageUrl?: string | null;
  authorName?: string | null;
  datePublished?: string | null;
  dateModified?: string | null;
};

export function buildBlogPostingJsonLd({
  title,
  description,
  path,
  imageUrl,
  authorName,
  datePublished,
  dateModified,
}: BlogPostingInput): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    url: absoluteUrl(path),
    mainEntityOfPage: absoluteUrl(path),
    inLanguage: "en",
    ...(imageUrl ? { image: [imageUrl] } : {}),
    ...(datePublished ? { datePublished } : {}),
    ...(dateModified || datePublished
      ? { dateModified: dateModified || datePublished }
      : {}),
    author: {
      "@type": "Person",
      name: authorName?.trim() || SITE.name,
    },
    publisher: {
      "@type": "Organization",
      name: SITE.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/icon.png"),
      },
    },
  };
}
