/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FBF7F2',
        'warm-white': '#FFF9F4',
        terracotta: '#C4614A',
        'soft-orange': '#E8855F',
        'deep-brown': '#2C1810',
        'mid-brown': '#6B3F2A',
        'light-brown': '#A0673A',
        sage: '#7A8C6E',
        blush: '#F2C5A0',
        'warm-gray': '#8C7B70',
      },
      fontFamily: {
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '24px',
        pill: '100px',
      },
    },
  },
  plugins: [],
}
