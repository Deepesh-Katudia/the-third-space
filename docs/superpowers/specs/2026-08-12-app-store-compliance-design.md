# App Store Compliance — Design

_Date: 2026-08-12_

The five pieces of product work standing between the current build and a submittable iOS
app: blocking, reporting, account deletion, legal acceptance, and content filtering.

---

## Why this exists

Apple's App Review Guidelines are the whole requirement. Two clauses apply, and both are
enforced mechanically rather than at a reviewer's discretion.

**Guideline 1.2, User-Generated Content** — an app with UGC or social networking *must*
include:

> - A method for filtering objectionable material from being posted to the app
> - A mechanism to report offensive content and timely responses to concerns
> - The ability to block abusive users from the service
> - Published contact information so users can easily reach you

**Guideline 5.1.1(v)** —

> If your app supports account creation, you must also offer account deletion within the app.

This app has DMs, group chat, user photos and video, and account creation. It has none of
the four precautions. The fourth (published contact information) is satisfied off-app by
the company support page; the other three plus account deletion are this spec.

## Starting point

- `app/(app)/member/[uid].tsx:130` renders a **`TouchableOpacity` with no `onPress`** reading
  "Block or report". A dead control advertising a safety feature that does not exist is worse
  than no control — it is the first thing a reviewer will tap.
- `services/auth.ts` exports `changePassword` only. There is no deletion path of any kind.
- No privacy policy or terms link anywhere in `app/`. No acceptance at sign-up.
- No content filtering. `sendEventMessage` and `sendDirectMessage` write text verbatim.
- `services/chat.ts` has no notion of a blocked participant; `useChatList`, the discover
  feed and the guest list all render whatever Firestore returns.

### Deployment state, verified 2026-08-12

Independent of this spec, and blocking *verification* rather than implementation:

```
$ npx firebase-tools projects:list
the-third-space-626e8   Resource Location ID: [Not specified]

$ npx firebase-tools functions:list --project the-third-space-626e8
No functions found in project the-third-space-626e8.
```

- **No Cloud Functions have ever been deployed.** All seven triggers in `functions/src/`
  exist only as source, so push notifications do not work in production.
- **No default GCP resource location is set**, which is why the Storage bucket still does
  not exist. Setting it is a **permanent, irreversible** choice of region.
- The project **is** on the Blaze plan (per the 2026-08-10 storage spec). The codemap's
  "free Spark plan" note under *Key Invariants* is stale and is corrected by this work.

## Decisions taken

| Question | Decision |
|---|---|
| Where blocks live | `users/{uid}/blocks/{blockedUid}` — private subcollection |
| How blocks are enforced | Rules on the write paths; client filtering on read paths |
| Where reports live | `reports/{reportId}` — create-only, never client-readable |
| How reports reach a human | `onReportCreated` function emails the support address |
| Account deletion mechanism | Callable Cloud Function; cascade first, Auth user last |
| Messages authored by a deleted user | **Hard deleted** (see *Accepted consequences*) |
| Terms acceptance | Required checkbox at sign-up, stamped onto the profile |
| Content filter | Wordlist applied at write time, client-side |
| Sequencing | Five phases in dependency order, each green before the next |

---

## Component 1 — Blocking

```
users/{uid}/blocks/{blockedUid}   { createdAt: Timestamp }
```

A private subcollection, matching the shape `pushTokens` and `chatReads` already use:

```
match /users/{uid}/blocks/{blockedUid} {
  allow read, write: if signedIn() && request.auth.uid == uid;
}
```

**Nobody can enumerate who has blocked them.** That privacy holds *while still being
enforceable server-side*, because `exists()` inside a rule bypasses read rules. Both
directions are constructible paths, so no index and no denormalisation is needed:

```
exists(/databases/$(database)/documents/users/$(target)/blocks/$(request.auth.uid))
exists(/databases/$(database)/documents/users/$(request.auth.uid)/blocks/$(target))
```

This is the same idiom `profiles/{uid}/private/socials` already uses to prove a mutual
follow with two `exists()` calls, and it stays well inside the per-request document
access budget.

### Writes are gated in rules

- `conversations/{convId}` create — denied if either party has blocked the other
- `conversations/{convId}/messages` create — same check, so an existing thread goes cold
- `follows/{followId}` create — denied if the target has blocked the follower

### Reads are filtered client-side

**Rules cannot filter a query result — only allow or deny the whole query.** So read-side
suppression has to be client-side regardless of how much is enforced server-side. A
`useBlocks` module store (the `useDiscoverFilters` / `useUserLocation` pattern, because
several unrelated screens need it) exposes a `Set<string>` applied to:

| Surface | Effect |
|---|---|
| `useChatList` | Blocked DMs disappear from the list |
| Discover feed | Events hosted by a blocked user are hidden |
| `member/[uid]` | Renders a blocked state instead of the profile |
| Guest list | Blocked members omitted |
| `useConnections` | Blocked members excluded from mutuals |

### Blocking is symmetric on writes, asymmetric on reads

This falls out of the privacy property above and is worth stating plainly, because it is
the first question anyone will ask of the implementation.

If A blocks B:

| | Effect |
|---|---|
| **Writes — symmetric** | B cannot DM A, cannot message in an existing thread, cannot follow A. A cannot do those things to B either. Enforced in rules. |
| **Reads — asymmetric** | A stops seeing B everywhere. **B's view is unchanged** — B may still see A's public events in Discover and open A's profile. |

Symmetric read filtering would require B's client to know it had been blocked, which means
a mirror doc at `users/{B}/blockedBy/{A}` — and that hands B an enumerable list of everyone
who has blocked them. That is a worse outcome than the leak it fixes: it converts a private
safety action into a notification, which is precisely what makes people afraid to use it.

The asymmetry is acceptable against Guideline 1.2 because the guideline protects the person
doing the blocking. A is fully insulated: B cannot contact them, follow them, or appear
anywhere in A's app. B retaining read access to public event listings is not abuse.

**Consequence for the UI:** B's send and follow attempts fail at the rules layer, so both
call sites must render a neutral, non-revealing message — *"This message could not be
sent"* — never *"you have been blocked"*. Leaking the block through an error string undoes
the whole arrangement.

### New screen

`app/(app)/blocked-users.tsx` — the list, with unblock. Reached from Settings. Apple
expects blocking to be reversible.

---

## Component 2 — Reporting

```
reports/{reportId}   {
  reporterUid, kind: 'user' | 'message' | 'event',
  targetUid, threadId?, messageId?, eventId?,
  reason: ReportReason, details?, createdAt
}
```

```
match /reports/{reportId} {
  allow create: if signedIn() && request.resource.data.reporterUid == request.auth.uid;
  allow read, update, delete: if false;
}
```

Deliberately unreadable by any client. Reports are read through the Firebase console or
the Admin SDK, which bypasses rules. A report is an accusation about a third party; making
it client-readable would leak who reported whom.

`onReportCreated` emails the support address on write. **This is what makes Apple's
"timely responses to concerns" clause operable** — the requirement is a company process,
not a database table, and without a notification the queue is never read.

### Entry points

- `member/[uid].tsx:130` — the dead button becomes a real action sheet: Block, Report, Cancel
- Message bubbles — long-press to report, in both group and DM threads
- `event/[id]` — report an event

---

## Component 3 — Account deletion

A callable Cloud Function, because a client-side delete cannot:

- decrement `registeredCount` on events it does not own
- delete `follows` docs where the user is the **target**, not the follower
- remove Storage objects
- delete message documents in threads it no longer has read access to

All three would leave orphans, and the third is a privacy failure, not just untidiness.

### Order of operations

Cascade **first**, delete the Auth user **last**. A mid-way failure then leaves a
recoverable, still-signed-in account rather than an unreachable orphan whose data survives
with no owner to delete it.

| Step | Action |
|---|---|
| 1 | Messages authored by the user — hard deleted (below) |
| 2 | Registrations deleted, `registeredCount` decremented per event |
| 3 | `follows` where `follower == uid` **and** where `target == uid` |
| 4 | `profiles/{uid}` + `private/socials` + `redemptions` |
| 5 | `users/{uid}` + `pushTokens` + `chatReads` + `blocks` |
| 6 | If a hoster: `venues/{uid}`; future events `cancelled: true` |
| 7 | Storage prefixes `profilePhotos/{uid}/`, `venuePhotos/{uid}/`, `eventCovers/{uid}/`, `chatMedia/{uid}/` |
| 8 | Firebase Auth user |

Batched in chunks of 400, matching the existing `deleteEvent` limit in `services/events.ts`.

### The collection-group index

Finding every message a user authored spans `conversations/*/messages` **and**
`eventChats/*/messages`, which is a collection-group query on `authorUid`.

**This breaks a documented invariant.** The codemap states: *"Discover filtering is
entirely client-side over one subscription — no composite indexes anywhere in this app.
All Firestore queries use single-field `where` only."* Collection-group single-field
indexes are **not** created automatically, so this adds the app's first explicit index
config. The invariant note in the codemap is amended rather than quietly broken.

### Thread metadata repair

`EventChatMeta.lastMessage` and `Conversation.lastMessage` are denormalised snapshots. If
the last message in a thread was authored by the deleted user, the snapshot must be
recomputed or cleared — otherwise a thread keeps showing text whose message document is
gone.

### Client surface

- `app/(app)/delete-account.tsx` — consequences spelled out, typed confirmation, re-auth
- Settings row, styled `clay` as the destructive action

Re-authentication is required before deletion. Firebase enforces this for recent-login
sensitive operations, and it is the correct posture regardless.

---

## Component 4 — Terms, EULA and policy links

`constants/legal.ts` holds the URLs and a `TERMS_VERSION` string — the one place a legal
URL may be written, mirroring how `constants/design.ts` owns colour.

- **Sign-up** gains a required checkbox gating the submit button. Unchecked, the button is
  disabled. Acceptance stamps `profiles/{uid}.termsAcceptedAt` and `.termsVersion`.
- **Settings** gains Privacy Policy and Terms rows, opened with `expo-web-browser` (already
  a dependency — no new package, no rebuild).

Storing the version, not just a boolean, is what makes a future re-acceptance prompt
possible when the terms change. A boolean cannot answer "did they accept *these* terms".

---

## Component 5 — Content filtering

`utils/contentFilter.ts` — a pure wordlist check, unit-tested like the other 20 modules in
`utils/`. Applied at write time to:

- message text, in both `sendEventMessage` and `sendDirectMessage`
- event title and description
- profile name and bio

Deliberately simple. Guideline 1.2 asks for *"a method for filtering objectionable
material"* — it does not ask for a good one, and a wordlist plus report-and-block is the
combination Apple accepts in practice. Building anything cleverer before there are users
to learn from is speculative.

The filter rejects at the boundary with a user-facing message rather than silently
stripping text. Silent modification of what someone wrote is its own kind of failure.

---

## Phases

Dependency order. Each phase lands green against the existing suite (69 files / 559 tests,
45 rules tests, 23 function tests) before the next begins.

| # | Phase | Delivers |
|---|---|---|
| 1 | Blocking | Data model, rules, `useBlocks`, read filtering, blocked-users screen |
| 2 | Reporting | `reports` collection, rules, action sheet, `onReportCreated` |
| 3 | Account deletion | Callable function, index config, client flow, re-auth |
| 4 | Legal | `constants/legal.ts`, sign-up gate, settings rows |
| 5 | Content filter | `utils/contentFilter.ts`, wired into four write paths |

Blocking is first because reporting's action sheet shares its entry point, and because a
report without a block is only half of what a user reaching for either one actually wants.

## Testing

Follows the project's existing split:

- **Unit** (`jest`) — `contentFilter`, block-set filtering, deletion cascade logic
- **Rules** (`@firebase/rules-unit-testing`) — every new rule, both directions of every
  block check, and the create-only report rule proved unreadable
- **Functions** (`functions/jest`) — deletion cascade against the emulator, including the
  partial-failure path where the Auth user must survive

The rules tests assert the block checks in **both** directions separately, for the same
reason the socials tests do: `exists()` on one direction only proves a one-way relationship.

## Accepted consequences

- **DM threads read one-sided after a deletion.** The surviving participant keeps their own
  messages; replies quoting deleted text lose their referent. This is the cost of hard
  deletion over anonymisation, chosen deliberately for the stronger privacy position.
- **Past events survive a hoster's deletion.** Attendees' history and points would otherwise
  be corrupted by removing an event they genuinely attended. Future events are cancelled so
  nobody turns up to something with no host.
- **The wordlist will both over- and under-match.** It is a compliance floor, not a
  moderation system. The report queue is the real mechanism.
- **The report queue is an ongoing company obligation**, not a shipped feature. Apple
  requires timely responses and can remove the app for failing to act on violating content.

## Open items outside this spec

Deployment-time, tracked separately:

- Set the GCP default resource location (**permanent**), then provision the Storage bucket
- Deploy the seven existing functions plus the two new ones
- Deploy `firestore.rules` (three changes now pending) and `storage.rules`
- Update the codemap: Spark → Blaze, and the no-indexes invariant
