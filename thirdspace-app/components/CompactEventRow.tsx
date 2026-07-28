import React from 'react'
import { View, StyleSheet } from 'react-native'
import { CommunityEvent } from '../types/models'
import { dateBlock } from '../utils/eventHelpers'
import { space } from '../constants/design'
import { TicketCard } from './ui/TicketCard'
import { Display, Body } from './ui/Text'

interface CompactEventRowProps {
  event: CommunityEvent
  onPress: () => void
  /** Optional trailing slot (e.g. a "Going" badge or "Rate ★" action). */
  trailing?: React.ReactNode
  /** Must match the screen background — TicketCard paints its notches in this tone. */
  tone?: 'deep' | 'cream'
}

export function CompactEventRow({ event, onPress, trailing, tone = 'deep' }: CompactEventRowProps) {
  const startsAt = event.startsAt.toDate()
  const block = dateBlock(startsAt)

  return (
    <TicketCard
      tone={tone}
      photoUri={null}
      day={block.day}
      month={block.weekday}
      onPress={onPress}
    >
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Display numberOfLines={1}>{event.title}</Display>
          <Body role="bodySm" numberOfLines={1} style={styles.venue}>
            {event.venueName} · {event.neighborhood}
          </Body>
        </View>
        {trailing ?? <Body role="bodySm">{event.registeredCount} going</Body>}
      </View>
    </TicketCard>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  textCol: { flex: 1, minWidth: 0 },
  venue: { marginTop: 2 },
})
