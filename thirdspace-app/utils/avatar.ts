// Deterministic avatar styling for mock/initial-based avatars (Phase 1 has no
// uploaded photos). Same seed always yields the same warm-palette color so a
// given person looks consistent across screens.

const AVATAR_PALETTE = [
  '#C4614A', // terracotta
  '#7A8C6E', // sage
  '#C99A2E', // gold
  '#6B5B95', // plum
  '#3F6C9B', // blue
  '#B5651D', // amber
  '#588B8B', // teal
  '#A0673A', // light brown
] as const

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
