# Locale SEO decision (P2.1 / P2.2)

**Date:** 2026-10-25  
**Decision:** Keep **cookie-based EN/AR** (no `/ar/...` path locales, no hreflang).

## Why

- Public marketing uses ISR (`force-static` + `revalidate = 600`). Reading the locale cookie in those layouts would dynamize every public page.
- Path-based locales (`/ar/about`) would be a large routing + content duplication project.
- Current product UX already switches copy client-side via `PublicI18nProvider`.

## Crawl / AI implications

- Root `<html lang="en">` remains the **server HTML default** for crawlers that do not run JS.
- After hydration, `PublicI18nProvider` syncs `document.documentElement.lang` / `dir` (and `locale-ar` class) for accessibility and client tools.
- JSON-LD `inLanguage` stays `"en"` for public pages until distinct Arabic URLs exist.
- Do **not** emit `hreflang` until each locale has its own URL.

## Revisit when

- Arabic becomes a primary ranking market, **and**
- You are ready to ship path locales (or subdomain) with translated metadata + sitemap alternates.
