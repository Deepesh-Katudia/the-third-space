/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        cream:          '#FBF7F2',
        'warm-white':   '#FFF9F4',
        terracotta:     '#C4614A',
        'soft-orange':  '#E8855F',
        'deep-brown':   '#2C1810',
        'mid-brown':    '#6B3F2A',
        'light-brown':  '#A0673A',
        sage:           '#7A8C6E',
        blush:          '#F2C5A0',
        'warm-gray':    '#8C7B70',
      },
      fontFamily: {
        serif:          ['DMSerifDisplay_400Regular'],
        'serif-italic': ['DMSerifDisplay_400Regular_Italic'],
        sans:           ['DMSans_400Regular'],
        'sans-light':   ['DMSans_300Light'],
        'sans-medium':  ['DMSans_500Medium'],
      },
      borderRadius: {
        pill: '100px',
      },
    },
  },
  plugins: [],
}
