# Etkan — SEO / AEO / GEO / AIO / SXO audit

**Date:** 2026-10-24  
**Scope:** Public marketing surface for **Etkan** (`etkan.org` / `NEXT_PUBLIC_SITE_URL`), plus crawl hygiene for authenticated **Etkan MS** panels.  
**Out of scope for ranking work:** Panel CRUD, RBAC, and private invite URLs (except `noindex` / exclusion rules).  
**Stack context:** Next.js App Router, ISR (`revalidate = 600` on `(public)`), custom EN/AR cookie locale (not path-based), Supabase CMS for blogs / projects / gallery.

---

## 1. Executive summary

Etkan has a solid **technical foundation** for discovery (static/ISR public routes, blog `generateMetadata`, brand OG image, `metadataBase`), but it is **not yet professionally covered** across SEO, answer engines, generative citation, AI crawlers, or post-click experience.

| Pillar | Meaning | Current maturity | Priority |
|--------|---------|------------------|----------|
| **SEO** | Classic search ranking (Google / Bing) | Thin — root metadata only; no sitemap/robots; almost no per-page meta | P0 |
| **AEO** | Answer Engine Optimization (snippets, PAA, AI Overviews, voice) | Missing — no FAQ/HowTo schema, weak answer blocks | P1 |
| **GEO** | Generative Engine Optimization (ChatGPT, Perplexity, Gemini, Copilot citations) | Missing — no entity clarity, no quotable facts, no `llms.txt` | P1 |
| **AIO** | AI Optimization (machine-readable site for AI agents + AI Overviews) | Missing — no JSON-LD, no AI crawler policy, thin brand description | P1 |
| **SXO** | Search Experience Optimization (SEO × UX × conversion) | Partial — strong public UI, but crawl/UX mismatches (`/life`, signup flags, thin intent meta) | P0–P1 |

**Bottom line:** Implement crawl controls + page metadata + Organization/WebSite/BlogPosting schema first. Then deepen answer-ready content, entity pages, and conversion/SXO fixes. Without those, blogs and careers content will underperform in both classic SERPs and AI answers.

---

## 2. Glossary (how these pillars relate)

```text
                 ┌──────────── SEO ────────────┐
                 │  crawl · index · rank       │
                 └──────────────┬──────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         ▼                      ▼                      ▼
      ┌─────┐               ┌─────┐                ┌─────┐
      │ AEO │  direct       │ GEO │  cited in      │ AIO │  readable
      │     │  answers      │     │  gen. answers  │     │  by AI systems
      └─────┘               └─────┘                └─────┘
                                │
                                ▼
                           ┌─────────┐
                           │   SXO   │  after the click:
                           │         │  clarity · speed · trust · convert
                           └─────────┘
```

- **SEO** gets you into the index and onto the SERP.
- **AEO** makes you the *answer* (featured snippet / overview / voice).
- **GEO** makes generative tools *cite and recommend* you.
- **AIO** makes your site *structured and policy-clear* for AI systems (schema, entities, `llms.txt`, crawler rules).
- **SXO** makes the visit worth ranking for (intent match, speed, trust, conversion).

They share infrastructure (metadata, schema, content quality, Core Web Vitals). Treat them as one program with five outcome lenses — not five separate projects.

---

## 3. Current state (codebase inventory)

### 3.1 What exists

| Capability | Where | Notes |
|------------|-------|-------|
| Root metadata + OG/Twitter | `app/layout.tsx` | Title template `%s \| Etkan`; description from `SITE.description` |
| Site config / absolute URL | `lib/config/site.ts` | `SITE.name`, `getSiteUrl()` |
| Default OG image | `app/opengraph-image.png` | Brand asset via `scripts/generate-brand-assets.ts` |
| Icons | `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png` | Present |
| Blog `generateMetadata` | `app/(public)/blogs/[slug]/page.tsx` | Uses `meta_title` / `meta_description` / thumbnail |
| Blog CMS SEO fields | Manager blog forms + validators | Optional meta title/description |
| Public ISR | `app/(public)/layout.tsx` | `force-static` + `revalidate = 600` |
| Marketing cache headers | `next.config.ts` | Home, about, blogs, careers, gallery, projects, register, maintenance |
| EN/AR copy | `lib/i18n/messages/{en,ar}.ts` | On-page only; not metadata |

### 3.2 What is missing

| Capability | Status |
|------------|--------|
| `app/sitemap.ts` / `sitemap.xml` | Absent |
| `app/robots.ts` / `robots.txt` | Absent |
| JSON-LD / schema.org | Absent |
| `alternates.canonical` / hreflang | Absent |
| Per-page metadata (home, about, careers, projects, gallery, register, blogs index) | Absent (inherit root) |
| Panel / private URL `robots: noindex` | Absent |
| `manifest.webmanifest` | Absent |
| `llms.txt` / AI crawler guidance | Absent |
| Search Console / Bing / analytics wiring in app | Not found |
| FAQ / HowTo / Course / Breadcrumb structured data | Absent |

### 3.3 Indexable vs non-indexable surfaces

**Should be indexable (marketing)**

| URL | File | SEO role |
|-----|------|----------|
| `/` | `app/(public)/page.tsx` | Brand + primary intent |
| `/about` | `app/(public)/about/page.tsx` | Entity / trust |
| `/careers` | `app/(public)/careers/page.tsx` | Program discovery |
| `/careers/roadmap/[id]` | `app/(public)/careers/roadmap/[id]/page.tsx` | Long-tail career intents |
| `/projects` | `app/(public)/projects/page.tsx` | Proof / portfolio |
| `/gallery` | `app/(public)/gallery/page.tsx` | Visual proof |
| `/blogs` | `app/(public)/blogs/page.tsx` | Content hub |
| `/blogs/[slug]` | `app/(public)/blogs/[slug]/page.tsx` | Highest SEO leverage |
| `/register` | `app/(public)/register/page.tsx` | Conversion (SXO) — index with clear intent meta |

**Should be noindex / excluded from sitemap**

| URL | Reason |
|-----|--------|
| `/auth/login`, `/auth/signup`, `/auth/callback` | Auth utility |
| `/admin/*`, `/manager/*`, `/co-manager/*`, `/ceo/*`, `/supervisor/*`, `/crm/*`, `/teacher/*`, `/student/*` | Authenticated panels |
| `/register/guest/[token]`, `/f/[token]` | Private invites |
| `/maintenance` | Transient |
| `/life`, `/life/[id]` | Admin-gated but footer-linked — treat as non-public for SEO |

---

## 4. Pillar audits

### 4.1 SEO — Search Engine Optimization

#### Findings

1. **No crawl map.** Without `sitemap.xml` and `robots.txt`, Google/Bing must discover URLs only via links; panels/token routes are not explicitly disallowed.
2. **Generic global description.** `SITE.description = "School management system"` under-sells the public brand (learning path, workshops, careers) and is reused on every page that lacks its own meta.
3. **Almost no page-level metadata.** Only blog detail implements `generateMetadata`. Home/about/careers/projects/gallery/register/blogs index inherit root title/description.
4. **Canonical / host hygiene missing.** Deploy docs reference Hostinger/VPS; without `alternates.canonical` + correct `NEXT_PUBLIC_SITE_URL`, staging/prod duplicates are a risk.
5. **Blog metadata incomplete.** No canonical URL, no `og:type: "article"`, no published/modified times, no author; title may double-suffix brand (`title: \`${title} | ${SITE.name}\`` **and** root template `%s | Etkan`).
6. **`<html lang="en">` fixed** while AR is applied client-side on a wrapper — crawlers that only trust `<html lang>` miss Arabic semantics. No path locales → no hreflang pairs.
7. **Panels not noindexed** at metadata layer (auth redirects alone are not a substitute for `noindex` if URLs ever leak or get linked).
8. **Possible crawlable junk under `public/`** (e.g. `public/data_db/*` if deployed) — security and SEO hygiene issue.

#### What to cover (SEO checklist)

| Area | Cover |
|------|-------|
| Crawl | `robots.ts`, `sitemap.ts`, Search Console + Bing Webmaster |
| Index control | `noindex` on auth, panels, tokens, maintenance, `/life` |
| Metadata | Unique title (≤60 chars intent), description (≤155), OG/Twitter per public page |
| Canonical | Self-referencing canonical on every indexable URL |
| Content | Unique H1, logical H2/H3, internal links, blog topical clusters |
| Technical | Status codes, HTTPS, soft-404 avoidance, ISR freshness, Core Web Vitals |
| Images | `alt`, descriptive filenames, OG images per major page/blog |
| Multilingual | Decide: cookie-only (document limitation) **or** path locales + hreflang |
| Hygiene | Block staging; exclude `public` dumps; remove footer links to gated pages |

#### Where to implement (SEO)

| Work | Primary location |
|------|------------------|
| `robots.txt` | **New** `app/robots.ts` — allow `/`, disallow panel + token prefixes; point to sitemap |
| `sitemap.xml` | **New** `app/sitemap.ts` — static routes + dynamic blogs/projects/careers roadmap IDs from services |
| Site-wide SEO constants | **New** `lib/seo/site-seo.ts` (or extend `lib/config/site.ts`) — default titles/descriptions, org NAP if applicable |
| Root metadata hardening | `app/layout.tsx` — richer default description, `robots` defaults, `alternates` |
| Per-page metadata | Each public `page.tsx` under `app/(public)/` — export `metadata` or `generateMetadata` |
| Blog metadata fix | `app/(public)/blogs/[slug]/page.tsx` — use bare `title` (let template append brand once); add `alternates.canonical`, `openGraph.type: "article"`, dates |
| Panel noindex | `app/(panels)/layout.tsx` → `robots: { index: false, follow: false }` |
| Private invites noindex | `register/guest/[token]/page.tsx`, `f/[token]/page.tsx`, `auth/*`, `maintenance` |
| `/life` policy | Remove from public footer **or** open to public; until then `noindex` + drop from sitemap |
| Canonical host | Ensure prod `NEXT_PUBLIC_SITE_URL`; document in `docs/[14] Deploy` |
| Internal linking | Public nav/footer (`components/layout/*`), blog suggested posts (already partial) |
| CMS SEO QA | Manager blog form — require meta fields for publish, character counters (fields already exist) |

---

### 4.2 AEO — Answer Engine Optimization

**Goal:** Be the extractable answer for questions like “What is Etkan?”, “How do Etkan career roadmaps work?”, “How to register for Etkan workshops?”

#### Findings

1. Marketing pages have narrative UI copy but **no dedicated answer blocks** (short definition paragraphs, FAQ sections with clear Q→A).
2. **No FAQPage / HowTo / Speakable** schema — primary AEO signals for rich results and AI Overviews.
3. Careers roadmaps are strong AEO candidates but lack **question-shaped headings** and summary answers at the top of each stage page.
4. Blog posts may answer well in body HTML, but without **TL;DR / key takeaways** and Article schema, extractors under-use them.
5. No visible **People Also Ask** style FAQ on about/register/careers.

#### What to cover (AEO checklist)

| Area | Cover |
|------|-------|
| Answer-first copy | 40–60 word definition near top of home/about |
| FAQ blocks | 5–10 real questions per key page (register, careers, about) |
| Schema | `FAQPage`, optionally `HowTo` for registration steps |
| Heading shape | H2s as questions where natural (“How does registration work?”) |
| Lists & tables | Steps, comparisons, roadmap stages as structured lists |
| Freshness | Visible updated dates on blogs and program pages |
| Multilingual answers | EN + AR FAQ pairs if Arabic is a target market |

#### Where to implement (AEO)

| Work | Primary location |
|------|------------------|
| Home answer blurb | Home marketing sections under `components/public/` + i18n messages |
| About FAQ | `app/(public)/about/page.tsx` + about section components |
| Careers FAQ + stage summaries | `app/(public)/careers/**` + `lib/constants/careers-roadmaps.ts` |
| Register HowTo | `app/(public)/register/page.tsx` — steps already in wizard; expose a static summary + FAQ above/beside form |
| Blog TL;DR | `components/public/blogs/blog-detail-section.tsx` — optional summary callout from `summary` field |
| FAQ JSON-LD helper | **New** `lib/seo/json-ld.ts` + **New** `components/seo/json-ld.tsx` — render `<script type="application/ld+json">` |
| Content ops | Manager blogging guidelines: open with direct answer; use H2 questions |

---

### 4.3 GEO — Generative Engine Optimization

**Goal:** Be cited by ChatGPT, Perplexity, Gemini, Copilot, and similar when users ask about Etkan, education paths, or related local/program queries.

#### Findings

1. Generative engines prefer **clear entities**, **quotable facts**, **consistent naming**, and **corroboration**. Today the public brand string is “Etkan” but root meta still says “School management system” (product vs brand mismatch).
2. No **Organization / EducationalOrganization** schema with official name, URL, logo, sameAs (social), and description.
3. No **authoritative “about” facts** block (what Etkan is, who it serves, what programs exist) in a crawler-stable HTML form.
4. No **`llms.txt`** (emerging convention) summarizing the site for LLM crawlers.
5. Thin third-party presence guidance — GEO improves when the same entity appears on Wikipedia/Wikidata, Google Business, LinkedIn, directories (off-site; document as ops work).
6. Blogs are the best citation surface but lack Article schema and clear authorship.

#### What to cover (GEO checklist)

| Area | Cover |
|------|-------|
| Entity consistency | One canonical name, description, and logo everywhere |
| Quotable facts | Stats, program list, founding/mission (only verifiable facts) |
| Schema entities | Organization + WebSite (+ EducationalOrganization if accurate) |
| Citable pages | About + blog explainers that answer “what/who/where/how” |
| `llms.txt` | Short map of public URLs + preferred citations |
| Off-site entity | Social `sameAs`, business profiles, NAP consistency |
| Avoid hallucination fuel | Don’t claim unverifiable rankings/accreditations |

#### Where to implement (GEO)

| Work | Primary location |
|------|------------------|
| Canonical brand copy | `lib/config/site.ts` — expand `description` / add `seoDescription`, `organization` fields |
| Organization JSON-LD | Root public layout or home: `app/(public)/layout.tsx` or `app/layout.tsx` via shared helper |
| About as entity page | `app/(public)/about/page.tsx` — fact list + services (already partially present) |
| `llms.txt` | **New** `public/llms.txt` (or route handler) listing public sections and contact |
| Blog authorship | Blog detail + schema `author` / `publisher` |
| sameAs links | Footer / about + schema — only real official profiles |
| Ops runbook | This doc §8 — Search Console, Bing, optional Perplexity/brand monitoring |

---

### 4.4 AIO — AI Optimization

**Goal:** Make the site unambiguously readable and policy-clear for AI systems (training/browsing crawlers, AI Overviews, agents), without leaking private product surfaces.

*Note: “AIO” here means AI-readiness of the site (structure, policy, entities), overlapping GEO/AEO. It is not a substitute for product AI features inside Etkan MS.*

#### Findings

1. **No machine-readable graph** of the site (JSON-LD graph: WebSite → Organization → WebPage → BlogPosting).
2. **No AI crawler policy** in robots (GPTBot, Google-Extended, anthropic-ai, PerplexityBot, etc.) — decide allow/deny explicitly; silence is ambiguous.
3. **No `llms.txt` / optional `llms-full.txt`** for preferred summary vs full corpus.
4. Cookie-based locale means **AI fetchers often see only default EN HTML** unless they execute client JS — Arabic AIO is weak without SSR locale or path locales.
5. Private data risk: ensure AI crawlers cannot reach panel or invite URLs (robots + noindex + auth).

#### What to cover (AIO checklist)

| Area | Cover |
|------|-------|
| Structured data graph | WebSite, Organization, WebPage, BreadcrumbList, BlogPosting |
| Crawler policy | Explicit robots rules per major AI bot (business decision) |
| `llms.txt` | Purpose, key URLs, contact, citation preference |
| Stable HTML content | Critical facts in server-rendered HTML, not only client state |
| Locale strategy | SSR `lang`/`dir` from cookie **or** `/ar` routes for AI/fetchers |
| Safety | Disallow panels/tokens; never put PII on public pages |
| Feed quality | Clean blog HTML (TipTap), headings, alt text |

#### Where to implement (AIO)

| Work | Primary location |
|------|------------------|
| JSON-LD utilities | **New** `lib/seo/json-ld.ts`, `components/seo/json-ld.tsx` |
| WebSite + Organization | `app/(public)/layout.tsx` |
| WebPage + Breadcrumbs | Each major public page / shared public chrome |
| BlogPosting | `app/(public)/blogs/[slug]/page.tsx` |
| AI robots policy | `app/robots.ts` — document chosen allow/deny list in this report when decided |
| `llms.txt` | `public/llms.txt` |
| HTML `lang` | Prefer setting `<html lang>` from locale in root layout (server), not only client wrapper |
| Manager content standards | TipTap: semantic headings, no empty H1s, image alts |

---

### 4.5 SXO — Search Experience Optimization

**Goal:** Visitors who arrive from search/AI should immediately understand where they are, trust the brand, and complete the intended action (learn more, explore careers, register).

#### Findings

1. **Intent mismatch risk:** Root meta describes a “school management system” while the public site sells an educational brand experience — SERP click → confused bounce.
2. **`/life` in footer but admin-only** — broken expectation for visitors and crawlers (trust + crawl waste).
3. **Public signup disabled** (`PUBLIC_SIGNUP_ENABLED = false`) while marketing/register CTAs may still imply open account creation — align CTA copy with `/register` (application) vs `/auth/signup`.
4. **Register** is conversion-critical but has no dedicated intent metadata or trust/FAQ support beside the wizard.
5. Performance/SXO: public ISR and cache headers help; keep Core Web Vitals strong (LCP image priorities, font strategy — Tajawal loaded via extra Google CSS in root layout; consider self-host / `next/font` for CWV).
6. No obvious **404 / soft-404** UX audit in this pass — ensure `not-found` is helpful with links back to hubs.
7. Social previews exist globally; major pages should get **page-specific OG** for share/SXO when links are pasted in chat apps (often how GEO traffic arrives).

#### What to cover (SXO checklist)

| Area | Cover |
|------|-------|
| SERP → page match | Title/description promise equals H1 and first viewport |
| Clear primary CTA | One main action per landing intent |
| Trust | About proof, projects, gallery, certificates, contact |
| Form UX | Register clarity, errors inline, toasts per project rules |
| Speed | LCP/INP/CLS on home, blogs, register |
| Navigation honesty | Don’t link public users to gated routes |
| Post-click paths | From blog → careers/register; from careers → register |
| Mobile | Thumb-friendly CTAs; readable AR/EN |

#### Where to implement (SXO)

| Work | Primary location |
|------|------------------|
| Align brand description | `lib/config/site.ts` + home/about copy in i18n |
| Footer `/life` fix | `components/layout/site-footer.tsx` |
| CTA alignment | Home/hero CTAs vs `ROUTES.REGISTER` / login |
| Register intent meta + trust | `app/(public)/register/page.tsx` + register components |
| OG per key page | `generateMetadata` / `opengraph-image` routes under each segment if needed |
| Fonts / LCP | `app/layout.tsx` — Tajawal loading strategy |
| Internal CTA components | Public section CTAs → careers, blogs, register |
| 404 helpfulness | `app/not-found.tsx` (or public equivalent) |

---

## 5. Cross-cutting implementation blueprint

Implement in layers so one change serves multiple pillars.

### Layer A — Crawl & index control (P0) → SEO + AIO + SXO hygiene

1. Add `app/robots.ts`
2. Add `app/sitemap.ts` (static + blogs + projects + career roadmap IDs)
3. `noindex` panels, auth, tokens, maintenance, `/life`
4. Confirm prod `NEXT_PUBLIC_SITE_URL`
5. Submit sitemap in Google Search Console + Bing Webmaster

### Layer B — Metadata system (P0) → SEO + SXO + GEO

1. Create `lib/seo/metadata.ts` helpers (`buildPageMetadata({ title, description, path, images, type })`)
2. Add page metadata for: `/`, `/about`, `/careers`, `/careers/roadmap/[id]`, `/projects`, `/gallery`, `/blogs`, `/register`
3. Fix blog `generateMetadata` (canonical, article OG, single brand suffix, dates)
4. Expand `SITE` marketing description (public) vs keep MS wording for panels only

### Layer C — Structured data (P0–P1) → SEO + AEO + GEO + AIO

1. `lib/seo/json-ld.ts` + `components/seo/json-ld.tsx`
2. Organization + WebSite on public layout
3. BlogPosting on blog detail
4. BreadcrumbList on detail pages
5. FAQPage where FAQ UI exists
6. Optional: EducationalOrganization / Course only if claims are accurate

### Layer D — Answer & entity content (P1) → AEO + GEO + SXO

1. About fact block + FAQ
2. Careers FAQ + stage lead answers
3. Register HowTo + FAQ
4. Blog TL;DR / key takeaways pattern
5. `public/llms.txt`

### Layer E — Locale & AI policy (P1–P2) → SEO + AIO + GEO

1. Decide cookie-only vs `/ar/...` path locales
2. If staying cookie-only: document SEO limitation; set server `lang` from cookie when possible
3. Explicit AI bot rules in `robots.ts`
4. Optional hreflang only if distinct locale URLs exist

### Layer F — Measurement & ops (P0 ongoing)

1. Search Console, Bing Webmaster
2. Analytics (privacy-aware) for landing + register funnel
3. Periodic crawl of sitemap vs live routes
4. Blog publish checklist (meta, H1, alt, internal link, FAQ opportunity)

---

## 6. Suggested file map (new + touch)

```text
app/
  robots.ts                          ← NEW (SEO/AIO)
  sitemap.ts                         ← NEW (SEO)
  layout.tsx                         ← harden root metadata; optional lang
  (public)/
    layout.tsx                       ← Organization/WebSite JSON-LD
    page.tsx                         ← home metadata
    about/page.tsx                   ← metadata + FAQ hook
    careers/page.tsx                 ← metadata
    careers/roadmap/[id]/page.tsx   ← generateMetadata
    projects/page.tsx                ← metadata
    gallery/page.tsx                 ← metadata
    blogs/page.tsx                   ← metadata
    blogs/[slug]/page.tsx           ← fix generateMetadata + BlogPosting
    register/page.tsx                ← metadata + HowTo/FAQ
  (panels)/layout.tsx                ← robots noindex

components/
  seo/json-ld.tsx                    ← NEW
  layout/site-footer.tsx             ← SXO: /life link policy

lib/
  config/site.ts                     ← richer public SEO description + org fields
  seo/
    metadata.ts                      ← NEW helpers
    json-ld.ts                       ← NEW builders
    constants.ts                     ← NEW page SEO copy map (en; ar later)

public/
  llms.txt                           ← NEW (GEO/AIO)
```

Keep panel brand (`Etkan MS`) out of public meta. Public brand remains **Etkan**.

---

## 7. Priority backlog (actionable)

### P0 — Foundation (do first)

- [ ] **P0.1** `app/robots.ts` — allow public marketing; disallow `/admin`, `/manager`, `/co-manager`, `/ceo`, `/supervisor`, `/crm`, `/teacher`, `/student`, `/auth`, `/f/`, `/register/guest`, `/life`, `/api`
- [ ] **P0.2** `app/sitemap.ts` — `/`, `/about`, `/careers`, roadmap IDs, `/projects`, `/gallery`, `/blogs`, published blog slugs, `/register`
- [ ] **P0.3** Panel + private `robots: { index: false, follow: false }`
- [ ] **P0.4** `lib/seo/metadata.ts` + page-level metadata for all indexable routes
- [ ] **P0.5** Fix blog metadata (canonical, article, dates, no double title suffix)
- [ ] **P0.6** Rewrite public `SITE` / home description for Etkan brand (not only “School management system”)
- [ ] **P0.7** Remove or noindex `/life` footer entry
- [ ] **P0.8** Verify `NEXT_PUBLIC_SITE_URL` in prod; submit sitemap to GSC/Bing

### P1 — Answers, entities, AI readiness

- [ ] **P1.1** JSON-LD: Organization, WebSite, BlogPosting, BreadcrumbList
- [ ] **P1.2** FAQ sections + FAQPage schema on about, careers, register
- [ ] **P1.3** `public/llms.txt`
- [ ] **P1.4** Register HowTo summary + schema
- [ ] **P1.5** Blog TL;DR pattern + publish SEO checklist for managers
- [ ] **P1.6** Explicit AI crawler allow/deny policy in robots (product decision)
- [ ] **P1.7** Align CTAs with register vs disabled public signup

### P2 — Depth & multilingual

- [ ] **P2.1** Locale architecture decision (cookie vs path) + optional hreflang
- [ ] **P2.2** Server-driven `html lang` / `dir`
- [ ] **P2.3** Per-page OG images for home/about/careers
- [ ] **P2.4** Optional Course/EducationalOrganization schema (only if accurate)
- [ ] **P2.5** Web manifest + richer brand icons if PWA/share targets matter
- [ ] **P2.6** Off-site entity consistency (social sameAs, business profiles)
- [ ] **P2.7** CWV pass on home/blog/register (fonts, LCP images)

---

## 8. Ops & measurement

| Channel | Action |
|---------|--------|
| Google Search Console | Domain/URL property; submit sitemap; monitor Coverage, CWV, Experience |
| Bing Webmaster | Import GSC or submit sitemap |
| Analytics | Track landings on `/`, `/blogs/*`, `/careers/*`, `/register` funnel |
| Rank / citation | Monitor brand queries + a small set of program intents; optionally track AI answer citations manually for priority queries |
| Content cadence | Prefer fewer, stronger blogs with meta + internal links over thin posts |
| Staging | `noindex` entire staging host; never allow staging in sitemap |

---

## 9. Risks & decisions to make explicitly

1. **Brand positioning in meta:** Public Etkan (education/community) vs Etkan MS (ops product). Recommendation: public meta = Etkan education brand; never advertise panel software on marketing SERPs unless you intentionally sell MS.
2. **AI training crawlers:** Allow (more GEO exposure, less control) vs block (more control). Record the choice in `robots.ts` comments and this doc when decided.
3. **Arabic SEO:** Without separate URLs, Arabic will not get proper bilingual SEO. Decide if AR is a ranking target or UI-only.
4. **`/life`:** Publish for real or remove from public IA — do not leave half-gated.
5. **Claims accuracy:** Schema and GEO copy must match legal/marketing truth (accreditation, outcomes, locations).

---

## 10. Success criteria (professional coverage)

You can consider the five pillars “covered” when all of the following are true:

| Pillar | Done looks like |
|--------|-----------------|
| **SEO** | robots + sitemap live; all indexable pages have unique title/description/canonical; panels/tokens noindexed; GSC shows valid indexing for hubs + blogs |
| **AEO** | Key pages have answer-first copy + FAQ; FAQ/HowTo schema validates; blogs open with direct answers |
| **GEO** | Organization entity consistent; about/blog citeable facts; `llms.txt` present; brand description matches public site |
| **AIO** | JSON-LD graph on public pages; AI bot policy explicit; critical content in HTML; private routes excluded |
| **SXO** | SERP promise matches page; footer/CTA honesty; register path clear; CWV healthy on top landings |

---

## 11. Related code references

| Topic | Path |
|-------|------|
| Root metadata | `app/layout.tsx` |
| Site name/URL | `lib/config/site.ts` |
| Public routes | `lib/constants/routes.ts` |
| Public ISR | `app/(public)/layout.tsx` |
| Blog metadata | `app/(public)/blogs/[slug]/page.tsx` |
| Blog SEO fields | `lib/constants/manager-blog.ts`, manager blog forms |
| Panel layout | `app/(panels)/layout.tsx` |
| Cache headers | `next.config.ts` |
| i18n | `lib/i18n/messages/en.ts`, `ar.ts` |
| Brand assets | `scripts/generate-brand-assets.ts` |

---

## 12. Document history

| Date | Change |
|------|--------|
| 2026-10-24 | Initial full SEO / AEO / GEO / AIO / SXO audit for Etkan public surface |
