const plugin = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  plugins: [
    // This plugin adds your custom animation
    plugin(function ({ addUtilities }) {
      addUtilities({
        // Adds the keyframes
        '@keyframes gradientXY': {
          '0%, 100%': { backgroundPosition: '0% 0%' },
          '25%': { backgroundPosition: '100% 0%' },
          '50%': { backgroundPosition: '100% 100%' },
          '75%': { backgroundPosition: '0% 100%' },
        },
        // Adds the .animate-gradient-xy utility class
        '.animate-gradient-xy': {
          animation: 'gradientXY 2s ease infinite',
        },
      });
    }),
  ],
};