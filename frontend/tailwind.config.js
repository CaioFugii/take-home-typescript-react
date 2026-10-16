/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#1c1915',
        paper: '#f4efe6',
        moss: '#1b3329',
        ember: '#d4532b',
        line: '#e3dacb',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Outfit', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 18px 50px rgba(28, 25, 21, 0.08)',
      },
    },
  },
  plugins: [],
}
