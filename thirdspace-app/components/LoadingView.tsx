import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'

export function LoadingView() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF9F3D" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F3F5' },
})
