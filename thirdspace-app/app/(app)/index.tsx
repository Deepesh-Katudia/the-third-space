import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { useAuth } from '../../hooks/useAuth'
import { StatusBar } from 'expo-status-bar'

export default function Home() {
  const { user } = useAuth()

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.logoCircle}>
        <Text style={styles.logoLetter}>T</Text>
      </View>
      <Text style={styles.welcome}>Welcome, {user?.displayName?.split(' ')[0] ?? 'friend'}! 👋</Text>
      <Text style={styles.subtitle}>You're in. The Third Space is almost ready.</Text>
      <Text style={styles.phase2}>Events and community features coming in Phase 2.</Text>
      <TouchableOpacity onPress={() => signOut(auth)} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#C4614A', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  logoLetter: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 36, color: 'white' },
  welcome: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: '#2C1810', textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  subtitle: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#8C7B70', textAlign: 'center', marginBottom: 8 },
  phase2: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#C4614A', textAlign: 'center', marginBottom: 40 },
  signOutButton: { borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12 },
  signOutText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
})
