import React from 'react'
import { View, StyleSheet } from 'react-native'
import { CommunityEvent } from '../types/models'
import { categoryLabel } from '../constants/categories'
import { formatEventDate, isStartingSoon } from '../utils/eventHelpers'
import { palette, space } from '../constants/design'
import { TicketCard } from './ui/TicketCard'
import { Display, Body } from './ui/Text'
import { ChipRow } from './ui/Chip'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

interface EventCardProps {
  event: CommunityEvent
  onPress: () => void
  /** Must match the screen background — TicketCard paints its notches in this tone. */
  tone?: 'deep' | 'cream'
  /** Right-aligned slot on the attendance line (e.g. a "Going" badge or "Rate ★"). */
  trailing?: React.ReactNode
  /** Block below the card body (e.g. the attendee stack + "Open chat" on next-up). */
  footer?: React.ReactNode
}

/**
 * The single event card for the whole app — attender feed, my-events, hoster events
 * and hoster overview all render this. Variants come from `trailing`/`footer`, not
 * from a second component.
 */
export function EventCard({ event, onPress, tone = 'deep', trailing, footer }: EventCardProps) {
  const startsAt = event.startsAt.toDate()
  const soldOut = event.registeredCount >= event.capacity

  const chips = [formatEventDate(startsAt), categoryLabel(event.category)]
  if (event.ageRequirement === '21+') chips.push('21+')
  if (isStartingSoon(startsAt, new Date())) chips.push('Starting soon')

  return (
    <TicketCard
      tone={tone}
      // CommunityEvent has no image field — TicketCard draws its placeholder instead.
      // Do not invent one; adding event photos is a separate data-layer change.
      photoUri={null}
      day={String(startsAt.getDate())}
      month={MONTHS[startsAt.getMonth()]}
      onPress={onPress}
    >
      <Display numberOfLines={2}>{event.title}</Display>
      <Body role="bodySm" style={styles.loc}>{event.venueName} · {event.neighborhood}</Body>
      {event.description ? (
        <Body numberOfLines={2} style={styles.desc}>{event.description}</Body>
      ) : null}
      <View style={styles.meta}>
        <ChipRow items={chips} accentIndex={1} />
      </View>
      <View style={styles.goingRow}>
        <Body role="bodySm" style={styles.going}>
          {soldOut ? 'Sold out' : `${event.registeredCount} going`}
        </Body>
        {trailing}
      </View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </TicketCard>
  )
}

const styles = StyleSheet.create({
  loc: { marginTop: space.xs },
  desc: { marginTop: space.xs + 2 },
  meta: { marginTop: space.sm },
  goingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  going: { marginTop: space.xs + 3 },
  footer: {
    marginTop: space.md,
    paddingTop: space.md,
    borderTopWidth: 1,
    borderTopColor: palette.rule,
  },
})
