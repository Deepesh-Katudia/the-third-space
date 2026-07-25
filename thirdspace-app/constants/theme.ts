// Design tokens for the ThirdSpace orange design system.
// Source of truth: Claude Design project "ThirdSpace App.dc.html" / "Discover.dc.html".

export const colors = {
  // Brand
  primary:      '#FF9F3D',
  primaryLight: '#FFB75B',
  primaryDeep:  '#F76707',

  // Ink & text
  ink:        '#15161A',
  inkSoft:    '#1C1C1E',
  body:       '#3A3A3A',
  muted:      '#6B6F78',
  mutedLight: '#A2A7AE',
  faint:      '#C9CCD2',

  // Surfaces
  surface: '#F3F3F5',
  white:   '#FFFFFF',
  canvas:  '#ECEBE6',
  border:  '#E2E0DA',
  shell:   '#0E0E10',

  // Semantic
  danger:        '#FF3B30',
  dangerBg:      '#FEF2F2',
  dangerBorder:  '#FECACA',
  success:       '#2FA365',
  successBg:     '#F0FDF4',
  successBorder: '#BBF7D0',
  gold:          '#DE922A',
} as const

export const gradients = {
  primary: ['#FF9F3D', '#FFB75B'] as const,
  sunset:  ['#FFCE93', '#FFB75B', '#FF9F3D'] as const,
  dark:    ['#15161A', '#3A2A20'] as const,
  avatar:  ['#FFB75B', '#FF7A4D'] as const,
}

/** Pastel card sets from the comp's palette prop. `Colorful` is the app default. */
export const cardPalette = [
  { bg: '#FFDDC7', accent: '#EE7A3C', cover: ['#FF9F3D', '#FF6A5B'] as const },
  { bg: '#C9EBD4', accent: '#2FA365', cover: ['#3B5BDB', '#5AB0F7'] as const },
  { bg: '#FBC9DE', accent: '#DE4B8A', cover: ['#141414', '#3A2A20'] as const },
  { bg: '#CEDDFF', accent: '#3E6BE3', cover: ['#79C4FF', '#2F79E0'] as const },
  { bg: '#FFE3A8', accent: '#DE922A', cover: ['#F76707', '#FFB75B'] as const },
] as const

/** Cards cycle through the palette by index so the feed never repeats twice running. */
export function paletteFor(index: number) {
  return cardPalette[index % cardPalette.length]
}

export const font = {
  regular:   'Poppins_400Regular',
  medium:    'Poppins_500Medium',
  semibold:  'Poppins_600SemiBold',
  bold:      'Poppins_700Bold',
  extrabold: 'Poppins_800ExtraBold',
} as const

export const radius = {
  pill: 999,
  card: 30,
  sheet: 34,
  nav: 26,
  tile: 20,
  icon: 16,
  input: 18,
} as const

export const shadow = {
  card:  { shadowColor: '#14141E', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  nav:   { shadowColor: '#14141E', shadowOpacity: 0.16, shadowRadius: 34, shadowOffset: { width: 0, height: 12 }, elevation: 12 },
  float: { shadowColor: '#FF9F3D', shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
} as const

/**
 * The comp's bottom nav floats free of the screen edge rather than sitting flush.
 * No expo-blur in this app, so the translucent fill stands in for the backdrop blur.
 */
export const floatingNav = {
  position: 'absolute' as const,
  left: 12,
  right: 12,
  bottom: 14,
  height: 64,
  borderRadius: radius.nav,
  // Solid, not translucent: the comp's frosted look needs a backdrop blur this app
  // does not ship (no expo-blur), and translucency without it just bleeds content
  // through and reads as muddy. A solid fill keeps the floating bar clean.
  backgroundColor: colors.white,
  borderTopWidth: 0,
  paddingBottom: 0,
  ...shadow.nav,
}

/** Bottom padding scrollable tab content needs to clear `floatingNav`. */
export const NAV_CLEARANCE = 100

export type ColorKey = keyof typeof colors
