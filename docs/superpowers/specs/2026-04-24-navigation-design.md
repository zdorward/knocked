# Navigation Redesign

**Date:** 2026-04-24  
**Status:** Approved

## Summary

Replace the current ad-hoc page-level navigation (text links between Tracker and Stats) with a persistent `NavBar` component shared across all protected routes. The nav bar sits at the top of every app page, provides tab-based routing, and surfaces a logout action in an overflow menu.

## Design

### Layout

```
[ Knocked ]  [ Tracker ]  [ Stats ]              [ ⋯ ]
```

- **Brand**: "Knocked" on the far left
- **Tabs**: active tab has a blue underline indicator; inactive tabs are slate-colored
- **Overflow button** (`⋯`): on the far right, toggles a dropdown

### Dropdown (open state)

```
┌─────────────────────┐
│ user@email.com      │  ← dimmed, not interactive
├─────────────────────┤
│ Sign out            │  ← red text, triggers logout
└─────────────────────┘
```

Clicking outside the dropdown closes it.

### Sign out flow

1. `supabase.auth.signOut()` called client-side
2. `router.push('/login')` on success

## Components

### `components/NavBar.tsx` (new, client component)

Props: `email: string`

Responsibilities:
- Render brand, tab links, and `⋯` button
- Use `usePathname()` to determine active tab
- Manage dropdown open/close state (`useState`)
- Close dropdown on outside click (`useEffect` + click listener)
- Handle sign out

### `app/(app)/layout.tsx` (modified)

Becomes a server component that:
1. Fetches the current user via `createClient()`
2. Passes `user.email` to `<NavBar>`
3. Wraps `{children}` in a consistent page shell

```tsx
export default async function AppLayout({ children }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar email={user?.email ?? ''} />
      <main className="max-w-2xl mx-auto p-6">{children}</main>
    </div>
  )
}
```

## Cleanup

Remove nav elements that will be replaced:

| File | Remove |
|---|---|
| `app/(app)/tracker/TrackerClient.tsx` | "Stats →" link in header; email `<p>` at bottom; top-level padding/flex wrapper (now handled by layout) |
| `app/(app)/stats/page.tsx` | "← Tracker" link in header |

Both pages currently manage their own `max-w-2xl mx-auto p-6` container — this moves to the layout, so page-level wrappers need their padding removed to avoid double-padding.

## Extensibility

Adding a new tab in the future means adding one entry to a `tabs` array in `NavBar`. No structural changes required.

## Out of Scope

- Account settings page
- Any content inside a future Account tab
- Mobile (non-iPad) breakpoints
