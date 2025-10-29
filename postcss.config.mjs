/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {}, // This uses the v4 plugin you have installed
    autoprefixer: {},
  },
};

export default config;