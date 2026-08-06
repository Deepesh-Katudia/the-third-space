import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Which cloud prompts this device has already shown.
 *
 * Local, not Firestore, for the same reason `services/rewardsSeen.ts` is local: this
 * decides whether a PRESENTATION plays, not what is true about the account. A new
 * device replaying one coaching hint is harmless — whereas a Firestore write here
 * would mean new rules, new failure modes, and a hint lost to a dropped connection.
 *
 * Two halves, because the two kinds forget differently. Coaching is a flat seen-set:
 * there is no second showing, so there is nothing to time. Nudges keep a timestamp per
 * id, because their condition can stay true indefinitely and something has to stop
 * "you have no profile photo" from firing on every single Profile visit.
 *
 * Keyed per uid so two accounts on one phone do not eat each other's prompts.
 */
const KEY_PREFIX = 'cloudPrompts:'

export interface SeenPrompts {
  /** Coaching ids already shown. Order is insertion order; nothing depends on it. */
  coaching: string[]
  /** Nudge id -> ISO8601 of its last firing. */
  nudges: Record<string, string>
}

const empty = (): SeenPrompts => ({ coaching: [], nudges: {} })

function key(uid: string): string {
  return KEY_PREFIX + uid
}

/**
 * Narrows an unknown parsed record field by field. A partially corrupt record keeps
 * whatever is still well-formed rather than being thrown away wholesale — losing one
 * bad entry replays one cloud, losing the record replays all of them.
 */
function parse(raw: string): SeenPrompts {
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return empty()

  const record = parsed as { coaching?: unknown; nudges?: unknown }

  const coaching = Array.isArray(record.coaching)
    ? record.coaching.filter((id): id is string => typeof id === 'string')
    : []

  const nudges: Record<string, string> = {}
  if (typeof record.nudges === 'object' && record.nudges !== null && !Array.isArray(record.nudges)) {
    for (const [id, when] of Object.entries(record.nudges as Record<string, unknown>)) {
      if (typeof when === 'string') nudges[id] = when
    }
  }

  return { coaching, nudges }
}

export async function getSeenPrompts(uid: string): Promise<SeenPrompts> {
  try {
    const raw = await AsyncStorage.getItem(key(uid))
    if (!raw) return empty()
    return parse(raw)
  } catch {
    // An unreadable record must not block the screen. Treating it as empty replays a
    // cloud at worst; throwing would take the route down with it.
    return empty()
  }
}

async function write(uid: string, next: SeenPrompts): Promise<void> {
  try {
    await AsyncStorage.setItem(key(uid), JSON.stringify(next))
  } catch {
    // A failed write means the cloud may repeat next launch. Acceptable; a thrown error
    // here would surface as a crash right after a friendly moment.
  }
}

/** Union, not append — repeated calls with the same id stay idempotent. */
export async function markCoachingSeen(uid: string, id: string): Promise<void> {
  const existing = await getSeenPrompts(uid)
  if (existing.coaching.includes(id)) {
    await write(uid, existing)
    return
  }
  await write(uid, { ...existing, coaching: [...existing.coaching, id] })
}

/** Overwrites, not accumulates — only the most recent firing can start a cooldown. */
export async function markNudgeFired(uid: string, id: string, when: Date): Promise<void> {
  const existing = await getSeenPrompts(uid)
  await write(uid, { ...existing, nudges: { ...existing.nudges, [id]: when.toISOString() } })
}
