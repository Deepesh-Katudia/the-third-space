import { MASCOT_FIGURES } from './mascotFigures'

/**
 * The reward roster. Figures live in mascotFigures.ts; this is what each one MEANS.
 *
 * Source: docs/rewards_avatar.html for the characters and their one-line descriptions,
 * docs/reward_screen.html for the unlock frame. The `eyebrow` and `prompt` lines are
 * written here rather than taken from the comp, which only showed four examples.
 *
 * `trackable` is the honest bit. Most of this roster describes behaviour the app does
 * not record yet — message-partner counts, RSVP timing, plan changes. Those ship visible
 * but permanently locked rather than quietly earning themselves on wrong data. When the
 * tracking lands, flip the flag and add the rule in utils/rewards.ts.
 */
export interface Achievement {
  id: string
  /** Display name. Stored title case, rendered uppercase by the type tokens. */
  name: string
  /** One line, from the comp's roster. Shown under the figure in the grid. */
  blurb: string
  /** Small line above the title in the unlock modal. Varies to keep the moment fresh. */
  eyebrow: string
  /** The unlock modal's body copy. Second person, past tense, two short lines. */
  prompt: string
  points: number
  /** False when nothing in the app can evaluate `blurb` yet. */
  trackable: boolean
}

/**
 * Order is the comp's: the keepers first, then the onboarding set. Roughly "most
 * meaningful" to "most incidental", which is also the order the grid reads in.
 */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-event',
    name: 'First Event',
    blurb: 'Attended your first event on Your Third Space',
    eyebrow: 'It begins',
    prompt: 'You showed up.\nThat was the hard part.',
    points: 50,
    trackable: true,
  },
  {
    id: 'the-welcomer',
    name: 'The Welcomer',
    blurb: 'Hosted your first event',
    eyebrow: 'A milestone, reached',
    prompt: 'Hosted your first event.\nSomeone had to go first.',
    points: 100,
    trackable: false,
  },
  {
    id: 'new-friend',
    name: 'New Friend',
    blurb: 'Added your first friend',
    eyebrow: 'Two-way street',
    prompt: 'You followed someone\nand they followed back.',
    points: 40,
    trackable: true,
  },
  {
    id: 'stage',
    name: 'Stage',
    blurb: 'Attended your first Stage event',
    eyebrow: 'Front row',
    prompt: 'You sat through a set\nyou had no idea about.',
    points: 50,
    trackable: true,
  },
  {
    id: 'eat',
    name: 'Eat',
    blurb: 'Attended your first Eat event',
    eyebrow: 'Well fed',
    prompt: 'You ate with people\nyou had only just met.',
    points: 50,
    trackable: true,
  },
  {
    id: 'touch-grass',
    name: 'Touch Grass',
    blurb: 'Attended your first Touch Grass event',
    eyebrow: 'Outside, finally',
    prompt: 'You left the city\nand came back better.',
    points: 50,
    trackable: true,
  },
  {
    id: 'experimenter-of-variety',
    name: 'Experimenter of Variety',
    blurb: 'Attended an event from every category',
    eyebrow: 'The full set',
    prompt: 'Every category, at least once.\nNobody does this by accident.',
    points: 150,
    trackable: true,
  },
  {
    id: 'consistent-one',
    name: 'Consistent One',
    // Reworded from the comp's "Never missed an RSVP'd event for 3 months straight".
    // The app knows what you attended, not what you skipped, so the original claim
    // could not be made truthfully.
    blurb: 'Attended 5 events',
    eyebrow: 'Reliable',
    prompt: 'Five events in.\nYou keep turning up.',
    points: 100,
    trackable: true,
  },
  {
    id: 'the-connector',
    name: 'The Connector',
    // Reworded from "Introduced two members who clicked" — introductions are not
    // recorded anywhere, but mutual connections are.
    blurb: 'Made 3 mutual connections',
    eyebrow: 'The middle of it',
    prompt: 'Three people follow you back.\nThat is a small scene.',
    points: 75,
    trackable: true,
  },
  {
    id: 'community-legend',
    name: 'Community Legend',
    // Reworded from "Messaged 100+ different members" — message-partner counts are not
    // tracked. The crown suits the top tier, which is tracked.
    blurb: 'Reached the Insider tier',
    eyebrow: 'The top of the ladder',
    prompt: 'Insider.\nThere is nothing above this one.',
    points: 250,
    trackable: true,
  },
  {
    id: 'third-space-veteran',
    name: 'Third Space Veteran',
    blurb: 'Been with us for a full year',
    eyebrow: 'One year on',
    prompt: 'A full year since you joined.\nStill here.',
    points: 200,
    trackable: true,
  },

  // ---- Visible, but nothing records these yet. -------------------------------------
  {
    id: 'host',
    name: 'Host',
    // The comp ships TWO characters for "hosted your first event" — this one and The
    // Welcomer. Rather than drop a figure, this is the repeat-host milestone.
    blurb: 'Hosted 5 events',
    eyebrow: 'Room-builder',
    prompt: 'Five rooms, filled.\nPeople come because you asked.',
    points: 200,
    trackable: false,
  },
  {
    id: 'community-creator',
    name: 'Community Creator',
    blurb: 'Messaged 50+ different members',
    eyebrow: 'A whole network',
    prompt: 'Fifty different people.\nYou built this yourself.',
    points: 200,
    trackable: false,
  },
  {
    id: 'the-initiator',
    name: 'The Initiator',
    blurb: 'First to break the ice in 10+ new group chats',
    eyebrow: 'First word',
    prompt: 'Ten silent group chats.\nYou spoke first in all of them.',
    points: 125,
    trackable: false,
  },
  {
    id: 'spark-starter',
    name: 'Spark Starter',
    blurb: 'Kicked off a spontaneous plan that got 5+ RSVPs',
    eyebrow: 'From nothing',
    prompt: 'You had an idea at noon.\nFive people said yes by six.',
    points: 100,
    trackable: false,
  },
  {
    id: 'wave-rider',
    name: 'Wave Rider',
    blurb: 'Rolled with 3 last-minute plan changes without missing the event',
    eyebrow: 'Unbothered',
    prompt: "Rolled with 3 last-minute\nchanges without missing a beat.",
    points: 60,
    trackable: false,
  },
  {
    id: 'clover-luck',
    name: 'Clover Luck',
    blurb: 'Randomly matched into a group that became regulars',
    eyebrow: 'Pure chance',
    prompt: 'A random group became\nyour regular one.',
    points: 80,
    trackable: false,
  },
  {
    id: 'sweet-talker',
    name: 'Sweet Talker',
    blurb: 'Got 5 people to say yes to an event in one day',
    eyebrow: 'Persuasive',
    prompt: 'Five yeses in one day.\nHow.',
    points: 90,
    trackable: false,
  },
  {
    id: 'spiral-thinker',
    name: 'Spiral Thinker',
    blurb: 'Went down a rabbit hole in a Learn event Q&A',
    eyebrow: 'Still thinking about it',
    prompt: 'The Q&A ended an hour ago.\nYou are still asking.',
    points: 60,
    trackable: false,
  },
  {
    id: 'fast-rsvp',
    name: 'Fast RSVP',
    blurb: 'Snagged a spot on an event that filled in under 5 minutes',
    eyebrow: 'Quick hands',
    prompt: 'It sold out in four minutes.\nYou were already in.',
    points: 75,
    trackable: false,
  },
  {
    id: 'wild-card',
    name: 'Wild Card',
    blurb: "RSVP'd to an event completely outside your usual categories",
    eyebrow: 'A milestone, reached',
    prompt: "You RSVP'd completely outside\nyour usual categories.",
    points: 75,
    trackable: false,
  },
  {
    id: 'first-chat',
    name: 'First Chat',
    blurb: 'Joined your first group chat',
    eyebrow: 'In the room',
    prompt: 'You joined the group chat.\nNow read 200 messages.',
    points: 30,
    trackable: false,
  },
  {
    id: 'first-message',
    name: 'First Message',
    blurb: 'Messaged a new person for the first time',
    eyebrow: 'Hello, then',
    prompt: 'You messaged someone new.\nThe worst they say is nothing.',
    points: 30,
    trackable: false,
  },
  {
    id: 'getting-social',
    name: 'Getting Social',
    blurb: 'Messaged 5+ different members',
    eyebrow: 'Warming up',
    prompt: 'Five different people.\nThis is how it starts.',
    points: 60,
    trackable: false,
  },
  {
    id: 'in-the-mix',
    name: 'In The Mix',
    blurb: 'Messaged 10+ different members',
    eyebrow: 'Properly in it',
    prompt: 'Ten different people.\nYou are in the mix now.',
    points: 100,
    trackable: false,
  },
]

export function achievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

/** Every roster entry must have a figure to draw, or the grid renders a hole. */
export function achievementsMissingFigures(): string[] {
  return ACHIEVEMENTS.filter((a) => !MASCOT_FIGURES[a.id]).map((a) => a.id)
}
