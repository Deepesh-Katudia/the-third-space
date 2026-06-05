import React from 'react'
import { View, Text, Dimensions, StyleSheet } from 'react-native'

const { width } = Dimensions.get('window')

interface OnboardingSlideProps {
  icon: string
  title: string
  body: string
}

export function OnboardingSlide({ icon, title, body }: OnboardingSlideProps) {
  return (
    <View style={[styles.container, { width }]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 80,
    marginBottom: 32,
  },
  title: {
    fontFamily: 'DMSerifDisplay_400Regular',
    fontSize: 28,
    color: '#FBF7F2',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  body: {
    fontFamily: 'DMSans_300Light',
    fontSize: 16,
    color: '#8C7B70',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 300,
  },
})
