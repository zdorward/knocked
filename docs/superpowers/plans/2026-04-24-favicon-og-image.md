# Favicon & OG Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a gold door favicon and a branded OG image card to the Knocked Next.js app.

**Architecture:** Two files — `app/icon.svg` (auto-served as favicon by Next.js App Router) and `app/opengraph-image.tsx` (auto-served as OG image via `ImageResponse` from `next/og`). No config changes to `layout.tsx` needed; Next.js wires both up automatically.

**Tech Stack:** Next.js 14 App Router, `next/og` (`ImageResponse`), SVG

---

### Task 1: Add `.superpowers/` to `.gitignore`

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add the entry**

Open `.gitignore` and append this line at the end of the `# misc` block (after `.DS_Store`):

```
# superpowers
.superpowers/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore .superpowers/ directory"
```

---

### Task 2: Create the favicon SVG

**Files:**
- Create: `app/icon.svg`

Next.js App Router treats `app/icon.svg` as the site favicon and injects `<link rel="icon">` automatically — no changes to `layout.tsx` needed.

- [ ] **Step 1: Create `app/icon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
  <!-- Dark amber background square -->
  <rect width="80" height="80" rx="16" fill="#1c1400"/>
  <!-- Door body -->
  <rect x="24" y="14" width="32" height="52" rx="4" fill="#d97706"/>
  <!-- Inner panel -->
  <rect x="30" y="20" width="20" height="40" rx="2" fill="#b45309"/>
  <!-- Door knob -->
  <circle cx="45" cy="42" r="3" fill="#fde68a"/>
</svg>
```

- [ ] **Step 2: Verify the favicon appears**

Run the dev server:
```bash
npm run dev
```

Open `http://localhost:3000` in your browser. Check the browser tab — you should see the small gold door icon. If the tab shows the Next.js default icon, do a hard refresh (`Cmd+Shift+R`).

- [ ] **Step 3: Commit**

```bash
git add app/icon.svg
git commit -m "feat: add gold door favicon"
```

---

### Task 3: Create the OG image

**Files:**
- Create: `app/opengraph-image.tsx`

Next.js App Router treats `app/opengraph-image.tsx` as the OG image route and injects `<meta property="og:image">` automatically. It renders at request time via `ImageResponse` (backed by `satori`), which Vercel caches at the edge.

**Satori constraints to be aware of:**
- All styles must be inline (no Tailwind, no CSS classes)
- Use `display: 'flex'` on all container elements — satori requires explicit flex layout
- Use pixel values for `position: absolute` coordinates (no percentages)
- SVG elements have limited support in satori — use `div`-based shapes instead

- [ ] **Step 1: Create `app/opengraph-image.tsx`**

```tsx
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Knocked — Door-to-door sales tracker'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#0f172a',
          paddingLeft: 120,
          paddingRight: 120,
          gap: 64,
        }}
      >
        {/* Door icon — div-based for satori compatibility */}
        <div
          style={{
            width: 160,
            height: 160,
            borderRadius: 32,
            backgroundColor: '#1c1400',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {/* Door body */}
          <div
            style={{
              width: 64,
              height: 104,
              borderRadius: 8,
              backgroundColor: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {/* Inner panel */}
            <div
              style={{
                width: 40,
                height: 80,
                borderRadius: 4,
                backgroundColor: '#b45309',
              }}
            />
            {/* Door knob */}
            <div
              style={{
                position: 'absolute',
                right: 8,
                top: 44,
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: '#fde68a',
              }}
            />
          </div>
        </div>

        {/* Text block */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span
            style={{
              color: '#f8fafc',
              fontSize: 96,
              fontWeight: 900,
              letterSpacing: '-3px',
              lineHeight: 1,
            }}
          >
            Knocked
          </span>
          <span
            style={{
              color: '#94a3b8',
              fontSize: 36,
              fontWeight: 400,
            }}
          >
            Door-to-door sales tracker
          </span>
        </div>
      </div>
    ),
    { ...size }
  )
}
```

- [ ] **Step 2: Verify the OG image renders**

With the dev server running (`npm run dev`), open this URL in your browser:

```
http://localhost:3000/opengraph-image
```

You should see a 1200×630 dark slate image with the gold door icon on the left and "Knocked" in large white text on the right. If you see a blank page or error, check the terminal for a satori rendering error.

- [ ] **Step 3: Verify the meta tag is injected**

View source on `http://localhost:3000` (or right-click → View Page Source). Search for `og:image`. You should see:

```html
<meta property="og:image" content="http://localhost:3000/opengraph-image" .../>
```

- [ ] **Step 4: Commit**

```bash
git add app/opengraph-image.tsx
git commit -m "feat: add OG image with door icon and Knocked branding"
```
