import { CLOUD_PROMPTS, type CloudPrompt, type PromptRole } from '../constants/cloudPrompts'
import type { SeenPrompts } from '../services/cloudPromptsSeen'

/**
 * Whether the cloud may speak at all, and if so which hint it should raise.
 *
 * Pure, and takes its catalogue and its session clock as arguments, which is the same
 * split `utils/authRoute.ts` uses: all the policy is testable without a renderer, a device
 * or a Firestore connection, and the watcher above it is a thin effect wrapper.
 *
 * Prompts are a FIRST-RUN feature. They appear during the first session an account ever
 * has on this device and then never again — no behavioural nudges, no cooldowns, nothing
 * that can surface for a returning user.
 */

/**
 * When this app process started, captured at import. A "session" is a process lifetime:
 * backgrounding and resuming the app keeps the same one, and a relaunch (or an OS kill)
 * starts a new one. That is what makes a stored start marker answerable — a marker written
 * at or after this instant belongs to the run happening now.
 */
export const SESSION_STARTED_AT = Date.now()

export interface FirstRunInput {
  seen: SeenPrompts
  /** `SESSION_STARTED_AT` in production; a fixed number in tests. */
  sessionStartedAt: number
}

export function isFirstRun({ seen, sessionStartedAt }: FirstRunInput): boolean {
  if (seen.firstRunDone) return false

  // No marker: either nothing has ever been shown on this device, or the record predates
  // first-run tracking. A record carrying hints it has already shown is the second case —
  // an account that was using the app before this, which must not be handed the tour.
  if (!seen.firstRunStartedAt) return seen.coaching.length === 0

  const startedAt = Date.parse(seen.firstRunStartedAt)
  // A corrupt marker cannot prove this is still the first session, and the user has asked
  // for popups to stop, so silence is the safe reading. Note this is the OPPOSITE call
  // from the nudge cooldown it replaced, which treated corruption as "no cooldown": there
  // the risk was silencing a prompt forever, here it is showing one that is not wanted.
  if (Number.isNaN(startedAt)) return false

  return startedAt >= sessionStartedAt
}

export interface PickPromptInput extends FirstRunInput {
  /** `usePathname()`, with group segments already stripped by expo-router. */
  route: string
  role: PromptRole
  /** Injectable for tests. Defaults to the real catalogue. */
  catalogue?: readonly CloudPrompt[]
}

export function pickPrompt(input: PickPromptInput): CloudPrompt | null {
  if (!isFirstRun(input)) return null

  const catalogue = input.catalogue ?? CLOUD_PROMPTS
  return (
    catalogue.find(
      (p) => p.role === input.role && p.routes.includes(input.route) && !input.seen.coaching.includes(p.id),
    ) ?? null
  )
}
