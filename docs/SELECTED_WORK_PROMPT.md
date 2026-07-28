# Prompt: Selected Work section (stat-led case studies)

Copy-paste this into another project when you want the same homepage “Selected Work” pattern used on Apex.

---

## Prompt

```
Build a homepage “Selected Work” section using a stat-led case-study layout (Son Daven style).

### Goal
Business-transformation case studies where the NUMBER is the dominant visual — not the photo. Results first, then story.

### Section header
- Eyebrow: “Selected work”
- H2: something like “Real results. Real businesses. Real impact.”
- Short subtitle under it (muted)
- Right-aligned “View all cases →” link/button (pill outline on dark)

### Case list (featured items only)
Render featured case studies as full-width alternating rows (not a card grid of equal tiles).

Each case is one large row:
1. Media (left on even, right on odd / flip layout)
2. Copy (opposite side)

### Media column
- 4:3 image (or labelled placeholder until assets exist)
- Service/category tags overlaid bottom-left on the image (small pills, blur/backdrop)

### Copy column (stat-led)
Order matters:
1. Giant stat as the hero of the row
   - Huge number (e.g. clamp ~3rem → 5.5rem, weight 800, tight tracking)
   - Gradient text (light → accent)
   - Small muted unit/label next to it (e.g. “views in 14 days”)
2. Client name — small uppercase tracking label in accent color
3. Headline — short, punchy (1 line idea)
4. Summary — 1–2 sentences, muted, max ~52ch
5. “Read case →” text link in accent; on hover, gap widens slightly

### Layout / interaction
- Stack on mobile; 2-column split from ~860px
- Odd items flip media/copy
- Whole row is a link to `/work/[slug]`
- Subtle hover: row lifts ~4px; media gets a soft glow; “Read case” brightens
- Scroll entrance: fade-up per row; respect prefers-reduced-motion

### Visual context
- Dark section background
- Match existing design tokens (radius, spacing, type scale, accent)
- No generic equal-height card grid — this is editorial / case-study list
- Avoid clutter: no stats strips, no icon rows, no extra badges floating on the image beyond the tag pills

### Data shape
```ts
type CaseStudy = {
  slug: string;
  client: string;
  tags: string[];
  featured: boolean;
  stat: { value: string; unit: string }; // value is the visual hero
  headline: string;
  summary: string;
};
```
Only render `featured: true` on the homepage. Keep all copy in a content file, not hard-coded in the component.

### Accessibility
- Section has aria-labelledby
- Each card link has a clear aria-label including client + headline
- Min tap targets ~48px on the view-all control
```

---

## What this produces (Apex reference)

| Piece | File |
|-------|------|
| Component | `src/components/sections/SelectedWork.tsx` |
| Styles | `src/components/sections/SelectedWork.module.css` |
| Data | `src/lib/content.ts` → `featuredCaseStudies` |

### Pattern in one line
**Eyebrow + title + view-all → alternating media/copy rows → giant gradient stat → client → headline → summary → read case.**
