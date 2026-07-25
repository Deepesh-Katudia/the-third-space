// Deterministic avatar styling for initial-based avatars (Storage is not provisioned,
// so photoURL is often null). The same seed always yields the same color, so a given
// person looks consistent across screens.
// Every entry carries white initials at AA (>= 4.5:1).

const AVATAR_PALETTE = [
  '#C2410C', // orange
  '#1F7A4C', // green
  '#9A5B0E', // amber
  '#5B3E9B', // plum
  '#2A4FBF', // blue
  '#B02A63', // pink
  '#2F6E6E', // teal
  '#6D4AA6', // violet
] as const

/** Exported for the contrast test — every entry must carry white initials at AA. */
export const AVATAR_PALETTE_FOR_TEST = AVATAR_PALETTE

export function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length]
}

export function initials(nameOrSeed: string): string {
  const parts = nameOrSeed.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
