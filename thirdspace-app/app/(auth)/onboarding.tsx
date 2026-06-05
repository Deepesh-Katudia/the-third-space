import React, { useRef, useState } from 'react'
import { View, FlatList, TouchableOpacity, Text, Dimensions, StyleSheet, ListRenderItem } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { OnboardingSlide } from '../../components/OnboardingSlide'
import { StatusBar } from 'expo-status-bar'

const { width } = Dimensions.get('window')

const slides = [
  { id: '1', icon: '🛡️', title: 'Real people only.', body: 'Every profile is ID-verified. No anonymous accounts, no fake photos. Everyone you meet is exactly who they say they are.' },
  { id: '2', icon: '👥', title: "See who's going first.", body: "Browse events and see blurred profile previews of who's attending — before you even register. Register to unlock the full list." },
  { id: '3', icon: '💬', title: 'Connect before the event.', body: 'Message attendees before you arrive. Join group chats. Show up already knowing someone.' },
]

type Slide = typeof slides[0]

export default function Onboarding() {
  const router = useRouter()
  const flatListRef = useRef<FlatList<Slide>>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const isLast = currentIndex === slides.length - 1

  const handleNext = () => {
    if (isLast) {
      router.push('/(auth)/sign-up')
    } else {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 })
    }
  }

  const renderSlide: ListRenderItem<Slide> = ({ item }) => (
    <OnboardingSlide icon={item.icon} title={item.title} body={item.body} />
  )

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')} style={styles.skip} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList<Slide>
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={e => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }}
        style={{ flex: 1 }}
      />

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === currentIndex ? styles.dotActive : styles.dotInactive]} />
          ))}
        </View>

        {isLast ? (
          <>
            <TouchableOpacity onPress={handleNext} style={styles.getStarted}>
              <Text style={styles.getStartedText}>Get Started</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')} style={styles.signInLink}>
              <Text style={styles.signInText}>Already have an account? <Text style={styles.signInBold}>Sign in</Text></Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity onPress={handleNext} style={styles.nextButton}>
            <Text style={styles.nextText}>Next</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2C1810' },
  skip: { position: 'absolute', top: 56, right: 24, zIndex: 10 },
  skipText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  bottom: { paddingHorizontal: 24, paddingBottom: 32 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 20, backgroundColor: '#C4614A' },
  dotInactive: { width: 8, backgroundColor: 'rgba(255,255,255,0.3)' },
  getStarted: { backgroundColor: '#C4614A', borderRadius: 100, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  getStartedText: { color: 'white', fontFamily: 'DMSans_500Medium', fontSize: 16 },
  signInLink: { alignItems: 'center' },
  signInText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  signInBold: { color: '#F2C5A0', fontFamily: 'DMSans_500Medium' },
  nextButton: { borderWidth: 1.5, borderColor: 'rgba(196,97,74,0.4)', borderRadius: 100, paddingVertical: 16, alignItems: 'center' },
  nextText: { color: '#C4614A', fontFamily: 'DMSans_500Medium', fontSize: 16 },
})
