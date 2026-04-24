# Favicon & OG Image Design

**Date:** 2026-04-24
**Status:** Approved

## Overview

Add a favicon and Open Graph image to the Knocked app so it has a recognizable icon in browser tabs and a polished link preview card when shared in iMessage, Slack, Twitter, etc.

---

## Design Decisions

### Favicon

- **Shape:** Minimal door silhouette — a clean rectangular door body with a recessed inner panel and a small circular knob. No ripple effects or decorative elements.
- **Color:** Gold/amber palette — `#d97706` door body, `#b45309` inner panel, `#fde68a` knob, `#1c1400` background square
- **Format:** SVG (`app/icon.svg`) — Next.js App Router automatically serves files named `icon.svg` in the `app/` directory as the favicon, no config needed
- **Shape of container:** Rounded square (`rx="16"` on an 80×80 viewBox)

### OG Image

- **Layout:** Icon left, text right — the door icon on the left, "Knocked" heading + tagline stacked on the right
- **Background:** Dark slate (`#0f172a`) — matches the app's background
- **Typography:**
  - App name: `Knocked` — large, bold (900 weight), white (`#f8fafc`)
  - Tagline: `Door-to-door sales tracker` — smaller, muted slate (`#94a3b8`)
- **Dimensions:** 1200×630px (standard OG image size)
- **Format:** Generated at request time via `app/opengraph-image.tsx` using Next.js `ImageResponse` from `next/og`

---

## Implementation

### Files to create

| File | Purpose |
|------|---------|
| `app/icon.svg` | Favicon — auto-wired by Next.js App Router |
| `app/opengraph-image.tsx` | OG image — rendered by Next.js `ImageResponse` |

### How it works

**Favicon:** Next.js App Router treats `app/icon.svg` as the site favicon automatically. No changes to `layout.tsx` needed — Next.js injects the `<link rel="icon">` tag.

**OG image:** Next.js App Router treats `app/opengraph-image.tsx` as the OG image route. It exports a default function returning an `ImageResponse`. Next.js injects the relevant `<meta property="og:image">` tags automatically. Vercel caches the response at the edge.

### OG image structure (JSX)

```
1200×630 dark slate container
  ├── Door SVG icon (left, ~120×120px)
  └── Text column (right)
      ├── "Knocked" — bold, white, ~72px
      └── "Door-to-door sales tracker" — regular, slate-400, ~32px
```

---

## Out of Scope

- Twitter-specific card (`twitter-image.tsx`) — OG image is sufficient for most platforms
- Dark/light mode variants of the favicon
- Animated favicon
