/** @type {import('tailwindcss').Config} */
const colorsModule = require('./src/constants/Colors');
const colors = colorsModule.default || colorsModule;

module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ...colors,
      },
    },
  },
  plugins: [],
};
