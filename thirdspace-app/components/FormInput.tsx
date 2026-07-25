import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native'

interface FormInputProps extends TextInputProps {
  label: string
  error?: string
  prefix?: string
}

export function FormInput({ label, error, prefix, secureTextEntry, ...props }: FormInputProps) {
  const [hidden, setHidden] = useState(secureTextEntry ?? false)

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          style={[
            styles.input,
            error ? styles.inputError : styles.inputNormal,
            prefix ? styles.inputWithPrefix : null,
          ]}
          secureTextEntry={hidden}
          placeholderTextColor="#6B6F78"
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
    fontFamily: 'Poppins_500Medium',
    fontSize: 14,
    color: '#6B6F78',
    marginBottom: 6,
  },
  inputWrapper: { position: 'relative' },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: '#15161A',
    borderWidth: 1,
  },
  inputNormal: { borderColor: 'rgba(226,224,218,0.4)' },
  inputError: { borderColor: '#FF6A5B' },
  inputWithPrefix: { paddingLeft: 44 },
  prefix: {
    position: 'absolute',
    left: 16,
    top: 15,
    fontFamily: 'Poppins_500Medium',
    fontSize: 16,
    color: '#15161A',
    zIndex: 1,
  },
  toggle: { position: 'absolute', right: 16, top: 14 },
  toggleText: { fontFamily: 'Poppins_500Medium', fontSize: 14, color: '#6B6F78' },
  errorText: { fontFamily: 'Poppins_500Medium', fontSize: 12, color: '#FF3B30', marginTop: 4 },
})
