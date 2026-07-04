export function followDocId(follower: string, target: string): string {
  return `${follower}_${target}`
}

// Connections = mutual follows. Preserves followingUids order for stable UI.
export function mutualConnections(followingUids: string[], followerUids: string[]): string[] {
  const followers = new Set(followerUids)
  return followingUids.filter((uid) => followers.has(uid))
}
