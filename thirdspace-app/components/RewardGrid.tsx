import React from 'react'
import { View, TouchableOpacity, StyleSheet } from 'react-native'
import { Mascot } from './Mascot'
import { Display, Body } from './ui/Text'
import { reward, palette, radius, space } from '../constants/design'
import type { EarnedReward } from '../utils/rewards'

interface RewardGridProps {
  rewards: EarnedReward[]
  /** Opens the unlock frame for an already-earned reward, so it can be seen again. */
  onSelect?: (reward: EarnedReward) => void
}

/**
 * The roster. Two per row rather than the old four, because a mascot at 60px is an
 * unreadable smudge — these characters carry the reward, so they get the space.
 *
 * Locked entries show the same figure dimmed on the same dark stage, not a padlock. You
 * are meant to see who you have not met yet; that is what makes the roster worth opening.
 */
export function RewardGrid({ rewards, onSelect }: RewardGridProps) {
  return (
    <View style={styles.grid}>
      {rewards.map((r) => {
        const Cell = r.earned && onSelect ? TouchableOpacity : View
        return (
          <Cell
            key={r.id}
            style={styles.cell}
            testID={`reward-${r.id}`}
            {...(r.earned && onSelect
              ? {
                  onPress: () => onSelect(r),
                  activeOpacity: 0.8,
                  accessibilityRole: 'button' as const,
                  accessibilityLabel: `${r.name}, earned. ${r.blurb}`,
                }
              : { accessibilityLabel: `${r.name}, locked. ${r.blurb}` })}
          >
            <View style={[styles.stage, !r.earned && styles.stageLocked]}>
              <Mascot id={r.id} size={104} dimmed={!r.earned} />
            </View>
            <Display style={[styles.name, !r.earned && styles.locked]} numberOfLines={2}>
              {r.name}
            </Display>
            <Body role="bodySm" tone="inkSoft" style={[styles.blurb, !r.earned && styles.locked]} numberOfLines={3}>
              {r.blurb}
            </Body>
          </Cell>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { width: '48%', alignItems: 'center', marginBottom: space.xl },

  stage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.chip + 6,
    backgroundColor: reward.stage,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.md,
  },
  // Dashed and faded is what reads as "not yet" — the palette has no grey to say it with.
  stageLocked: { opacity: 0.55, borderWidth: 1.5, borderColor: palette.rule, borderStyle: 'dashed' },

  name: { textAlign: 'center' },
  blurb: { textAlign: 'center', marginTop: space.xs },
  locked: { opacity: 0.6 },
})
