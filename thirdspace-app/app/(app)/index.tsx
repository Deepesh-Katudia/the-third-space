import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { useAuth } from '../../hooks/useAuth'
import { StatusBar } from 'expo-status-bar'

export default function Home() {
  const { user, role } = useAuth()
  const isHoster = role === 'hoster'
  const firstName = user?.displayName?.split(' ')[0] ?? 'there'

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.logoCircle}>
        <Text style={styles.logoLetter}>T</Text>
      </View>
      <View style={styles.header}>
        <Text style={styles.welcome}>Welcome, {firstName}</Text>
        {isHoster && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Host</Text>
          </View>
        )}
      </View>
      <Text style={styles.teaser}>
        {isHoster ? 'Create your first event' : 'Browse upcoming events'}
      </Text>
      <Text style={styles.phase2}>Coming in Phase 2</Text>
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
  header: { alignItems: 'center', marginBottom: 8 },
  welcome: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 28, color: '#2C1810', textAlign: 'center', letterSpacing: -0.5 },
  roleBadge: { marginTop: 8, backgroundColor: 'rgba(196,97,74,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  roleBadgeText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#C4614A', letterSpacing: 0.5 },
  teaser: { fontFamily: 'DMSans_300Light', fontSize: 16, color: '#8C7B70', textAlign: 'center', marginTop: 4, marginBottom: 8 },
  phase2: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#C4614A', textAlign: 'center', marginBottom: 40 },
  signOutButton: { borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12 },
  signOutText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
})
