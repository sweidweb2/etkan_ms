# Section 5 — From fragmented data into unified data

Copy this folder into the other app. The section has no images, icons, or API calls. The three drawings are drawn in the component.

## Files

- `UnifiedSection.tsx` — the section, the heading, the three steps, the separators, and the drawings.
- `unified-section.css` — the beige page, the text colors, the line color, and the teal used by the drawings.

## Use

```tsx
import './unified-section.css'
import { UnifiedSection } from './UnifiedSection'

export function Page() {
  return <UnifiedSection />
}
```

The other app needs Tailwind with these utility colors already wired to CSS variables: `bg-background`, `text-foreground`, `text-muted-foreground`, `text-primary`, and `border-border`. The CSS file sets those variables on `.unified-section`. The drawing color also comes from `.unified-art`, so the dots stay teal even if `text-primary` is not mapped.
