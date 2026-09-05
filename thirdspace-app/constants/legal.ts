/**
 * Every legal and support URL, and the terms version.
 *
 * This is the ONLY file in which a legal URL may be written — the same rule
 * `constants/design.ts` holds over colour, and for the same reason: a policy link repeated
 * across three screens is how one of them ends up pointing at a domain nobody renewed.
 *
 * ⚠️ `LEGAL_SITE` IS A PLACEHOLDER UNTIL THE COMPANY SITE SHIPS. App Review OPENS these
 * links, and the pages must exist, be reachable, and describe the data the app actually
 * collects — email address, name, phone number, photographs and video, precise location,
 * user-generated content and device identifiers. Until the site is live these URLs 404,
 * which is a release blocker in its own right and not a code problem. Confirm the domain,
 * change this one line, and the whole app follows.
 */
export const LEGAL_SITE = 'https://yourthirdspace.app'

export const PRIVACY_POLICY_URL = `${LEGAL_SITE}/privacy`
export const TERMS_URL = `${LEGAL_SITE}/terms`

/**
 * Guideline 1.2's fourth requirement: published contact information, reachable from inside
 * the app. It is also where a report notification tells a member to follow up.
 */
export const SUPPORT_URL = `${LEGAL_SITE}/support`

/**
 * Stamped onto the user document at sign-up alongside the timestamp. A date rather than a
 * boolean, because a boolean cannot answer "did they accept THESE terms" once the terms
 * change — which is what a re-acceptance prompt needs to know.
 *
 * Bump this when the published terms change in substance, not when a typo is fixed.
 */
export const TERMS_VERSION = '2026-09-05'
