import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function VenuePlaceholder() {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Venue</Text>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2', alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 24, color: '#2C1810' },
})
