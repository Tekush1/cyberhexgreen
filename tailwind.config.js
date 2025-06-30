/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#00ff41', // Matrix green
        secondary: '#0ff', // Cyan
        cyberblue: '#00E6F6', // Vivid sky blue for cyber text
        accent: {
          red: '#ff0000', // Glitch red
          blue: '#0066ff',
          yellow: '#ffff00',
        },
        dark: {
          100: '#1a1a1a',
          200: '#141414',
          300: '#000000',
        },
      },
      fontFamily: {
        sans: ['Share Tech Mono', 'monospace'],
        cyber: ['Share Tech Mono', 'monospace'],
      },
      animation: {
        'glitch': 'glitch 3s infinite',
        'digital-distort': 'digital-distort 2s infinite',
        'scan': 'scan-line 2s linear infinite',
        'terminal': 'typing 3.5s steps(40, end), blink-caret 0.75s step-end infinite',
        'crt': 'crt-scan 8s linear infinite',
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
        },
        'digital-distort': {
          '0%, 100%': { transform: 'skew(0deg)' },
          '20%': { transform: 'skew(-2deg)' },
          '40%': { transform: 'skew(2deg)' },
          '60%': { transform: 'skew(-1deg)' },
          '80%': { transform: 'skew(1deg)' },
        },
        'scan-line': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      textShadow: {
        'cyber': '0 0 5px var(--primary), 0 0 10px var(--primary), 0 0 15px var(--primary)',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-cyber': {
          textShadow: '0 0 5px #00ff41, 0 0 10px #00ff41, 0 0 15px #00ff41',
        },
        '.text-glitch': {
          position: 'relative',
          '&::before, &::after': {
            content: 'attr(data-text)',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          },
          '&::before': {
            left: '2px',
            textShadow: '-2px 0 #ff0000',
            animation: 'glitch-anim-1 3s infinite linear alternate-reverse',
          },
          '&::after': {
            left: '-2px',
            textShadow: '2px 0 #00ff00',
            animation: 'glitch-anim-2 3s infinite linear alternate-reverse',
          },
        },
        '.crt-screen': {
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.15) 1px, transparent 1px, transparent 2px)',
            pointerEvents: 'none',
            animation: 'crt-scan 8s linear infinite',
          },
        },
      };
      addUtilities(newUtilities);
    },
  ],
};