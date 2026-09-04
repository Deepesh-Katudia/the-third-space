import React, { useEffect, useState } from 'react'
import { View, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useAuth } from '../../../hooks/useAuth'
import {
  subscribeEvent,
  subscribeIsRegistered,
  subscribeRegistrations,
  registerForEvent,
  cancelRegistration,
  deleteEventWithRegistrations,
} from '../../../services/events'
import { formatDayDate, formatTime, spotsLeftText } from '../../../utils/eventHelpers'
import { POINTS_PER_EVENT } from '../../../utils/points'
import { Banner } from '../../../components/Banner'
import { EmptyState } from '../../../components/EmptyState'
import { LoadingView } from '../../../components/LoadingView'
import { AttendeeAvatarStack } from '../../../components/AttendeeAvatarStack'
import { RegistrationConfirmation } from '../../../components/RegistrationConfirmation'
import { AnnouncementBanner } from '../../../components/AnnouncementBanner'
import { AmbientBackdrop } from '../../../components/AmbientBackdrop'
import { subscribeAnnouncements } from '../../../services/announcements'
import { getVenue } from '../../../services/venues'
import { CommunityEvent, MediaAsset, Registration, Announcement } from '../../../types/models'
import { MediaThumb } from '../../../components/MediaThumb'
import { MediaViewer } from '../../../components/MediaViewer'
import { categoryLabel } from '../../../constants/categories'
import { Screen } from '../../../components/ui/Screen'
import { Display, Body, Meta } from '../../../components/ui/Text'
import { BackButton } from '../../../components/ui/BackButton'
import { palette, radius, space } from '../../../constants/design'

const NOTCH = 14

/**
 * Usable height of the ink hero, measured BELOW the status bar. The rendered hero is
 * this plus the device's top inset, so the stub keeps the same proportions on a phone
 * with a Dynamic Island as on one with a 20pt status bar. A fixed total height gave the
 * notch devices a squashed hero and pushed the category chip up under the back button.
 */
const HERO_BODY = 190

/** Breathing room between the end of the sheet's content and the sticky footer. */
const FOOTER_GAP = 24

/** Stand-in clearance for the single frame before the footer reports its own height. */
const FOOTER_FALLBACK = 132

export default function EventDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()

  const [event, setEvent] = useState<CommunityEvent | null | undefined>(undefined)
  const [isRegistered, setIsRegistered] = useState(false)
  const [attendees, setAttendees] = useState<Registration[]>([])
  const [banner, setBanner] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null)
  const [viewing, setViewing] = useState<MediaAsset | null>(null)
  const [venuePhotos, setVenuePhotos] = useState<MediaAsset[]>([])
  // The footer is absolutely positioned and its height depends on the bottom inset, so
  // the scroll content cannot clear it with a constant. A phone with a home indicator
  // and one without differ by ~34pt, which is the whole last line of the description.
  const [footerHeight, setFooterHeight] = useState(0)

  const insets = useSafeAreaInsets()
  const heroHeight = HERO_BODY + insets.top

  const isOwner = !!user && !!event && event.venueId === user.uid

  useEffect(() => {
    if (!id) return
    return subscribeEvent(id, setEvent, () => setBanner("Couldn't load this event."))
  }, [id])

  useEffect(() => {
    if (!id || !user || isOwner) return
    return subscribeIsRegistered(id, user.uid, setIsRegistered)
  }, [id, user, isOwner])

  useEffect(() => {
    // Registrations are readable by the event owner and by co-attendees (security
    // rules). Non-registered users keep the count-only blur gate below.
    if (!id || (!isOwner && !isRegistered)) return
    return subscribeRegistrations(id, setAttendees, () => setBanner("Couldn't load attendees."))
  }, [id, isOwner, isRegistered])

  useEffect(() => {
    // Announcement reads are gated to owner/registered by security rules.
    if (!id || (!isOwner && !isRegistered)) return
    return subscribeAnnouncements(id, (list) => setLatestAnnouncement(list[0] ?? null), () => {})
  }, [id, isOwner, isRegistered])

  useEffect(() => {
    const venueId = event?.venueId
    if (!venueId) return
    let cancelled = false
    // One-shot, not a subscription: venue photos do not change while somebody reads an
    // event, and a second live listener per event screen buys nothing.
    getVenue(venueId)
      .then((v) => { if (!cancelled) setVenuePhotos(v?.photos ?? []) })
      .catch(() => { /* the strip simply does not render */ })
    return () => { cancelled = true }
  }, [event?.venueId])

  if (event === undefined) return <LoadingView />

  if (event === null) {
    return (
      <Screen tone="deep">
        <EmptyState emoji="🫥" title="Event not found" body="This event may have been cancelled by the venue." />
        <View style={styles.backCenter}>
          <BackButton label="Go back" />
        </View>
      </Screen>
    )
  }

  const startsAt = event.startsAt.toDate()
  const soldOut = event.registeredCount >= event.capacity
  // Registered users (and the owner) see real attendee avatars from the
  // subscription. Non-registered users only get count-driven blurred placeholders.
  const lockedSeeds = Array.from({ length: Math.min(event.registeredCount, 3) }, (_, i) => `${event.id}:${i}`)

  const handleRegister = async () => {
    if (!user) return
    setBusy(true)
    setBanner('')
    try {
      await registerForEvent(event.id, user.uid, user.displayName ?? 'Member')
      setShowConfirmation(true)
    } catch {
      setBanner('Registration failed. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleCancelRegistration = async () => {
    if (!user) return
    setBusy(true)
    setBanner('')
    try {
      await cancelRegistration(event.id, user.uid)
    } catch {
      setBanner("Couldn't cancel your registration. Try again.")
    } finally {
      setBusy(false)
    }
  }

  const handleCancelEvent = () => {
    Alert.alert('Cancel this event?', 'This removes the event and all registrations. This cannot be undone.', [
      { text: 'Keep event', style: 'cancel' },
      {
        text: 'Cancel event',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEventWithRegistrations(event.id)
            router.back()
          } catch {
            setBanner("Couldn't cancel the event. Try again.")
          }
        },
      },
    ])
  }

  return (
    <View style={styles.container}>
      {/* This screen is full-bleed — the ink hero runs under the status bar — so it does
          not go through `Screen` and has to carry the ambient field itself. */}
      <AmbientBackdrop />
      <StatusBar style="light" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        // This screen is full-bleed and paints under the status bar itself. iOS's
        // automatic inset adjustment would add a top inset of its own on top of that,
        // then reconcile it a frame later — which lands as a visible jolt the first time
        // you drag. The safe areas here are handled explicitly, so opt out.
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustsScrollIndicatorInsets={false}
        scrollIndicatorInsets={{ bottom: footerHeight || FOOTER_FALLBACK }}
      >
        {event.cover ? (
          <MediaThumb media={event.cover} style={styles.coverBand} onPress={() => setViewing(event.cover ?? null)} />
        ) : null}

        {/* Hero — the ink stub of one big ticket, torn off above the detail body.
            The notches are absolutely positioned at the hero's bottom seam, so they
            live in a wrapper with the hero rather than in the scroll content: a cover
            band above would otherwise slide them down into the middle of the cover. */}
        <View style={styles.heroWrap}>
          <View style={[styles.hero, { height: heroHeight }]}>
            <SafeAreaView edges={['top']} style={styles.heroBar}>
              <BackButton variant="circle" />
              <TouchableOpacity style={styles.heroBtn} onPress={() => setSaved((s) => !s)} hitSlop={8}>
                <Body role="button" style={styles.onInk}>{saved ? '♥' : '♡'}</Body>
              </TouchableOpacity>
            </SafeAreaView>
            <View style={styles.heroFooter}>
              <View style={styles.categoryChip}>
                <Meta role="eyebrow" tone="ink">{categoryLabel(event.category)}</Meta>
              </View>
            </View>
          </View>
          <View style={[styles.notch, styles.notchLeft, { top: heroHeight - NOTCH / 2 }]} />
          <View style={[styles.notch, styles.notchRight, { top: heroHeight - NOTCH / 2 }]} />
        </View>

        {/* The detail body rides on a glass sheet rather than directly on the ambient
            field. The field is a fixed deep-to-light ramp the height of the viewport, so
            content laid straight onto it appears to swim through a colour change as you
            scroll — the background reads as shifting even though it never moves. A
            translucent sheet travels WITH the content, which settles that, and it still
            lets the glows through the way an opaque fill would not. */}
        <View style={[styles.sheet, { paddingBottom: (footerHeight || FOOTER_FALLBACK) + FOOTER_GAP }]}>
          <View style={styles.sheetSheen} pointerEvents="none" />
          <Display role="screenTitle" style={styles.title}>{event.title}</Display>
          <Body role="bodyLg" style={venuePhotos.length > 0 ? undefined : styles.venue}>{event.venueName} · {event.neighborhood}</Body>

          {venuePhotos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venueStrip}>
              {venuePhotos.map((media, i) => (
                <MediaThumb key={i} media={media} style={styles.venueTile} onPress={() => setViewing(media)} />
              ))}
            </ScrollView>
          ) : null}

          {/* Info cards */}
          <View style={styles.infoRow}>
            <View style={styles.infoCard}>
              <Meta role="eyebrow" style={styles.infoLabel}>When</Meta>
              <Display>{formatDayDate(startsAt)}</Display>
              <Body role="bodySm">{formatTime(startsAt)}</Body>
            </View>
            <View style={styles.infoCard}>
              <Meta role="eyebrow" style={styles.infoLabel}>Spots</Meta>
              <Display>{spotsLeftText(event.capacity, event.registeredCount)}</Display>
              <Body role="bodySm" tone="sage">Free</Body>
            </View>
          </View>

          {banner ? <Banner message={banner} /> : null}

          {latestAnnouncement && (isOwner || isRegistered) ? (
            <AnnouncementBanner
              announcement={latestAnnouncement}
              onPress={() => router.push({ pathname: '/(app)/chat/[id]', params: { id: event.id } })}
            />
          ) : null}

          {/* Who's going */}
          <Display role="screenTitle" style={styles.sectionTitle}>Who&apos;s going</Display>
          {isOwner || isRegistered ? (
            <View style={styles.whosGoing}>
              <AttendeeAvatarStack
                uids={attendees.map((a) => a.uid)}
                photoURLs={attendees.map((a) => a.photoURL ?? null)}
                count={attendees.length}
                size={36}
                variant="glass"
              />
              <Body role="bodySm" tone="ink">
                {attendees.length} {isOwner ? 'registered' : 'going'}
              </Body>
              {attendees.length > 0 ? (
                <TouchableOpacity style={styles.seeAll} onPress={() => router.push({ pathname: '/(app)/guest-list/[id]', params: { id: event.id } })}>
                  <Meta role="eyebrow" tone="clay">See all →</Meta>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : (
            <View style={styles.whosGoingLocked}>
              <View style={styles.lockedAvatars}>
                <AttendeeAvatarStack uids={lockedSeeds} count={3} size={36} max={3} variant="glass" />
                <View style={styles.blurredGroup}>
                  <View style={styles.blurredAvatar} />
                  <View style={[styles.blurredAvatar, { marginLeft: -11 }]} />
                </View>
              </View>
              <Body role="bodySm" style={styles.lockedText}>Register to unlock who&apos;s going</Body>
            </View>
          )}

          {/* About */}
          {event.description ? (
            <>
              <Display role="screenTitle" style={styles.sectionTitle}>About</Display>
              <Body role="bodyLg" tone="ink" style={styles.description}>{event.description}</Body>
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Sticky footer */}
      <SafeAreaView
        edges={['bottom']}
        style={styles.footer}
        onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
      >
        <View style={styles.footerInner}>
          <View>
            <Display role="stubDay" tone="clay">Free</Display>
            <Body role="bodySm">{spotsLeftText(event.capacity, event.registeredCount)}</Body>
          </View>
          {isOwner ? (
            <TouchableOpacity style={[styles.cta, styles.ctaOutlineDanger]} onPress={handleCancelEvent}>
              <Body role="button" tone="clay">Cancel event</Body>
            </TouchableOpacity>
          ) : isRegistered ? (
            <TouchableOpacity style={[styles.cta, styles.ctaOutlineGoing]} onPress={handleCancelRegistration} disabled={busy}>
              <Body role="button" tone="sage">{busy ? '…' : "You're going ✓"}</Body>
            </TouchableOpacity>
          ) : soldOut ? (
            <View style={[styles.cta, styles.ctaDisabled]}>
              <Body role="button">Sold out</Body>
            </View>
          ) : (
            <TouchableOpacity style={[styles.cta, styles.ctaPrimary]} onPress={handleRegister} disabled={busy}>
              <Body role="button" style={styles.onInk}>{busy ? '…' : 'Register'}</Body>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

      <RegistrationConfirmation
        visible={showConfirmation}
        eventTitle={event.title}
        dateLine={`${formatDayDate(startsAt)} · ${formatTime(startsAt)}`}
        venueLine={`${event.venueName} · ${event.neighborhood}`}
        pointsEarned={POINTS_PER_EVENT}
        onSeeGuests={() => {
          setShowConfirmation(false)
          router.push({ pathname: '/(app)/guest-list/[id]', params: { id: event.id } })
        }}
        onJoinChat={() => {
          setShowConfirmation(false)
          router.push({ pathname: '/(app)/chat/[id]', params: { id: event.id } })
        }}
        onClose={() => setShowConfirmation(false)}
      />

      <MediaViewer media={viewing} onClose={() => setViewing(null)} />
    </View>
  )
}

const styles = StyleSheet.create({
  // Clipped at the screen edge. The hero's tear notches sit at `left/right: -7` so they
  // read as torn out of the page, and unclipped that 7px is real scrollable overflow —
  // on web it raises a scrollbar, which resizes the viewport, which re-lays-out the
  // ambient field, which changes the overflow again. Same loop `AmbientBackdrop` clips
  // for; the notches are this screen's second source of it.
  container: { flex: 1, overflow: 'hidden' },
  // flexGrow lets the glass sheet stretch to the bottom of the viewport on a short
  // event, so it never ends in a hard edge halfway down the screen.
  scroll: { flexGrow: 1 },
  backCenter: { alignItems: 'center', paddingBottom: 40 },

  // Deliberately ABOVE the ink hero, not behind it. The hero's tear notches sit at the
  // ink/field seam at its BOTTOM edge; putting the cover on top leaves that seam — and
  // the note about those notches being painted orangeDeep — untouched.
  coverBand: { width: '100%', aspectRatio: 16 / 9, borderRadius: 0 },
  // overflow stays visible: the notches hang half outside this wrapper on both edges.
  heroWrap: { position: 'relative' },
  hero: { justifyContent: 'space-between', backgroundColor: palette.ink },
  heroBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: space.xl - 4, paddingTop: space.sm },
  heroBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: palette.inkSoft, alignItems: 'center', justifyContent: 'center' },
  onInk: { color: palette.cream },
  heroFooter: { padding: space.xl - 4 },
  categoryChip: { alignSelf: 'flex-start', backgroundColor: palette.orangeLight, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: space.xs + 1 },

  // The tear notches that make the hero read as a ticket stub, painted in the field's
  // top tone so they punch through the ink band. They no longer match the background
  // exactly — the field is a gradient now and these scroll through it — but each is a
  // 7x14px half-disc at the hero seam, where the field is still within a few percent
  // of orangeDeep. Clipping a live copy of the gradient into 14px would cost more than
  // it buys.
  notch: {
    position: 'absolute',
    width: NOTCH,
    height: NOTCH,
    borderRadius: NOTCH / 2,
    backgroundColor: palette.orangeDeep,
  },
  notchLeft: { left: -NOTCH / 2 },
  notchRight: { right: -NOTCH / 2 },

  /**
   * Two layers, not one: `glassFill` over the field plus a `glassSheen` wash on top of
   * it come to roughly 0.55 combined, which is enough to settle the gradient underneath
   * while still reading as glass. A single token at that alpha would look like a
   * washed-out solid instead.
   *
   * The top corners use `radius.sheet` deliberately. The hero's tear notches hang 7pt
   * below the seam at the very edges, and a tighter radius would clip their lower half
   * as the sheet paints over them.
   */
  sheet: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    backgroundColor: palette.glassFill,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderTopWidth: 1,
    borderTopColor: palette.glassEdge,
    overflow: 'hidden',
  },
  sheetSheen: { ...StyleSheet.absoluteFillObject, backgroundColor: palette.glassSheen },
  title: { marginBottom: space.xs + 2 },
  venue: { marginBottom: space.xl },
  // The strip carries the bottom margin when it is present, so the venue line above it
  // drops its own — otherwise the two stack into a gap twice the size.
  venueStrip: { gap: space.sm, paddingTop: space.sm, paddingBottom: space.xl },
  venueTile: { width: 96, height: 96 },

  infoRow: { flexDirection: 'row', gap: space.md, marginBottom: space.xl },
  infoCard: {
    flex: 1,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket,
    padding: space.lg,
    borderWidth: 1,
    borderColor: palette.rule,
  },
  infoLabel: { marginBottom: space.xs + 2 },

  sectionTitle: { marginBottom: space.md, marginTop: space.xs },
  whosGoing: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xl },
  seeAll: { marginLeft: 'auto' },
  whosGoingLocked: { marginBottom: space.xl },
  lockedAvatars: { flexDirection: 'row', alignItems: 'center', marginBottom: space.sm + 2 },
  blurredGroup: { flexDirection: 'row', marginLeft: -11 },
  blurredAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: palette.rule, borderWidth: 2, borderColor: palette.orangeDeep },
  lockedText: { fontStyle: 'italic' },

  description: { marginBottom: space.sm },

  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: palette.orangeLight, borderTopWidth: 1, borderTopColor: palette.rule },
  footerInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.xl, paddingTop: space.md + 2, paddingBottom: space.xs + 2 },
  cta: { borderRadius: radius.pill, overflow: 'hidden', paddingVertical: space.md + 2, paddingHorizontal: space.xxl },
  ctaPrimary: { backgroundColor: palette.ink },
  ctaOutlineGoing: { borderWidth: 1.5, borderColor: palette.sage },
  ctaOutlineDanger: { borderWidth: 1.5, borderColor: palette.clay },
  ctaDisabled: { backgroundColor: palette.rule },
})
