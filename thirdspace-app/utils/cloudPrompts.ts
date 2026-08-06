import { CLOUD_PROMPTS, type CloudPrompt, type PromptRole, type PromptState } from '../constants/cloudPrompts'
import type { SeenPrompts } from '../services/cloudPromptsSeen'

/**
 * Which cloud — if any — should fire on this route, for this account, right now.
 *
 * Pure, and takes its catalogue and its clock as arguments, which is the same split
 * `utils/authRoute.ts` uses: all the policy is testable without a renderer, a device or
 * a Firestore connection, and the watcher above it is a thin effect wrapper.
 */

/** How long a nudge stays quiet after firing. */
export const NUDGE_COOLDOWN_DAYS = 3

const DAY_MS = 24 * 60 * 60 * 1000

export interface PickPromptInput {
  /** `usePathname()`, with group segments already stripped by expo-router. */
  route: string
  role: PromptRole
  state: PromptState
  seen: SeenPrompts
  now: Date
  /** Injectable for tests. Defaults to the real catalogue. */
  catalogue?: readonly CloudPrompt[]
}

function cooldownExpired(lastFired: string | undefined, now: Date): boolean {
  if (!lastFired) return true
  const at = Date.parse(lastFired)
  // An unparseable timestamp must not silence a nudge forever — a corrupt record is
  // not a statement that the user has seen something.
  if (Number.isNaN(at)) return true
  return now.getTime() - at >= NUDGE_COOLDOWN_DAYS * DAY_MS
}

export function pickPrompt(input: PickPromptInput): CloudPrompt | null {
  const catalogue = input.catalogue ?? CLOUD_PROMPTS
  const here = catalogue.filter((p) => p.role === input.role && p.routes.includes(input.route))

  // Coaching first, always. Somebody who has never seen this screen needs to know what
  // it is before being told what to do on it.
  const coaching = here.find((p) => p.kind === 'coaching' && !input.seen.coaching.includes(p.id))
  if (coaching) return coaching

  const eligible = here.filter(
    (p) =>
      p.kind === 'nudge' &&
      (p.condition?.(input.state, input.now) ?? false) &&
      cooldownExpired(input.seen.nudges[p.id], input.now),
  )
  if (eligible.length === 0) return null

  // Lower number wins. `<` is strict, so a tie keeps the earlier catalogue entry —
  // though the catalogue test requires distinct priorities, so ties should not arise.
  const rank = (p: CloudPrompt) => p.priority ?? Number.MAX_SAFE_INTEGER
  return eligible.reduce((best, p) => (rank(p) < rank(best) ? p : best))
}
