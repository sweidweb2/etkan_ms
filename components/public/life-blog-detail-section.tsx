"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { LifeBlogCardLink } from "@/components/public/life-blog-card";
import {
  getSuggestedLifeBlogs,
  LIFE_BLOG_FILTER_LABEL_KEYS,
  type LifeBlogCard,
} from "@/lib/constants/public-life-blogs";
import { ROUTES } from "@/lib/constants/routes";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";

const HERO_SIZES = "(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 960px";

type LifeBlogDetailSectionProps = {
  post: LifeBlogCard;
};

function formatPublishedDate(isoDate: string, locale: string) {
  const date = new Date(`${isoDate}T12:00:00`);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function LifeBlogDetailSection({ post }: LifeBlogDetailSectionProps) {
  const { t, locale, dir } = usePublicI18n();
  const suggested = getSuggestedLifeBlogs(post.id, 4);

  return (
    <article className="relative px-4 pt-28 pb-20 sm:px-6 sm:pb-28">
      <div className="mx-auto max-w-3xl">
        <Link
          href={ROUTES.LIFE}
          suppressHydrationWarning
          className="inline-flex items-center gap-2 text-sm font-medium text-[#3E3E75] transition-colors hover:text-[#2F2F5A] dark:text-[#C4C4E8] dark:hover:text-white"
        >
          <ArrowLeftIcon
            className={dir === "rtl" ? "size-4 rotate-180" : "size-4"}
            aria-hidden="true"
          />
          {t("life.detail.back")}
        </Link>

        <p
          className="mt-8 text-xs font-extrabold tracking-[0.16em] text-[#3E3E75] uppercase dark:text-[#C4C4E8]"
          suppressHydrationWarning
        >
          {t(LIFE_BLOG_FILTER_LABEL_KEYS[post.category])}
        </p>

        <h1
          className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]"
          suppressHydrationWarning
        >
          {t(post.titleKey)}
        </h1>

        <p
          className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg"
          suppressHydrationWarning
        >
          {t(post.excerptKey)}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#3E3E75]/10 text-xs font-semibold tracking-wide text-[#3E3E75] dark:bg-[#C4C4E8]/15 dark:text-[#C4C4E8]"
            >
              {post.authorInitials}
            </span>
            <div className="min-w-0">
              <p
                className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
                suppressHydrationWarning
              >
                {t("life.writtenBy")}
              </p>
              <p className="text-sm font-medium" suppressHydrationWarning>
                {t(post.authorNameKey)}
              </p>
            </div>
          </div>

          <div>
            <p
              className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase"
              suppressHydrationWarning
            >
              {t("life.published")}
            </p>
            <time
              dateTime={post.publishedAt}
              className="mt-0.5 block text-sm font-medium"
              suppressHydrationWarning
            >
              {formatPublishedDate(post.publishedAt, locale)}
            </time>
          </div>
        </div>

        <div className="relative mt-10 aspect-[16/9] overflow-hidden rounded-2xl sm:mt-12">
          <Image
            src={post.imageSrc}
            alt={t(post.imageAltKey)}
            fill
            priority
            sizes={HERO_SIZES}
            className="object-cover"
          />
        </div>

        <div className="mt-10 space-y-5 text-base leading-relaxed text-foreground/90 text-pretty sm:mt-12 sm:text-lg sm:leading-relaxed">
          {post.bodyKeys.map((key) => (
            <p key={key} suppressHydrationWarning>
              {t(key)}
            </p>
          ))}
        </div>
      </div>

      {suggested.length > 0 ? (
        <section className="mx-auto mt-16 max-w-7xl sm:mt-20">
          <h2
            className="text-2xl font-semibold tracking-tight sm:text-3xl"
            suppressHydrationWarning
          >
            {t("life.detail.suggested")}
          </h2>
          <ul
            className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-6"
            aria-label={t("life.detail.suggestedListLabel")}
          >
            {suggested.map((item) => (
              <li key={item.id} className="min-w-0">
                <LifeBlogCardLink post={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
