"use client";

import Image from "next/image";
import Link from "next/link";
import {
  LIFE_BLOG_FILTER_LABEL_KEYS,
  type LifeBlogCard,
} from "@/lib/constants/public-life-blogs";
import { getLifeBlogDetailRoute } from "@/lib/constants/routes";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { cn } from "@/lib/utils";

const IMAGE_SIZES = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw";

type LifeBlogCardLinkProps = {
  post: LifeBlogCard;
  className?: string;
  priority?: boolean;
};

export function LifeBlogCardLink({
  post,
  className,
  priority = false,
}: LifeBlogCardLinkProps) {
  const { t } = usePublicI18n();

  return (
    <Link
      href={getLifeBlogDetailRoute(post.id)}
      suppressHydrationWarning
      className={cn(
        "group flex h-full min-w-0 flex-col gap-2.5 outline-none transition-transform duration-300 ease-out",
        "hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#3E3E75]/40 focus-visible:ring-offset-2",
        className
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-xl">
        <Image
          src={post.imageSrc}
          alt={t(post.imageAltKey)}
          fill
          sizes={IMAGE_SIZES}
          priority={priority}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
        />
      </div>

      <p
        className="text-xs font-extrabold tracking-[0.16em] text-[#3E3E75] uppercase transition-colors duration-300 group-hover:text-[#2F2F5A] dark:text-[#C4C4E8] dark:group-hover:text-white"
        suppressHydrationWarning
      >
        {t(LIFE_BLOG_FILTER_LABEL_KEYS[post.category])}
      </p>

      <h3
        className="min-w-0 overflow-hidden text-base font-semibold tracking-tight text-ellipsis whitespace-nowrap transition-colors duration-300 group-hover:text-[#3E3E75] sm:text-lg dark:group-hover:text-[#C4C4E8]"
        title={t(post.titleKey)}
        suppressHydrationWarning
      >
        {t(post.titleKey)}
      </h3>

      <p
        className="line-clamp-2 text-sm leading-relaxed text-muted-foreground text-pretty"
        suppressHydrationWarning
      >
        {t(post.excerptKey)}
      </p>

      <div className="mt-auto flex items-center gap-2.5 pt-0.5">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#3E3E75]/10 text-[0.7rem] font-semibold tracking-wide text-[#3E3E75] transition-colors duration-300 group-hover:bg-[#3E3E75]/15 dark:bg-[#C4C4E8]/15 dark:text-[#C4C4E8]"
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
          <p className="truncate text-sm font-medium" suppressHydrationWarning>
            {t(post.authorNameKey)}
          </p>
        </div>
      </div>
    </Link>
  );
}
