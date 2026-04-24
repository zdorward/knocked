# Auth Improvements Design

**Date:** 2026-04-24
**Status:** Approved

## Overview

Expand the auth experience from email/password-only login to a full standard auth suite: Google OAuth, sign-up, forgot password, and password reset. Four separate pages following standard web conventions. Apple Sign In is excluded (requires $99/year Apple Developer account — not worth it for a two-person tool).

---

## Pages

### `/login` (update existing)

- "Continue with Google" button (top)
- Divider ("or")
- Email + password fields
- "Sign in" button
- "Forgot password?" link → `/forgot-password`
- "No account? Sign up" link → `/signup`

### `/signup` (new)

- "Continue with Google" button (top)
- Divider ("or")
- Email + password fields
- "Create account" button (emerald, to distinguish from sign-in)
- "Already have an account? Sign in" link → `/login`
- On success: redirect to `/tracker`

### `/forgot-password` (new)

- Email field
- "Send reset link" button
- "← Back to sign in" link → `/login`
- On submit: calls `supabase.auth.resetPasswordForEmail()` with `redirectTo` pointing to `/auth/callback?next=/reset-password`
- Success state: shows "Check your email" confirmation message in place of the form (no page navigation)
- Error shown inline if email not found or rate limited

### `/reset-password` (new)

- Reached after user clicks the link in their email (routed through `/auth/callback`)
- New password + confirm password fields
- "Update password" button
- On success: calls `supabase.auth.updateUser({ password })`, redirects to `/tracker`
- Shows error inline if passwords don't match or update fails

---

## Behind the Scenes

### `app/auth/callback/route.ts` (new)

Standard Supabase PKCE callback handler. Handles two cases:
1. **OAuth (Google):** Exchanges `code` for session, redirects to `/tracker`
2. **Password reset:** Exchanges `code` for session, reads `next` query param, redirects to `/reset-password`

### Middleware update

Add the following paths to the public (no-auth-required) list:
- `/signup`
- `/forgot-password`
- `/reset-password`
- `/auth/callback`

Currently only `/login` is public. All four new paths must be accessible without a session.

---

## Supabase Configuration (manual steps)

These are done in the Supabase dashboard, not in code:

1. **Google OAuth:** Authentication → Providers → Google → enable, add Client ID + Secret from Google Cloud Console
2. **Redirect URLs:** Authentication → URL Configuration → add `https://knocked.app/auth/callback` and `http://localhost:3000/auth/callback`
3. **Site URL:** Set to `https://knocked.app`

---

## Styling

All pages follow the existing pattern:
- `min-h-screen bg-slate-900` container
- `bg-slate-800` inputs with `rounded-xl px-4 py-4 text-lg` — large tap targets for iPad
- Blue (`bg-blue-500`) primary action buttons
- Emerald (`bg-emerald-500`) for "Create account" to visually distinguish from sign-in
- Error messages in `text-red-400`
- Success states in emerald (matching the existing app color for sales/positive outcomes)
- Links in `text-blue-400`

---

## Out of Scope

- Apple Sign In
- Magic link / passwordless login
- Email confirmation on sign-up (Supabase sends one by default — no custom flow needed)
- Account settings / password change from within the app
