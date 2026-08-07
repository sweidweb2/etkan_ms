# Skeleton + progressive loading — plan

**Goal:** Stop showing a centered “Loading page…” spinner in panel routes. Show a **layout-shaped skeleton** instead, then load **heavy sections progressively**.

**Related:** checklist in [pages.md](./pages.md) · cursor rule `.cursor/rules/loaders-skeletons.mdc` · top bar stays in `.cursor/rules/loaders-panel-top.mdc`

---

## What we already created (kit)

| Piece | Path | Role |
|-------|------|------|
| Primitives | `components/loaders/skeletons/skeleton-primitives.tsx` | Header, filters, table, cards, calendar, detail, stats, form |
| Page templates | `components/loaders/skeletons/panel-page-skeleton.tsx` | Ready-made layouts for `loading.tsx` |
| Barrel | `components/loaders/skeletons/index.ts` | Import from `@/components/loaders/skeletons` |

Templates:

- `PanelListPageSkeleton` — tables / indexes  
- `PanelCardsPageSkeleton` — gallery-style grids  
- `PanelDetailPageSkeleton` — record detail  
- `PanelCalendarPageSkeleton` — schedules  
- `PanelDashboardPageSkeleton` — dashboards / analytics  
- `PanelFormPageSkeleton` — settings / compose  
- `PanelPageSkeleton` — default (= list)

Each template mounts `TopLoaderPendingBridge` so the thin top bar still tracks the wait.

Base pulse UI: existing `components/ui/skeleton.tsx` (`Skeleton`).

---

## What you should create next (per page)

Do these in order for each row in [pages.md](./pages.md):

### Phase A — Replace the spinner (fast win)

1. Open that route’s `loading.tsx` (or add one next to `page.tsx`).
2. Swap `RouteLoading variant="panel"` / `PanelRouteLoading` for the matching template, e.g.:

```tsx
import { PanelCalendarPageSkeleton } from "@/components/loaders/skeletons";

export default function Loading() {
  return <PanelCalendarPageSkeleton />;
}
```

3. Keep **auth / root** full-page spinners for now (`variant="full-page"`) unless you later add a public skeleton.
4. Tick the page `[~]` in [pages.md](./pages.md).

Suggested first wave (high traffic / already felt slow):

1. Instructor schedules → `calendar`  
2. Weekly schedule → `calendar`  
3. Workshops → `list` or `cards`  
4. Instructors → `list`  
5. Dashboard → `dashboard`  
6. Classes / students / users → `list`  
7. Workshop / class details → `detail`

### Phase B — Progressive sections (real speed feel)

After the route skeleton exists:

1. Keep a light shell in `page.tsx` (title, filters) when cheap.
2. Wrap heavy async chunks in `<Suspense fallback={…}>` using **primitives** (`SkeletonTable`, `SkeletonCalendar`, etc.), not a second full-page spinner.
3. Soft-gate dialog-only data (candidates, create options) until open — same pattern as instructors / workshops.
4. Tick the page `[x]` when shell + main sections stream independently.

### Phase C — Panel defaults

Optional: change shared panel `loading.tsx` files (`app/(panels)/manager/loading.tsx`, etc.) from spinner → `PanelPageSkeleton` so any route without its own `loading.tsx` still looks like a skeleton.

---

## Rules of thumb

- **Shared kit** for blocks; **page (or page-type) template** for how blocks are arranged.  
- Top bar = global wait; skeleton = this section’s shape; `InlineSpinner` = button you pressed.  
- Do not invent a one-off gray layout per route if a template fits — extend primitives only when a layout is truly different.  
- Do not remove `TopLoaderPendingBridge` from panel route fallbacks.  
- Proxy/middleware speed is separate (already improved app-wide); skeletons fix **how waiting looks**, progressive load fixes **how much waits together**.

---

## Out of scope (for this doc)

- Redesigning page UI or navigation  
- Changing RBAC  
- Replacing mutation button spinners with skeletons  

---

## Done when

- [ ] Kit exists and is importable (this step)  
- [ ] [pages.md](./pages.md) lists routes to migrate  
- [ ] Cursor rule documents the convention  
- [ ] Pages moved one-by-one: spinner → skeleton → progressive sections  
