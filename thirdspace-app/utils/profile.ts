import { MessagePrivacy } from '../types/models'

// Whole-years age from a date of birth. `now` is injectable for testing.
export function ageFromDOB(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--
  }
  return age
}

// Default applied to profiles created before the message-privacy setting existed.
export const DEFAULT_MESSAGE_PRIVACY: MessagePrivacy = 'event-mates'

export const MESSAGE_PRIVACY_OPTIONS: { value: MessagePrivacy; label: string; hint: string }[] = [
  { value: 'everyone', label: 'Everyone', hint: 'Anyone on Your Third Space can send you a message request.' },
  { value: 'event-mates', label: 'Event-mates', hint: 'Only people attending the same events can reach you.' },
  { value: 'no-one', label: 'No one', hint: 'Turn off new message requests entirely.' },
]

// Short label for a stored (or absent) privacy value; used on the profile row.
export function messagePrivacyLabel(value: MessagePrivacy | undefined): string {
  const resolved = value ?? DEFAULT_MESSAGE_PRIVACY
  return MESSAGE_PRIVACY_OPTIONS.find((o) => o.value === resolved)?.label ?? 'Event-mates'
}
