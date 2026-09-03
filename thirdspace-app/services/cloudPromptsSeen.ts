import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * What this device already knows about an account's cloud prompts: which hints it has
 * shown, and whether the account's FIRST RUN — the one session prompts are allowed in —
 * has started and finished.
 *
 * Local, not Firestore, for the same reason `services/rewardsSeen.ts` is local: this
 * decides whether a PRESENTATION plays, not what is true about the account. A reinstall
 * replaying the tour is harmless — whereas a Firestore write here would mean new rules,
 * new failure modes, and a hint lost to a dropped connection.
 *
 * There used to be a second half, `nudges`, mapping a nudge id to when it last fired so a
 * 3-day cooldown could be enforced. The nudges are gone, so the map is too; `parse` simply
 * ignores it on a record written by the old build. What such a record still supplies is a
 * non-empty `coaching` list, which is precisely how `isFirstRun` recognises an account
 * that was using the app before first runs were tracked.
 *
 * Keyed per uid so two accounts on one phone do not eat each other's prompts.
 */
const KEY_PREFIX = 'cloudPrompts:'

export interface SeenPrompts {
  /** Hint ids already shown. Order is insertion order; nothing depends on it. */
  coaching: string[]
  /**
   * ISO8601 of when the first run began, written the first time a prompt decision is made
   * for a device that has never made one. Absent means either a brand-new install or a
   * record from the old build — `coaching` is what tells those two apart.
   */
  firstRunStartedAt?: string
  /** True once the first run is over. Nothing reopens it. */
  firstRunDone: boolean
}

const empty = (): SeenPrompts => ({ coaching: [], firstRunDone: false })

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

  const record = parsed as { coaching?: unknown; firstRunStartedAt?: unknown; firstRunDone?: unknown }

  const coaching = Array.isArray(record.coaching)
    ? record.coaching.filter((id): id is string => typeof id === 'string')
    : []

  return {
    coaching,
    ...(typeof record.firstRunStartedAt === 'string' ? { firstRunStartedAt: record.firstRunStartedAt } : {}),
    firstRunDone: record.firstRunDone === true,
  }
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

/**
 * Stamps the beginning of the first run, once. Restamping on each screen of the tour
 * would roll the window forward and make the "first session" last as long as the user
 * kept navigating, which is the one thing the marker exists to bound.
 */
export async function beginFirstRun(uid: string, when: Date): Promise<void> {
  const existing = await getSeenPrompts(uid)
  if (existing.firstRunStartedAt) {
    await write(uid, existing)
    return
  }
  await write(uid, { ...existing, firstRunStartedAt: when.toISOString() })
}

/**
 * Ends the first run permanently. Called the first time a launch turns out not to be the
 * first one, so every later navigation can be answered from the flag alone rather than by
 * comparing clocks again.
 */
export async function closeFirstRun(uid: string): Promise<void> {
  const existing = await getSeenPrompts(uid)
  await write(uid, { ...existing, firstRunDone: true })
}
