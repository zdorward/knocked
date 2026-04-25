# Profile Creation & Settings Modal Design

**Date:** 2026-04-25

## Problem Statement

Two issues to fix:
1. Google OAuth users have no row in the `profiles` table after signing in.
2. The settings modal has UX problems: inconsistent input sizing, modal doesn't close on save, and Cancel button placement is awkward.

---

## Issue 1: Profile Not Created for Google OAuth Users

### Root Causes

**RLS gap:** The `profiles` table has SELECT and UPDATE policies but no INSERT policy. The `upsert` call in `PATCH /api/profile` silently fails for users without an existing profile row because RLS blocks the insert.

**Trigger timing:** The `on_auth_user_created` trigger only fires on new `auth.users` inserts. Users who signed up before migration 003 was applied never get a profile row auto-created.

### Fix

**Migration `006_profiles_insert_policy.sql`:**
```sql
create policy "profiles_insert_own"
  on profiles for insert
  with check (auth.uid() = id);
```

**Auth callback (`app/auth/callback/route.ts`):** After `supabase.auth.exchangeCodeForSession(code)` succeeds, upsert a profile row for the authenticated user:
```ts
const { data: { user } } = await supabase.auth.getUser()
if (user) {
  await supabase
    .from('profiles')
    .upsert({ id: user.id }, { onConflict: 'id', ignoreDuplicates: true })
}
```
This is a no-op for users who already have a row (due to `ignoreDuplicates: true`). For users without a row, it creates one. Covers all future Google sign-ins regardless of when the account was created.

### Side Effect

The modal-doesn't-close bug resolves as a consequence: once the INSERT policy exists, the upsert in `PATCH /api/profile` succeeds, `res.ok` is `true`, and `setSettingsOpen(false)` fires correctly.

---

## Issue 2: Settings Modal Redesign

### Selected Design: B — Full-width Save, X to cancel

**Layout (top to bottom):**

1. **Header row** — "Settings" title (left), ✕ close button (right)
   - ✕ button: 28×28px, `bg-slate-700`, `rounded-lg`, slate-400 icon
2. **Personal Emoji field**
   - Label: `PERSONAL EMOJI` (uppercase, slate-400, tracking-widest)
   - Input row: `h-12 px-4 bg-slate-900 border border-slate-600 rounded-xl`
   - Left side: emoji preview (22px, or 👤 default)
   - Right side: visible text input for typing/setting emoji
3. **Display Name field**
   - Label: `DISPLAY NAME`
   - Input: identical styling to emoji row — `h-12 px-4 bg-slate-900 border border-slate-600 rounded-xl text-white text-sm`
4. **Save button** — full-width, `bg-blue-500`, `rounded-xl`, `py-3`
5. **Divider + Sign out section** (unchanged)
   - Email shown in slate-500 above Sign out button

**Dismissed by:** ✕ button or backdrop tap. No Cancel button.

### Files Changed

| File | Change |
|---|---|
| `supabase/migrations/006_profiles_insert_policy.sql` | New — adds INSERT RLS policy |
| `app/auth/callback/route.ts` | Upsert profile row after successful code exchange |
| `components/SettingsModal.tsx` | Redesign to layout B |

---

## Success Criteria

- Signing in with Google creates a profile row in `profiles` visible in Supabase dashboard
- Tapping Save in the settings modal closes the modal
- Both input fields are visually identical in height and padding
- Modal closes via ✕ button or backdrop tap; no Cancel button present
