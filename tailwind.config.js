/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#a3e635',       // Lime green — exact pentestlab accent
        secondary: '#22d3ee',     // Cyan
        cyberblue: '#38bdf8',
        accent: {
          red: '#f87171',
          blue: '#60a5fa',
          yellow: '#facc15',
        },
        dark: {
          100: '#0a0f1a',   // surface
          200: '#070b14',   // mid
          300: '#05080f',   // bg (deepest)
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
        cyber: ['Inter', 'ui-sans-serif', 'sans-serif'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.05)',
      },
    },
  },
  plugins: [],
};
