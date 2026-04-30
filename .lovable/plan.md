## Why donations show as "Anonymous Donors"

The Admin Giving Reports page labels any donation row whose `user_id` is `NULL` as **"Anonymous Donors"**. So the real question is: why is `user_id` ending up NULL when a logged-in member donates?

After tracing the full flow, here is what is happening:

1. The member taps **Donate** in the app.
2. `create-donation-checkout` is called. The user's auth token IS forwarded, so the function captures `user.id` and stores it in Stripe's session metadata as `metadata.user_id`.
3. Stripe Checkout opens **in the system browser** (not inside the app on mobile, and a new tab on web).
4. After payment, Stripe redirects to `/donation-success?session_id=...` — **but in that external browser the user has no Supabase session**, so `auth.getSession()` returns null and no `Authorization` header is sent.
5. `record-donation` therefore sees `user = null` and falls back to `metadata.user_id` from the Stripe session.
6. **The bug**: in some flows (campaign donations from `Giving.tsx`, native-app checkouts that lose state, or older sessions where the user wasn't fully loaded yet), `metadata.user_id` is written as the literal string `'guest'` even though the donor was logged in. The function then treats it as a guest and inserts `user_id = NULL`.

Database confirms it: 3 donations have `user_id = NULL`, including two created at the exact same second as a successful authenticated donation — a strong signal the user was logged in but the ID was lost in metadata.

## The fix

### 1. Recover the donor in `record-donation` (edge function)

When `metadata.user_id` is missing or `'guest'`, do NOT immediately assume guest. Instead, try to recover the donor in this order:

- **a.** Use the authenticated `user` from the request (already done).
- **b.** Use `metadata.user_id` if it's a real UUID (already done).
- **c.** **NEW** — Look up the user by the Stripe customer's email:
  - Read `session.customer_details.email` (or `session.customer_email`).
  - If it matches a row in `auth.users` (via the service-role client), use that user's ID.
- **d.** Only if none of the above succeed, record as a true guest (`user_id = NULL`).

This guarantees that if a logged-in member's email is on the Stripe receipt, the donation is attributed to them — even if the metadata was lost.

### 2. Stop writing `'guest'` into metadata for logged-in users (edge function)

In `create-donation-checkout`, change:
```ts
metadata: { user_id: user?.id || 'guest', ... }
```
to:
```ts
metadata: { user_id: user?.id || '', ... }
```
and in `record-donation` treat empty/missing `user_id` the same as guest. This removes the ambiguity where `'guest'` could be written even when a user object existed earlier in the request lifecycle on a retry.

### 3. Always forward the auth header from `DonationForm` and `Giving.tsx`

Both call sites already do this, but add a small guard: if `supabase.auth.getSession()` returns no session AND the donor did not provide a `guest_email`, refuse to start checkout. This prevents the rare case where a session expired mid-flow and the donation silently becomes a guest one.

### 4. Backfill the existing 3 NULL donations (one-time data fix)

For the three historical NULL donations, look up their Stripe payment intents, get the email Stripe collected, match it against the `profiles` table, and update `donations.user_id` for any matches. Donations with no matching member email stay NULL (true guests). I'll do this via a short edge-function script and an `UPDATE` migration after the user approves.

### 5. Improve the Admin label (small UX fix)

In `AdminGivingReports.tsx`, change the label `"Anonymous Donors"` to **"Guest Donors"** so it correctly reflects what the bucket actually represents (people who donated without an account), instead of suggesting members are intentionally hiding their identity.

## Files that will change

- `supabase/functions/record-donation/index.ts` — recovery logic (steps 1 & 2)
- `supabase/functions/create-donation-checkout/index.ts` — stop writing `'guest'` (step 2)
- `supabase/functions/create-recurring-donation/index.ts` — same fix as #2 (for consistency)
- `src/components/DonationForm.tsx` — guard against expired session (step 3)
- `src/pages/Giving.tsx` — same guard for campaign checkout (step 3)
- `src/pages/AdminGivingReports.tsx` — rename "Anonymous Donors" → "Guest Donors" (step 5)
- One-time SQL update to backfill the 3 existing NULL donations where the Stripe email matches a member (step 4)

## What the user will see after the fix

- New donations made by logged-in members will always be attributed to them in the admin report, even if the user closes the Stripe tab and reopens the app.
- True guest donations (someone who donated without signing in) will appear under **"Guest Donors"** instead of "Anonymous Donors".
- Past donations from members that were misclassified will be re-linked to the correct member name where the email matches.