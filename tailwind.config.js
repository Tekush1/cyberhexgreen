/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#c6f135',       // Lime from the H> mark
        secondary: '#3bd3ff',     // Mascot rim cyan
        cyberblue: '#3bd3ff',
        ink: '#060a16',
        panel: '#0d1428',
        line: '#1d2b4d',
        glow: '#3bd3ff',
        lime: { DEFAULT: '#c6f135', 300: '#d6ff4f', 400: '#c6f135', 500: '#b2dc22' },
        sun: '#ffc93c',
        muted: '#8a9bbe',
        accent: {
          red: '#f87171',
          blue: '#60a5fa',
          yellow: '#facc15',
        },
        dark: {
          100: '#0d1428',   // panel
          200: '#0a1020',   // mid
          300: '#060a16',   // page ink
        },
      },
      fontFamily: {
        sans: ['Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        cyber: ['Archivo', 'ui-sans-serif', 'sans-serif'],
        display: ['Archivo', 'ui-sans-serif', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
};
