import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'

export function LoadingView() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#C4614A" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FBF7F2' },
})
