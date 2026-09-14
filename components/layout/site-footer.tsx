"use client";

import Link from "next/link";
import { AppLogo } from "@/components/brand/app-logo";
import { usePublicI18n } from "@/lib/i18n/public-i18n-provider";
import { ROUTES } from "@/lib/constants/routes";

const FOOTER_LINKS = [
  { href: ROUTES.HOME, labelKey: "nav.home" as const },
  { href: ROUTES.ABOUT, labelKey: "nav.about" as const },
  { href: ROUTES.CAREERS, labelKey: "nav.careers" as const },
  { href: ROUTES.PROJECTS, labelKey: "nav.projects" as const },
  { href: ROUTES.GALLERY, labelKey: "nav.gallery" as const },
  { href: ROUTES.BLOGS, labelKey: "nav.blogs" as const },
  { href: ROUTES.LIFE, labelKey: "nav.life" as const },
  { href: ROUTES.REGISTER, labelKey: "nav.register" as const },
];

const linkClassName =
  "text-sm text-muted-foreground transition-colors hover:text-foreground";
const authLinkClassName =
  "text-xs text-muted-foreground transition-colors hover:text-foreground";

export function SiteFooter() {
  const { t } = usePublicI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-white text-foreground dark:bg-white">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Link href={ROUTES.HOME} aria-label={t("brand.name")}>
              <AppLogo height={30} />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">
              {t("footer.tagline")}
            </p>
          </div>

          <nav
            className="flex flex-wrap gap-x-6 gap-y-2"
            aria-label={t("footer.navLabel")}
          >
            {FOOTER_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                suppressHydrationWarning
                className={linkClassName}
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-2 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            {t("footer.copyright").replace("{year}", String(year))}
          </p>
          <div className="flex gap-4">
            <Link
              href={ROUTES.LOGIN}
              suppressHydrationWarning
              className={authLinkClassName}
            >
              {t("nav.login")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
