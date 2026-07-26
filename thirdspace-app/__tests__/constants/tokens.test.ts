import { readdirSync, readFileSync, statSync } from 'fs'
import { join } from 'path'

/**
 * Files still carrying literal colors from the Poppins design system. Each conversion
 * task deletes its own entries. When this list is empty the rule is absolute, and any
 * new literal hex in app/ or components/ fails the build.
 *
 * DO NOT add entries. The list only ever shrinks.
 */
const NOT_YET_CONVERTED = [
  'app/(app)/(attender)/_layout.tsx',
  'app/(app)/(attender)/chats.tsx',
  'app/(app)/(attender)/index.tsx',
  'app/(app)/(attender)/my-events.tsx',
  'app/(app)/(attender)/profile.tsx',
  'app/(app)/(hoster)/_layout.tsx',
  'app/(app)/(hoster)/announcement/[id].tsx',
  'app/(app)/(hoster)/events.tsx',
  'app/(app)/(hoster)/index.tsx',
  'app/(app)/(hoster)/venue.tsx',
  'app/(app)/_layout.tsx',
  'app/(app)/badges.tsx',
  'app/(app)/become-host.tsx',
  'app/(app)/change-password.tsx',
  'app/(app)/chat/[id].tsx',
  'app/(app)/connections.tsx',
  'app/(app)/create-event.tsx',
  'app/(app)/edit-profile.tsx',
  'app/(app)/event/[id].tsx',
  'app/(app)/filters.tsx',
  'app/(app)/guest-list/[id].tsx',
  'app/(app)/member/[uid].tsx',
  'app/(app)/message-privacy.tsx',
  'app/(app)/message-requests.tsx',
  'app/(app)/settings.tsx',
  'app/(app)/venue-setup.tsx',
  'app/(app)/verify-identity.tsx',
  'app/(auth)/_layout.tsx',
  'app/(auth)/create-profile.tsx',
  'app/(auth)/forgot-password.tsx',
  'app/(auth)/onboarding.tsx',
  'app/(auth)/role-select.tsx',
  'app/(auth)/sign-in.tsx',
  'app/(auth)/sign-up.tsx',
  'app/_layout.tsx',
  'components/AnnouncementBanner.tsx',
  'components/AttendeeAvatarStack.tsx',
  'components/AuthButton.tsx',
  'components/BadgeGrid.tsx',
  'components/Banner.tsx',
  'components/CategoryTabs.tsx',
  'components/ChatBubble.tsx',
  'components/ChatRow.tsx',
  'components/CompactEventRow.tsx',
  'components/EmptyState.tsx',
  'components/FilterSheet.tsx',
  'components/FormInput.tsx',
  'components/InterestChip.tsx',
  'components/LoadingView.tsx',
  'components/MemberProfileCard.tsx',
  'components/OnboardingSlide.tsx',
  'components/PasswordStrengthMeter.tsx',
  'components/PillTabButton.tsx',
  'components/RegistrationConfirmation.tsx',
  'components/Toast.tsx',
  'components/VenueForm.tsx',
]

// Matches only QUOTED hex literals — '#FF9F3D', "#FFF", '#FF9F3Dcc' — because in
// React Native a color is always a string. Deliberately does NOT match bare hex runs
// like `// TODO #1234` or `issue #456`, since those are comments/prose, not colors,
// and an unquoted version of this pattern flags them as false positives. Do not widen
// this back to an unquoted match — that was tried and it broke the guard's credibility.
const HEX = /['"]#[0-9a-fA-F]{3,8}['"]/
const ROOTS = ['app', 'components']

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(entry)) out.push(full.split('\\').join('/'))
  }
  return out
}

describe('token discipline', () => {
  it('keeps literal colors out of every converted file', () => {
    const offenders = ROOTS.flatMap((root) => walk(root))
      .filter((f) => !NOT_YET_CONVERTED.includes(f))
      .filter((f) => HEX.test(readFileSync(f, 'utf8')))

    expect(offenders).toEqual([])
  })

  it('does not list files that no longer exist', () => {
    const present = new Set(ROOTS.flatMap((root) => walk(root)))
    expect(NOT_YET_CONVERTED.filter((f) => !present.has(f))).toEqual([])
  })
})
