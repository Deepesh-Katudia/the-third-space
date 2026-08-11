# Storage Media Uploads — Design

_Date: 2026-08-10_

Images and video across four surfaces — profile, event, venue and chat — on Firebase
Storage, now that the project is on the Blaze plan.

---

## Prerequisite: the bucket does not exist yet

Blaze billing and Cloud Storage provisioning are separate steps. Probing the GCS JSON API
on 2026-08-10 returned `The specified bucket does not exist` for **both** candidate names:

```
the-third-space-626e8.firebasestorage.app  → 404 notFound
the-third-space-626e8.appspot.com          → 404 notFound
```

Someone must click **Firebase Console → Build → Storage → Get started** once. Every phase
below can be written and unit-tested without it, and **none can be verified on device
until it is done**. `firebase deploy --only storage` has nothing to deploy to until then.

Bundle that deploy with the two Firestore rules changes the codemap records as already
undeployed (the `conversations` null guard and the `profiles/{uid}/private/socials` gate):
`firebase deploy --only firestore:rules,storage`.

## Starting point

- `services/photos.ts` is the only upload path: `uploadProfilePhoto()` writes an avatar to
  `profilePhotos/{uid}/avatar.jpg` via `uploadBytes` — no progress, not resumable.
- Both call sites swallow failure silently (`app/(auth)/create-profile.tsx:62`,
  `app/(app)/edit-profile.tsx:133`), which violates the project's own "never silently
  swallow errors" rule.
- `storage.rules` covers that one path and has never been deployed.
- `Profile.vibePhotos` exists in the model and renders on `member/[uid].tsx`, but nothing
  has ever written it. `create-profile.tsx:66` hardcodes `[]`; `edit-profile.tsx`,
  `services/profiles.ts` and `hooks/useProfile.ts` never touch the field.
- No event cover, no venue photos, no chat attachments. No video dependency.

## Decisions taken

| Question | Decision |
|---|---|
| Surfaces | All four: profile, event cover, venue, chat |
| Video | Allowed on every surface |
| Size caps | Tight — images under 5 MB, video ≤ 60 s and under 50 MB |
| Architecture | Client-direct uploads; `storage.rules` is the enforcement wall |
| Delivery | One spec, five phases |
| Event cover layout | Full-bleed stub above the tear line |
| Chat media layout | Inset inside the bubble padding |

### Rejected approaches

**Cloud Function `onFinalize` post-processing.** Would guarantee thumbnails even when a
device fails to generate one, and opens the door to real transcoding. Rejected because the
message or profile document must be written *before* the derived file exists, so every
render site inherits a pending state, and you pay invocations plus storage for both raw and
derived objects. Too much machinery for a fallback the client handles.

**Server-mediated signed-URL uploads.** Maximum control, and the right answer if hard
per-user quotas are ever needed. Rejected because it duplicates validation `storage.rules`
already performs synchronously and for free.

## Dependencies

All three are **included in Expo Go**, so this needs no dev build — which preserves the
project's standing "no native rebuild" constraint.

| Package | Purpose |
|---|---|
| `expo-video` | `useVideoPlayer` + `VideoView` in the fullscreen viewer |
| `expo-video-thumbnails` | `getThumbnailAsync` for poster frames |
| `expo-image-manipulator` | Resize and compress before upload |

Verified against the SDK 54 docs, matching the `expo ~54.0.0` pin in `package.json`.
Note that `thirdspace-app/AGENTS.md` points at the v56 docs; that instruction is stale
relative to the installed SDK and should be reconciled separately.

---

## 1. One media descriptor

Every asset carries a poster, and for images the poster **is** the image.

```ts
export type MediaType = 'image' | 'video'

export interface MediaAsset {
  type: MediaType
  url: string          // full asset
  thumbURL: string     // poster; identical to `url` when type === 'image', '' if generation failed
  width: number
  height: number
  durationMs?: number  // videos only
}
```

Because `thumbURL` is always present, every list, card and grid renders exactly one thing —
`thumbURL` — and adds a play badge if and only if `type === 'video'`. There is no branch
between an "image surface" and a "video surface". **Playback is always tap-to-open in a
fullscreen viewer; nothing autoplays inline.** That single rule is what keeps a
video-capable `EventCard` in a scrolling feed as cheap as today's image-only one, and it is
why video on four surfaces does not multiply into eight render paths.

`width`/`height` ride along so every surface reserves the correct aspect box before the
image resolves — no layout jump on the ticket or in the thread.

`thumbURL === ''` is the deliberate failure mode when poster generation fails on device:
`MediaThumb` renders an ink tile with a play badge. No pending flag, no half-uploaded state.

## 2. Storage layout

```
profilePhotos/{uid}/avatar.jpg          ← unchanged; the avatar is always an image
profilePhotos/{uid}/vibe{0,1,2}         ← no extension: the slot may hold image OR video
profilePhotos/{uid}/vibe{0,1,2}_thumb
eventCovers/{hosterUid}/{eventId}/cover
eventCovers/{hosterUid}/{eventId}/cover_thumb
venuePhotos/{uid}/{0..5}
venuePhotos/{uid}/{0..5}_thumb
chatMedia/{authorUid}/{threadId}/{messageId}
chatMedia/{authorUid}/{threadId}/{messageId}_thumb
```

**Extensions are dropped on any slot that can hold either type.** Content type lives in
object metadata. A fixed path means swapping a photo for a clip overwrites cleanly rather
than stranding the old object — which is what makes replacement orphan-free everywhere.

**Every path is rooted at the uid that owns the write**, including event covers, which are
keyed by hoster uid *then* event id. This is not cosmetic: Storage rules cannot query
Firestore to ask who owns an event, so ownership must be expressible in the path itself.

Chat media is keyed by `messageId`, which is available before the write because the ref is
minted with `doc(collection(...))` first.

## 3. Model changes

| Type | Change |
|---|---|
| `Profile.vibePhotos` | `string[]` → `MediaAsset[]` |
| `CommunityEvent.cover` | new, optional `MediaAsset` |
| `Venue.photos` | new, optional `MediaAsset[]`, max 6 |
| `Message.media` | new, optional single `MediaAsset` |

The `vibePhotos` retype reads as breaking and is not: every stored value in Firestore today
is `[]`, because nothing has ever written the field (see *Starting point*). No backfill
exists to break. The reader still coerces a legacy bare string to
`{ type: 'image', url: s, thumbURL: s }` — assuming production data matches your
assumptions is how you discover it does not.

`Message.media` is a single asset, not an array. One attachment per message is the ordinary
chat convention and avoids designing a multi-select composer nobody asked for.

`CommunityEvent.cover` is optional for the same reason `borough` is: every event that
already exists lacks one, and the card must look deliberate without it.

## 4. `utils/media.ts` — pure

```ts
mediaPath(slot: MediaSlot): string
presetFor(slot: MediaSlot): CompressionPreset
withinLimits(bytes, durationMs, type): LimitResult   // ok | 'too-large' | 'too-long'
coerceLegacyVibe(value: unknown): MediaAsset[]
mediaPreviewLabel(media?: MediaAsset): string        // '' | 'PHOTO' | 'VIDEO'
```

`MediaSlot` is a discriminated union — `{ kind: 'avatar', uid }`,
`{ kind: 'vibe', uid, index }`, `{ kind: 'eventCover', hosterUid, eventId }`,
`{ kind: 'venue', uid, index }`, `{ kind: 'chat', authorUid, threadId, messageId }`. One
type; a fifth surface later is one variant and one case, not a new upload function.

`mediaPreviewLabel` returns uppercase because every type role in this app is uppercase — a
lowercase "Photo" would be the only string in the codebase fighting the token.

### Compression presets

| Slot | Longest edge | Quality |
|---|---|---|
| avatar | 512 | 0.8 |
| vibe, venue, event cover | 1440 | 0.75 |
| chat image | 1280 | 0.7 |
| any `_thumb` | 640 | 0.6 |

Poster frames are not a `MediaSlot` kind. `presetFor` takes the slot; the `_thumb` row is a
single fixed preset applied by `uploadMedia` when it derives a poster, whatever the slot.

### Limits

Images **under 5 MB** after compression; video **≤ 60 s and under 50 MB**. The byte
thresholds are strict inequalities to match the rules exactly: 5 MB − 1 passes, 5 MB itself
does not. Sloppiness here means the client accepts a file the rules then reject, which is
the worst possible place to discover a limit.

Three layers, none redundant: the picker's `videoMaxDuration` stops most bad input before it
costs anything, `withinLimits()` produces a message the user can act on, and `storage.rules`
enforces. The first two are a courtesy to a cooperating client.

**Duration is not enforceable in `storage.rules`** — rules see `size` and `contentType`, not
media metadata. A client that ignores `videoMaxDuration` can upload a ten-minute clip if it
stays under 50 MB. The size cap is the real backstop; the duration cap is a product
constraint, not a security one, and should not be described as enforced.

The 50 MB video ceiling is as much a **memory** constraint as a cost one. The Firebase JS
SDK has no streaming upload on React Native, so the file passes through
`fetch(uri).blob()` and materializes whole in JS memory. 50 MB is comfortable on a modern
phone and survivable on a low-end Android; 200 MB is a crash report.

## 5. `services/media.ts` — the only module touching Storage

```ts
pickMedia(opts: { allowVideo: boolean }): Promise<PickedMedia | null>
uploadMedia(slot, picked, onProgress?): Promise<MediaAsset>
deleteMedia(asset: MediaAsset): Promise<void>   // best-effort, never throws
```

`uploadMedia` is the whole pipeline: compress or generate a poster, check limits,
`uploadBytesResumable` (two objects for video), report `bytesTransferred / totalBytes`
through `onProgress`, resolve download URLs, return the `MediaAsset`. Resumable rather than
`uploadBytes` because a 50 MB clip on transit wifi without a progress bar reads as a hung app.

`services/photos.ts` shrinks to `captureImage()` for ID verification, which stays
local-only and is never uploaded. `uploadProfilePhoto` and `pickImage` fold into
`services/media.ts`; their two call sites move over.

### Error handling

A deliberate correction to current behaviour. A failed upload **never blocks the
surrounding flow** — you can still finish creating your profile, still send the message —
but it is **always visible**, naming the actual cause: too large, too long, offline, or
permission denied. `deleteMedia` is the sole exception: it swallows not-found by design,
because failing to delete something already gone is not a failure.

## 6. Components

All token-only, so the empty allowlist in `__tests__/constants/tokens.test.ts` stays empty.

- **`MediaThumb`** — renders `thumbURL` in a reserved aspect box; play badge and duration
  when `type === 'video'`; ink tile with a play badge when `thumbURL === ''`. Used by every
  surface. One component is why four surfaces do not drift into four play buttons.
- **`MediaSlotPicker`** — tap-to-add tile that becomes a `MediaThumb` with a remove
  affordance once filled, with a determinate progress bar during upload. Used by the profile
  vibe grid, the venue gallery and the event cover field.
- **`MediaViewer`** — fullscreen modal: `useVideoPlayer` + `VideoView` for clips, full-bleed
  `Image` for photos. Reached from all four surfaces.

Chat gets its own composer affordance rather than reusing `MediaSlotPicker`. A slot grid and
a send-attachment button are different interactions; forcing one component to be both is how
you get a `variant` prop meaning "ignore half my props".

## 7. Storage rules

Full replacement of `storage.rules`:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    function signedIn()      { return request.auth != null; }
    function ownedBy(uid)    { return signedIn() && request.auth.uid == uid; }
    function isImage()       { return request.resource.contentType.matches('image/.*'); }
    function isVideo()       { return request.resource.contentType.matches('video/.*'); }
    function imageUnder(mb)  { return isImage() && request.resource.size < mb * 1024 * 1024; }
    function validMedia()    { return imageUnder(5)
                                 || (isVideo() && request.resource.size < 50 * 1024 * 1024); }

    match /profilePhotos/{uid}/{file} {
      allow read: if signedIn();
      allow create, update: if ownedBy(uid) && (
        (file == 'avatar.jpg'            && imageUnder(5)) ||
        (file.matches('vibe[0-2]')       && validMedia())  ||
        (file.matches('vibe[0-2]_thumb') && imageUnder(5))
      );
      allow delete: if ownedBy(uid);
    }

    match /eventCovers/{hosterUid}/{eventId}/{file} {
      allow read: if signedIn();
      allow create, update: if ownedBy(hosterUid) && (
        (file == 'cover'       && validMedia()) ||
        (file == 'cover_thumb' && imageUnder(5))
      );
      allow delete: if ownedBy(hosterUid);
    }

    match /venuePhotos/{uid}/{file} {
      allow read: if signedIn();
      allow create, update: if ownedBy(uid) && (
        (file.matches('[0-5]')       && validMedia()) ||
        (file.matches('[0-5]_thumb') && imageUnder(5))
      );
      allow delete: if ownedBy(uid);
    }

    match /chatMedia/{authorUid}/{threadId}/{file} {
      allow read: if signedIn();
      allow create, update: if ownedBy(authorUid) && (
        (file.matches('[A-Za-z0-9]+')       && validMedia()) ||
        (file.matches('[A-Za-z0-9]+_thumb') && imageUnder(5))
      );
      allow delete: if ownedBy(authorUid);
    }
  }
}
```

**Create/update is split from delete** for exactly the reason the socials rule in
`firestore.rules` already splits them: on a delete there is no `request.resource`, so
`validMedia()` raises an evaluation error rather than returning false.

**The filename is matched, not just the prefix.** `matches()` is a whole-string match, so
`vibe[0-2]` rejects `vibe0_thumb` and the clauses stay disjoint. The effect is that a
member's own prefix is not an open bucket — they can write a fixed set of object names under
it and nothing else. Without this, `allow write: if ownedBy(uid)` would make the bucket free
unbounded hosting for any signed-in account, which on Blaze is your bill.

The `chatMedia` clause leans on Firestore auto-ids being **alphanumeric only** (20 characters
drawn from a 62-symbol alphabet), which is what lets `[A-Za-z0-9]+` bound the name while
staying disjoint from the `_thumb` variant. If message ids ever stop being auto-generated,
this pattern must be revisited.

### Known limitation: chat media reads are not membership-gated

Reads are `signedIn()` everywhere, **including `chatMedia`**. A DM attachment is protected
by the unguessable token in its download URL, not by a conversation-membership check,
because Storage rules cannot `get()` a Firestore document. This is the same posture
`profiles/{uid}` already takes. True gating would require a Function serving bytes or
signed URLs — a different design, deliberately out of scope, and accepted knowingly.

## 8. Surfaces

### Profile

`edit-profile.tsx` gains a three-slot 4:5 grid of `MediaSlotPicker` and writes
`vibePhotos: MediaAsset[]` on save. `member/[uid].tsx` already renders the gallery — its
`<Image>` becomes a `<MediaThumb>` opening `MediaViewer` on tap; the same swap happens on
the attender's own profile tab. The avatar keeps its path and 1:1 crop and moves onto
`services/media.ts`, gaining progress and the visible error it should always have had.

### Event cover — full-bleed stub

`create-event.tsx` gains an optional 16:9 cover field.

**Ordering:** the storage path needs the `eventId`, which today does not exist until submit.
Mint the ref with `doc(collection(db, 'events'))` first, upload against that id, then
`setDoc` on the ref already held. `createEvent` in `services/events.ts` takes the pre-made
ref rather than generating its own.

`EventCard` renders the cover as a full-bleed stub **above the tear line** — the perforation
separating image from details is what a perforation is for, and the notches keep their
meaning. The card is byte-identical to today's when `cover` is absent.

On `event/[id]`, the cover is a full-bleed band at the **top** of the hero with the ink block
beneath it. Deliberately above: the notch seam stays at the ink/field boundary, so the
codemap's note about those notches being painted `orangeDeep` remains true.

`deleteEvent` deletes the cover and its poster in the same flow.

**Scope limit:** there is no edit-event route in this app, only create and delete. A cover is
set at creation and changed by deleting the event, exactly like every other event field
today. Building an edit screen is separate work and is not in scope here.

### Venue

`venue-setup.tsx` gains up to six gallery slots; `(hoster)/venue.tsx` renders them. Because
no attender-facing screen renders a venue today, `event/[id]` also gains a compact
horizontal strip beneath the venue name — without it a hoster would be uploading pictures
only they will ever see.

### Chat — inset in the bubble

The composer gains an attach button left of the input; `send` stops being gated on
`draft.trim()` alone once an attachment is staged. Flow mirrors the event cover: mint the
message ref, upload to `chatMedia/{authorUid}/{threadId}/{messageId}`, then write the doc.

While the upload runs the thread shows an **optimistic bubble** backed by the local URI with
a determinate progress bar — state local to `chat/[id].tsx`, never written to Firestore. A
50 MB clip is slow enough that a thread which appears to do nothing reads as broken.

`ChatBubble` gains `media?: MediaAsset` and `uploadProgress?: number`, rendering the media
inset **inside the existing bubble padding**, above the caption. The bubble keeps its
geometry — ink with a clipped top-right for self, `orangeLight` with a hairline and a
clipped top-left for others — and simply gains a child.

`lastMessageText` receives `mediaPreviewLabel()` for an attachment-only message so the chat
list row reads **PHOTO** or **VIDEO** rather than blank. A caption, when present, wins.

`onNewDirectMessage.ts` currently pushes `message.text || ''`, which would send an empty push
body for an attachment-only message. Because `functions/` is a separate workspace and cannot
import from the app, it gets its own four-line label helper plus a test rather than a shared
import. `onNewAnnouncement.ts` is untouched — announcements carry no media.

## 9. Lifecycle and orphans

Deterministic paths do most of the work: replacing an avatar, vibe slot, venue tile or cover
overwrites the same object. `deleteEvent` cleans up covers, and a Firestore write that fails
after a successful upload calls `deleteMedia` in its catch.

**Two cases orphan, knowingly.** DM messages are deletable by *either* participant, but
`chatMedia/{authorUid}/…` is writable only by its author — so deleting a message someone else
sent cannot delete their object. `declineRequest` has the same problem: it wipes the
conversation including the requester's attachments. There is no rules-level fix, for the same
reason reads are not membership-gated.

**Accepted for now.** A declined request holds a handful of objects; at 5 MB and 50 MB
ceilings accumulation is bounded and slow, and Storage is ~$0.026/GB-month.

**Named follow-up, not built here:** an `onDocumentDeleted('conversations/{c}/messages/{m}')`
Function deleting via the Admin SDK, which bypasses rules and covers every case at once.
Roughly forty lines plus tests, but a `declineRequest` batch of 400 message deletes becomes
400 invocations. Add it when there is data saying it matters.

Account deletion is not a feature of this app, so no erasure path is in scope.

## 10. Testing

- **`__tests__/utils/media.test.ts`** — every slot kind's path, every preset, limit
  boundaries on both sides (5 MB and 5 MB + 1, 60 s and 61 s), legacy coercion, preview labels.
- **`__tests__/services/media.test.ts`** — mocked SDK, in the shape of the existing
  `photos.test.ts`: an image uploads one object; a video uploads two; `onProgress` fires; an
  over-limit file is rejected **before** any network call; a failed poster yields
  `thumbURL === ''` and still uploads. Boundary cases assert the strict inequality —
  5 MB − 1 accepted, exactly 5 MB rejected — so client and rules cannot drift apart.
- **Components** — `MediaThumb` (play badge iff video, duration formatting, empty-thumb
  fallback), `MediaSlotPicker` (empty → filled → uploading → remove), `ChatBubble` with media,
  `EventCard` showing the stub if and only if a cover exists.
- **Rules** — new `__tests__/rules/storage.rules.test.ts` via `@firebase/rules-unit-testing`
  against the storage emulator already declared on port 9199 in `firebase.json`. The
  `test:rules` script widens from `--only firestore` to `--only firestore,storage`.
- **Functions** — a test for the push label fallback.

Existing suites must stay green: 62 suites / 484 tests, `npx tsc --noEmit` clean.

## 11. Phases

Each is independently shippable.

1. **Foundation** — deps, types, `utils/media.ts`, `services/media.ts`, `storage.rules`, the
   three components, avatar migrated off `photos.ts`. Deploy rules.
2. **Profile** vibe media.
3. **Event cover** — create-event, the `EventCard` stub, the detail hero band, delete cleanup.
4. **Venue** gallery plus the event-detail strip.
5. **Chat** attachments — composer, inset bubble, optimistic progress, `lastMessageText`,
   push fallback.

Chat is last because it is the only phase that changes the `Message` shape and touches Cloud
Functions; every phase before it exercises the same foundation on easier ground.
