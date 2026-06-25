import React, { useRef, useState } from 'react'
import { View, FlatList, TouchableOpacity, Text, Dimensions, StyleSheet, ListRenderItem } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AttendeeAvatarStack } from '../../components/AttendeeAvatarStack'

const { width } = Dimensions.get('window')

interface Slide {
  id: string
  title: string
  body: string
  tint: string
  showCount?: boolean
}

const slides: Slide[] = [
  {
    id: '1',
    title: 'A real third place — for a city that forgot how to meet.',
    body: 'ID-verified people, real venues, actual plans. No bots, no endless scroll.',
    tint: '#C4614A',
    showCount: true,
  },
  {
    id: '2',
    title: "See who's going first.",
    body: "Preview who's attending before you commit. Register to unlock the full guest list.",
    tint: '#7A8C6E',
  },
  {
    id: '3',
    title: 'Connect before you arrive.',
    body: 'Join the group chat, message attendees, and show up already knowing someone.',
    tint: '#C99A2E',
  },
]

export default function Onboarding() {
  const router = useRouter()
  const flatListRef = useRef<FlatList<Slide>>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const isLast = currentIndex === slides.length - 1

  const handleNext = () => {
    if (isLast) router.push('/(auth)/sign-up')
    else flatListRef.current?.scrollToIndex({ index: currentIndex + 1 })
  }

  const renderSlide: ListRenderItem<Slide> = ({ item }) => (
    <View style={styles.slide}>
      <LinearGradient colors={[item.tint, '#2C1810']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        {item.showCount ? (
          <View style={styles.countPill}>
            <AttendeeAvatarStack
              uids={['Ava', 'Noah', 'Mia', 'Leo']}
              count={1240}
              size={26}
              max={4}
              ringColor="#2C1810"
            />
            <Text style={styles.countText}>1,240 in Brooklyn</Text>
          </View>
        ) : null}
      </LinearGradient>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.body}>{item.body}</Text>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {/* Soft radial-style blobs */}
      <View style={styles.blobTerracotta} pointerEvents="none" />
      <View style={styles.blobSage} pointerEvents="none" />

      <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')} style={styles.skip} hitSlop={8}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList<Slide>
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        style={styles.flex}
      />

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>

        <TouchableOpacity onPress={handleNext} style={styles.getStarted}>
          <Text style={styles.getStartedText}>{isLast ? 'Get started' : 'Next'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')} style={styles.signInLink}>
          <Text style={styles.signInText}>
            Already a member? <Text style={styles.signInBold}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2C1810' },
  flex: { flex: 1 },
  blobTerracotta: { position: 'absolute', top: -80, right: -90, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(196,97,74,0.22)' },
  blobSage: { position: 'absolute', bottom: 40, left: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(122,140,110,0.16)' },
  skip: { position: 'absolute', top: 56, right: 24, zIndex: 10 },
  skipText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },

  slide: { width, paddingHorizontal: 24, paddingTop: 24, justifyContent: 'center' },
  hero: { height: 320, borderRadius: 28, justifyContent: 'flex-end', padding: 20, marginBottom: 32 },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', backgroundColor: 'rgba(44,24,16,0.55)', borderRadius: 100, paddingHorizontal: 12, paddingVertical: 8 },
  countText: { fontFamily: 'DMSans_500Medium', fontSize: 13, color: '#FBF7F2' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 30, color: '#FBF7F2', lineHeight: 38, marginBottom: 14, letterSpacing: -0.5 },
  body: { fontFamily: 'DMSans_300Light', fontSize: 16, color: 'rgba(251,247,242,0.72)', lineHeight: 24 },

  bottom: { paddingHorizontal: 24, paddingBottom: 32 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 28 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 22, backgroundColor: '#C4614A' },
  dotInactive: { width: 8, backgroundColor: 'rgba(255,255,255,0.3)' },
  getStarted: { backgroundColor: '#C4614A', borderRadius: 100, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  getStartedText: { color: 'white', fontFamily: 'DMSans_500Medium', fontSize: 16 },
  signInLink: { alignItems: 'center' },
  signInText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  signInBold: { color: '#F2C5A0', fontFamily: 'DMSans_500Medium' },
})
