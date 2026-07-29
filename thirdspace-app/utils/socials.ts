import { SocialHandles, SocialPlatform } from '../types/models'

export interface SocialPlatformSpec {
  id: SocialPlatform
  label: string
  /** Public profile URL. Universal links hand off to the native app when installed. */
  urlPrefix: string
  /** Tested against an already-normalized (lowercased, bare) handle. */
  pattern: RegExp
}

/**
 * Ordered, and the single source both the edit form and the chip row read — so the
 * two cannot drift out of sync as platforms are added or removed.
 */
export const SOCIAL_PLATFORMS: SocialPlatformSpec[] = [
  { id: 'instagram', label: 'Instagram', urlPrefix: 'https://instagram.com/', pattern: /^[a-z0-9._]{1,30}$/ },
  { id: 'tiktok', label: 'TikTok', urlPrefix: 'https://tiktok.com/@', pattern: /^[a-z0-9._]{2,24}$/ },
  { id: 'x', label: 'X', urlPrefix: 'https://x.com/', pattern: /^[a-z0-9_]{1,15}$/ },
]

const HOST_PREFIX = /^(https?:\/\/)?(www\.)?(instagram\.com|tiktok\.com|x\.com|twitter\.com)\//i

function specFor(platform: SocialPlatform): SocialPlatformSpec | undefined {
  return SOCIAL_PLATFORMS.find((p) => p.id === platform)
}

/**
 * Absorbs what people actually paste — '@handle', a full profile URL, stray
 * whitespace, mixed case — and returns the bare handle. Rejecting a pasted URL
 * would be technically correct and practically hostile.
 */
export function normalizeHandle(raw: string): string {
  return raw
    .trim()
    .replace(HOST_PREFIX, '')
    .replace(/^@+/, '')
    .replace(/\/+$/, '')
    .trim()
    .toLowerCase()
}

export function isValidHandle(platform: SocialPlatform, handle: string): boolean {
  const spec = specFor(platform)
  return spec ? spec.pattern.test(handle) : false
}

export function socialUrl(platform: SocialPlatform, handle: string): string {
  const spec = specFor(platform)
  return spec ? `${spec.urlPrefix}${handle}` : ''
}

/** Whether there is anything worth rendering a Socials section for. */
export function hasAnyHandle(handles: SocialHandles): boolean {
  return SOCIAL_PLATFORMS.some((p) => Boolean(handles[p.id]))
}

export interface SocialSeedState {
  hasUid: boolean
  loading: boolean
  /** True only once a read actually SUCCEEDED — the rules allowed it and data arrived. */
  visible: boolean
  seeded: boolean
}

/**
 * Whether the edit form may copy loaded handles into its inputs.
 *
 * `visible` is the load-bearing condition. Without it the form seeds blanks from a
 * read that never succeeded — no uid yet, offline, or rules-denied all present as
 * `loading: false, handles: {}` — latches `seeded`, and the next save overwrites the
 * member's real handles with nothing, because setSocials is a full overwrite.
 */
export function shouldSeedSocials(state: SocialSeedState): boolean {
  return !state.seeded && state.hasUid && !state.loading && state.visible
}
