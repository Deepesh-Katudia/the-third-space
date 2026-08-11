/**
 * The ONE implementation of the attachment label, compiled by both the Expo app and
 * the Cloud Functions workspace. It fills `lastMessageText` for a chat-list row and
 * the push body for an attachment-only message — two places that must never disagree
 * about whether something is a PHOTO or a VIDEO.
 *
 * ZERO IMPORTS, deliberately. This file is compiled twice under two different
 * tsconfigs (the app's Expo base; functions' es2021/commonjs), so anything it imported
 * would have to resolve under both. It also takes a structural `{ type?: string }`
 * rather than MediaAsset, because types/models.ts imports firebase/firestore for
 * Timestamp and Cloud Functions must not pull in the client SDK.
 *
 * Uppercase because every type role in this app is uppercase — a lowercase "Photo"
 * would be the only string in the codebase fighting the token.
 */
export function mediaLabel(media?: { type?: string } | null): string {
  if (!media) return ''
  if (media.type === 'video') return 'VIDEO'
  if (media.type === 'image') return 'PHOTO'
  return ''
}
