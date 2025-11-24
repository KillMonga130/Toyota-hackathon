/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#DC2626',
          dark: '#B91C1C',
          light: '#EF4444',
        },
        background: {
          DEFAULT: '#0A0A0A',
          secondary: '#111111',
          tertiary: '#1A1A1A',
        },
        border: {
          DEFAULT: '#262626',
          light: '#404040',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#D4D4D4',
          tertiary: '#A3A3A3',
        }
      }
    },
  },
  plugins: [],
}

