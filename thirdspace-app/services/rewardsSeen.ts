import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Which rewards this device has already celebrated.
 *
 * Local, not Firestore, and that is a deliberate trade: the unlock is a moment, not a
 * record. The roster itself is derived from real data and is correct everywhere; this
 * only decides whether the ceremony plays. Worst case on a new device is one replay of
 * rewards already earned, which is a nice surprise rather than a bug — whereas a
 * Firestore write here would mean new rules, new failure modes, and an unlock that can
 * be lost to a dropped connection.
 *
 * Keyed per uid so two accounts on one phone do not eat each other's unlocks.
 */
const KEY_PREFIX = 'rewardsSeen:'

export async function getSeenRewards(uid: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_PREFIX + uid)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is string => typeof id === 'string')
  } catch {
    // An unreadable record must not block the screen. Treating it as empty replays an
    // unlock at worst; throwing would leave the roster unrenderable.
    return []
  }
}

/** Union, not append — repeated calls with the same ids stay idempotent. */
export async function markRewardsSeen(uid: string, ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return
  try {
    const existing = await getSeenRewards(uid)
    const merged = Array.from(new Set([...existing, ...ids]))
    await AsyncStorage.setItem(KEY_PREFIX + uid, JSON.stringify(merged))
  } catch {
    // A failed write means the unlock may replay next launch. Acceptable; a thrown
    // error here would surface as a crash right after a celebration.
  }
}
