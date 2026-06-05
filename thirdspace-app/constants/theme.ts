export const colors = {
  cream:       '#FBF7F2',
  warmWhite:   '#FFF9F4',
  terracotta:  '#C4614A',
  softOrange:  '#E8855F',
  deepBrown:   '#2C1810',
  midBrown:    '#6B3F2A',
  lightBrown:  '#A0673A',
  sage:        '#7A8C6E',
  blush:       '#F2C5A0',
  warmGray:    '#8C7B70',
} as const

export const gradients = {
  primary: ['#C4614A', '#E8855F'] as const,
  dark:    ['#2C1810', '#3a1e12'] as const,
}

export type ColorKey = keyof typeof colors
