import React, { useState } from 'react'
import { View, TextInput, TouchableOpacity, StyleSheet, TextInputProps } from 'react-native'
import { palette, radius, space, type as typeScale } from '../constants/design'
import { Body, Meta } from './ui/Text'

interface FormInputProps extends TextInputProps {
  label: string
  error?: string
  prefix?: string
}

export function FormInput({ label, error, prefix, secureTextEntry, ...props }: FormInputProps) {
  const [hidden, setHidden] = useState(secureTextEntry ?? false)

  return (
    <View style={styles.container}>
      <Meta role="eyebrow" style={styles.label}>{label}</Meta>
      <View style={styles.inputWrapper}>
        {prefix ? <Body role="bodyLg" tone="ink" style={styles.prefix}>{prefix}</Body> : null}
        <TextInput
          style={[
            styles.input,
            error ? styles.inputError : styles.inputNormal,
            prefix ? styles.inputWithPrefix : null,
          ]}
          secureTextEntry={hidden}
          placeholderTextColor={palette.inkSoft}
          autoCapitalize="none"
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setHidden(h => !h)}
            style={styles.toggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Meta role="eyebrow" tone="clay">{hidden ? 'Show' : 'Hide'}</Meta>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Body role="bodySm" tone="clay" style={styles.errorText}>{error}</Body> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: space.lg },
  label: { marginBottom: space.xs + 2 },
  inputWrapper: { position: 'relative' },
  input: {
    ...typeScale.bodyLg,
    backgroundColor: palette.orangeLight,
    borderRadius: radius.ticket - 2,
    paddingHorizontal: space.lg,
    paddingVertical: space.md + 2,
    color: palette.ink,
    borderWidth: 1,
  },
  inputNormal: { borderColor: palette.rule },
  inputError: { borderColor: palette.clay },
  inputWithPrefix: { paddingLeft: 44 },
  prefix: { position: 'absolute', left: space.lg, top: 15, zIndex: 1 },
  toggle: { position: 'absolute', right: space.lg, top: space.lg },
  errorText: { marginTop: space.xs },
})
