# Profile Social Handles — Design Spec

**Date:** 2026-07-29
**Status:** Approved, ready for planning

## Goal

Let a member add their Instagram, TikTok and X handles to their profile, visible **only to their connections** (mutual follows), and tappable to open that profile in the platform's app or the browser.

## Scope decisions

| Decision | Choice |
|----------|--------|
| Platforms | Instagram, TikTok, X. No Spotify. |
| Visibility | Connections only — mutual follows. No per-member setting. |
| Enforcement | Firestore rules, not the UI. |
| Where edited | `edit-profile.tsx` only. Signup is not extended. |

This is **not** `@mention` tagging of other members, and it is not an extension of the existing `interests` field. It is a member's own outbound social links.

## Why the storage location matters

`firestore.rules:60-61` grants `allow read: if signedIn()` on `profiles/{uid}`. Any signed-in member can read any profile document in full. If handles were a field on that document, a connections-only rule in the UI would be **cosmetic** — anyone using the Firebase SDK directly could read every handle in the app.

Since connections-only was chosen specifically as the privacy-safe option, the gate is enforced where it can actually hold:

```
profiles/{uid}/private/socials
```

A single document in a `private` subcollection, with its own read rule.

## Data model

```ts
export type SocialPlatform = 'instagram' | 'tiktok' | 'x'

/** Handles are stored WITHOUT a leading '@', lowercased. An absent key means not set. */
export type SocialHandles = Partial<Record<SocialPlatform, string>>
```

`Profile` is **not** modified. Handles never touch the profile document.

## Security rules

Follow edges are `follows/{follower}_{target}` (`utils/follows.ts:1-3`), so a mutual follow is provable with two `exists()` calls — well inside Firestore's per-request document-access budget:

```
match /profiles/{uid}/private/socials {
  allow read: if signedIn() && (
    request.auth.uid == uid ||
    (
      exists(/databases/$(database)/documents/follows/$(request.auth.uid + '_' + uid)) &&
      exists(/databases/$(database)/documents/follows/$(uid + '_' + request.auth.uid))
    )
  );
  allow write: if signedIn() && request.auth.uid == uid
    && request.resource.data.keys().hasOnly(['instagram', 'tiktok', 'x']);
}
```

The `hasOnly` clause stops the document being used as unbounded free storage on a path other members can read.

## Visibility is the rules' job, not the screen's

The member screen does **not** consult `useConnections` to decide whether to render handles. It subscribes and renders whatever comes back. A non-connection's read fails with `permission-denied`, which the hook translates into "not visible" — not an error state.

This keeps one source of truth. Duplicating the mutual-follow check in the UI would create two places that can disagree, and the UI copy would be the one that's wrong.

This is the same family of trap already documented in the codemap for `conversations`: a rules-denied read is a normal outcome to be handled, not an exception to be surfaced.

## Modules

**`utils/socials.ts`** — pure, dependency-free, fully unit-tested:

- `normalizeHandle(raw)` — strips a leading `@`, strips a pasted URL (`https://instagram.com/foo/` → `foo`), trims whitespace, lowercases. People paste URLs; the field absorbs that rather than rejecting it.
- `isValidHandle(platform, handle)` — Instagram 1–30 `[a-z0-9._]`, TikTok 2–24 `[a-z0-9._]`, X 1–15 `[a-z0-9_]`.
- `socialUrl(platform, handle)` — the `https://` profile URL.
- `SOCIAL_PLATFORMS` — ordered list with display labels, driving both the edit form and the chips so the two cannot drift.

**`services/profiles.ts`** — one added function, `setSocials(uid, handles)`, using `setDoc` **without** `merge`. The edit form always submits the complete set, so a full overwrite is what correctly clears a handle the member removed.

**`hooks/useSocials.ts`** — subscribes to the doc. Returns `{ handles, visible, loading, hasError }`. `permission-denied` → `visible: false, hasError: false`. Any other error → `hasError: true`.

**`components/SocialChips.tsx`** — presentational. Renders one chip per present handle; renders nothing when there are none.

## Opening a link

Plain `Linking.openURL()` on the `https://` URL — not a native app scheme. iOS and Android hand off to the installed app automatically via universal links, so this needs no `LSApplicationQueriesSchemes` entries in `app.json` and **no native rebuild**. A failed open is caught and ignored; it is not worth an error banner.

## UI

| Screen | Change |
|--------|--------|
| `app/(app)/member/[uid].tsx` | "Socials" section between Interests and Vibe. Hidden entirely when not visible or empty. |
| `app/(app)/(attender)/profile.tsx` | Own handles, always readable by the owner. |
| `app/(app)/edit-profile.tsx` | Three inputs with inline per-platform validation. |

Chips follow the existing interest-chip treatment (`member/[uid].tsx:124-131`) so the section reads as part of the profile rather than a bolted-on widget. No literal hex — `constants/design.ts` only, per the token guard.

## Error handling

- Invalid handle → inline message under that input, save blocked for that field only. The other two still save.
- Save failure → the existing `edit-profile` error pattern, unchanged.
- Read denied → section not rendered. Silent by design.
- Read failed for any other reason → section not rendered. A profile is still useful without it; this is an enhancement, never a blocker.

## Testing

| Suite | Covers |
|-------|--------|
| `__tests__/utils/socials.test.ts` | normalize (`@` prefix, pasted URL, whitespace, case), per-platform validation incl. boundary lengths, URL building |
| `__tests__/hooks/useSocials.test.tsx` | emits handles; `permission-denied` → `visible: false` **and** `hasError: false`; other errors → `hasError: true`; unsubscribes on unmount |
| `__tests__/components/SocialChips.test.tsx` | renders a chip per handle; renders nothing when empty; press passes the right URL |
| `__tests__/rules/firestore.rules.test.ts` | owner reads own; mutual follower reads; **one-way follower denied**; stranger denied; non-owner write denied; write with an unexpected key denied |

The one-way-follower case is the one that matters most — it is the difference between "connections only" and "anyone who follows you", and it is the case a naive single-`exists()` rule would get wrong.

## Verification

- `npx tsc --noEmit` clean
- `npx jest` green
- `npm run test:rules` green (needs Firebase CLI + Java)
- Rules must be **deployed** before device testing, or every read returns denied and the section silently never appears.
- Manual, two accounts: handles invisible before mutual follow, visible after, gone again after unfollow.
