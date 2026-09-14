"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import {
  BlogCardLink,
  authorInitials,
  formatBlogPublishedDate,
} from "@/components/public/blogs/blog-card";
import { sanitizeBlogHtml } from "@/lib/manager/blogs/sanitize-blog-html";
import { ROUTES } from "@/lib/constants/routes";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import type { PublicBlogCard, PublicBlogDetail } from "@/types/public-blog";

type BlogDetailSectionProps = {
  post: PublicBlogDetail;
  suggested: PublicBlogCard[];
};

export function BlogDetailSection({
  post,
  suggested,
}: BlogDetailSectionProps) {
  const { t, locale, dir } = usePublicI18n();
  const safeHtml = sanitizeBlogHtml(post.body_html);
  const reading = t("blogs.readMinutes").replace(
    "{minutes}",
    String(post.reading_time_minutes)
  );

  return (
    <article className="relative px-4 pt-28 pb-20 sm:px-6 sm:pb-28">
      <div className="mx-auto max-w-3xl">
        <Link
          href={ROUTES.BLOGS}
          prefetch={false}
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon
            className={dir === "rtl" ? "size-4 rotate-180" : "size-4"}
            aria-hidden
          />
          {t("blogs.detail.back")}
        </Link>

        {post.categories[0] ? (
          <p className="mt-8 text-xs font-extrabold tracking-[0.16em] text-primary uppercase">
            {post.categories[0]}
          </p>
        ) : null}

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
          {post.title}
        </h1>

        <p className="mt-4 text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg">
          {post.summary}
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-6 sm:gap-8">
          <div className="flex items-center gap-2.5">
            {post.author_avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.author_avatar_url}
                alt=""
                className="size-10 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold tracking-wide">
                {authorInitials(post.author_name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                {t("blogs.writtenBy")}
              </p>
              <p className="text-sm font-semibold">{post.author_name}</p>
            </div>
          </div>
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              {t("blogs.publishedOn")}
            </p>
            <p className="text-sm font-semibold">
              {[
                formatBlogPublishedDate(post.published_at, locale),
                reading,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        {post.categories.length > 0 ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {post.categories.map((category) => (
              <li
                key={category}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium"
              >
                {category}
              </li>
            ))}
          </ul>
        ) : null}

        {post.thumbnail_url ? (
          <div className="relative mt-10 aspect-[1.6] w-full overflow-hidden rounded-2xl bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.thumbnail_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
        ) : null}

        <div
          className="prose prose-neutral mt-10 max-w-none dark:prose-invert [&_a]:text-primary [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:my-3 [&_p]:leading-relaxed [&_ul]:my-4 [&_ul]:list-disc [&_ul]:ps-5"
          dangerouslySetInnerHTML={{ __html: safeHtml }}
        />

        {post.sources.length > 0 ? (
          <div className="mt-12 border-t pt-8">
            <h2 className="text-sm font-semibold tracking-wide uppercase">
              {t("blogs.detail.sources")}
            </h2>
            <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
              {post.sources.map((source) => (
                <li key={source}>{source}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      {suggested.length > 0 ? (
        <div className="mx-auto mt-16 max-w-7xl">
          <h2 className="mb-8 text-xl font-semibold tracking-tight">
            {t("blogs.detail.suggested")}
          </h2>
          <ul className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {suggested.map((item) => (
              <li key={item.id}>
                <BlogCardLink
                  post={item}
                  readingLabel={t("blogs.readMinutes").replace(
                    "{minutes}",
                    String(item.reading_time_minutes)
                  )}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
