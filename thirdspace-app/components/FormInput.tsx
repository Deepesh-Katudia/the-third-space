import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native'

interface FormInputProps extends TextInputProps {
  label: string
  error?: string
}

export function FormInput({ label, error, secureTextEntry, ...props }: FormInputProps) {
  const [hidden, setHidden] = useState(secureTextEntry ?? false)

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={[styles.input, error ? styles.inputError : styles.inputNormal]}
          secureTextEntry={hidden}
          placeholderTextColor="#8C7B70"
          autoCapitalize="none"
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setHidden(h => !h)}
            style={styles.toggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.toggleText}>{hidden ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 14,
    color: '#8C7B70',
    marginBottom: 6,
  },
  inputWrapper: { position: 'relative' },
  input: {
    backgroundColor: '#FFF9F4',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'DMSans_400Regular',
    fontSize: 16,
    color: '#2C1810',
    borderWidth: 1,
  },
  inputNormal: { borderColor: 'rgba(242,197,160,0.4)' },
  inputError: { borderColor: '#f87171' },
  toggle: { position: 'absolute', right: 16, top: 14 },
  toggleText: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: '#8C7B70' },
  errorText: { fontFamily: 'DMSans_400Regular', fontSize: 12, color: '#ef4444', marginTop: 4 },
})
