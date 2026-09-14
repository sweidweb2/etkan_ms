"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRightIcon } from "lucide-react";
import {
  BlogCardLink,
  authorInitials,
  formatBlogPublishedDate,
} from "@/components/public/blogs/blog-card";
import { Button } from "@/components/ui/button";
import { PUBLIC_BLOGS_PAGE_SIZE } from "@/lib/constants/manager-blog";
import { getBlogDetailRoute } from "@/lib/constants/routes";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";
import type { PublicBlogCard } from "@/types/public-blog";

type BlogsSectionProps = {
  posts: PublicBlogCard[];
};

export function BlogsSection({ posts }: BlogsSectionProps) {
  const { t, locale } = usePublicI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoryParam = searchParams.get("category")?.trim() || null;
  const pageParam = Number(searchParams.get("page") ?? "1");
  const currentPage =
    Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const post of posts) {
      for (const category of post.categories) {
        if (category.trim()) {
          set.add(category.trim());
        }
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [posts]);

  const featured =
    posts.find((post) => post.is_featured) ?? posts[0] ?? null;

  const gridPosts = useMemo(() => {
    if (categoryParam) {
      return posts.filter((post) => post.categories.includes(categoryParam));
    }
    return posts.filter((post) => !featured || post.id !== featured.id);
  }, [posts, categoryParam, featured]);

  const totalPages = Math.max(
    1,
    Math.ceil(gridPosts.length / PUBLIC_BLOGS_PAGE_SIZE)
  );
  const page = Math.min(currentPage, totalPages);
  const pagePosts = gridPosts.slice(
    (page - 1) * PUBLIC_BLOGS_PAGE_SIZE,
    page * PUBLIC_BLOGS_PAGE_SIZE
  );

  function formatReading(minutes: number) {
    return t("blogs.readMinutes").replace("{minutes}", String(minutes));
  }

  function setParams(next: { category?: string | null; page?: number }) {
    const params = new URLSearchParams(searchParams.toString());
    if ("category" in next) {
      if (!next.category) {
        params.delete("category");
      } else {
        params.set("category", next.category);
      }
    }
    if (next.page !== undefined) {
      if (next.page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(next.page));
      }
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10 lg:py-20">
      <div className="mb-10 max-w-3xl sm:mb-12">
        <h1 className="font-heading text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
          {t("blogs.title")}
        </h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          {t("blogs.lead")}
        </p>
      </div>

      <div className="flex flex-col gap-12 md:gap-16">
        {featured && !categoryParam ? (
          <>
            <Link
              href={getBlogDetailRoute(featured.slug)}
              prefetch={false}
              className="relative hidden w-full overflow-hidden rounded-2xl focus-visible:outline-none md:block md:h-[28rem] lg:h-[36rem]"
            >
              {featured.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={featured.thumbnail_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-muted" />
              )}
              <div className="absolute inset-x-0 bottom-0 w-full bg-gradient-to-t from-black/60 to-transparent pt-24">
                <div className="flex w-full flex-col gap-6 p-6 lg:p-8">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-4">
                      <p className="flex-1 font-heading text-xl font-semibold text-white text-balance lg:text-2xl">
                        {featured.title}
                      </p>
                      <ArrowUpRightIcon className="size-6 shrink-0 text-white" />
                    </div>
                    <p className="line-clamp-2 text-sm text-white/90 sm:text-base">
                      {featured.summary}
                    </p>
                  </div>
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="flex flex-1 flex-col gap-6 sm:flex-row sm:gap-8">
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-white">
                          {t("blogs.writtenBy")}
                        </p>
                        <div className="flex items-center gap-2">
                          {featured.author_avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={featured.author_avatar_url}
                              alt=""
                              className="size-10 rounded-full object-cover ring-1 ring-white/40"
                            />
                          ) : (
                            <span className="inline-flex size-10 items-center justify-center rounded-full bg-white/20 text-xs font-semibold text-white ring-1 ring-white/40">
                              {authorInitials(featured.author_name)}
                            </span>
                          )}
                          <p className="text-sm font-semibold text-white">
                            {featured.author_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-white">
                          {t("blogs.publishedOn")}
                        </p>
                        <div className="flex h-10 items-center">
                          <p className="text-sm font-semibold text-white sm:text-base">
                            {formatBlogPublishedDate(
                              featured.published_at,
                              locale
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    {featured.categories.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-semibold text-white">
                          {t("blogs.fileUnder")}
                        </p>
                        <ul className="flex min-h-10 flex-wrap items-center gap-2">
                          {featured.categories.map((category) => (
                            <li
                              key={category}
                              className="rounded-full px-2 py-0.5 text-xs font-medium text-white ring-1 ring-white ring-inset"
                            >
                              {category}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </Link>

            <div className="md:hidden">
              <BlogCardLink
                post={featured}
                readingLabel={formatReading(featured.reading_time_minutes)}
              />
            </div>
          </>
        ) : null}

        <div className="flex w-full flex-col items-center gap-8">
          <div
            className="inline-flex h-auto w-fit max-w-full flex-wrap justify-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground"
            role="tablist"
            aria-label={t("blogs.title")}
          >
            <button
              type="button"
              role="tab"
              aria-selected={!categoryParam}
              className={cn(
                "h-9 flex-none rounded-md px-3 text-sm font-medium sm:px-3.5",
                !categoryParam
                  ? "bg-background text-foreground shadow-sm"
                  : "text-foreground/60 hover:text-foreground"
              )}
              onClick={() => setParams({ category: null, page: 1 })}
            >
              {t("blogs.viewAll")}
            </button>
            {categories.map((category) => {
              const selected = categoryParam === category;
              return (
                <button
                  key={category}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  className={cn(
                    "h-9 flex-none rounded-md px-3 text-sm font-medium sm:px-3.5",
                    selected
                      ? "bg-background text-foreground shadow-sm"
                      : "text-foreground/60 hover:text-foreground"
                  )}
                  onClick={() => setParams({ category, page: 1 })}
                >
                  {category}
                </button>
              );
            })}
          </div>

          {pagePosts.length === 0 ? (
            <p className="text-muted-foreground">{t("blogs.empty")}</p>
          ) : (
            <ul className="grid w-full gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-12">
              {pagePosts.map((post) => (
                <li key={post.id}>
                  <BlogCardLink
                    post={post}
                    readingLabel={formatReading(post.reading_time_minutes)}
                  />
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 ? (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1}
                onClick={() => setParams({ page: page - 1 })}
              >
                {t("blogs.prevPage")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("blogs.pageOf")} {page} {t("blogs.pageOfJoin")} {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages}
                onClick={() => setParams({ page: page + 1 })}
              >
                {t("blogs.nextPage")}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
