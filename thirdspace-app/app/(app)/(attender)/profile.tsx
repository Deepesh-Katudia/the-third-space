import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { signOut } from 'firebase/auth'
import { auth } from '../../../firebase/config'
import { useAuth } from '../../../hooks/useAuth'

export default function Profile() {
  const { user } = useAuth()

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.logoCircle}>
        <Text style={styles.logoLetter}>{(user?.displayName ?? 'T')[0].toUpperCase()}</Text>
      </View>
      <Text style={styles.name}>{user?.displayName ?? 'Member'}</Text>
      <Text style={styles.email}>{user?.email ?? ''}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleBadgeText}>Attender</Text>
      </View>
      <TouchableOpacity onPress={() => signOut(auth)} style={styles.signOutButton}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#C4614A', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  logoLetter: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 36, color: 'white' },
  name: { fontFamily: 'DMSerifDisplay_400Regular', fontSize: 26, color: '#2C1810', marginBottom: 4 },
  email: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70', marginBottom: 12 },
  roleBadge: { backgroundColor: 'rgba(196,97,74,0.12)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 32 },
  roleBadgeText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#C4614A', letterSpacing: 0.5 },
  signOutButton: { borderWidth: 1, borderColor: 'rgba(140,123,112,0.4)', borderRadius: 100, paddingHorizontal: 24, paddingVertical: 12 },
  signOutText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
})
