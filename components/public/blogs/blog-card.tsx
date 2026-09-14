import Link from "next/link";
import { ArrowUpRightIcon } from "lucide-react";
import { getBlogDetailRoute } from "@/lib/constants/routes";
import { cn } from "@/lib/utils";
import type { PublicBlogCard } from "@/types/public-blog";

function authorInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function formatBlogPublishedDate(
  isoDate: string | null,
  locale: string
): string {
  if (!isoDate) {
    return "";
  }
  const date = new Date(isoDate);
  return new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

type BlogCardLinkProps = {
  post: PublicBlogCard;
  readingLabel: string;
  className?: string;
};

export function BlogCardLink({
  post,
  readingLabel,
  className,
}: BlogCardLinkProps) {
  const primaryCategory = post.categories[0] ?? null;
  const published = formatBlogPublishedDate(post.published_at, "en");

  return (
    <Link
      href={getBlogDetailRoute(post.slug)}
      prefetch={false}
      className={cn("group flex flex-col gap-5 outline-none", className)}
    >
      <div className="relative aspect-[1.5] w-full overflow-hidden rounded-2xl bg-muted">
        {post.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumbnail_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        {primaryCategory ? (
          <p className="text-sm font-semibold text-primary">{primaryCategory}</p>
        ) : null}
        <div className="flex gap-4">
          <h3 className="flex-1 font-heading text-lg font-semibold tracking-tight text-balance group-hover:underline group-hover:underline-offset-4">
            {post.title}
          </h3>
          <ArrowUpRightIcon className="mt-0.5 size-5 shrink-0" aria-hidden />
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground sm:text-base">
          {post.summary}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {post.author_avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.author_avatar_url}
            alt=""
            className="size-8 rounded-full object-cover"
          />
        ) : (
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {authorInitials(post.author_name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{post.author_name}</p>
          <p className="text-sm text-muted-foreground">
            {[published, readingLabel].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
    </Link>
  );
}

export { authorInitials };
