import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import lightTheme from './scripts/postcss-light-theme.cjs';

// lightTheme runs last: it adds a light version of every colour for people whose system is set to light.
export default {
  plugins: [tailwindcss, autoprefixer, lightTheme()],
};
