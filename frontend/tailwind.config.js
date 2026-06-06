const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
        display: ['"Playfair Display"', ...defaultTheme.fontFamily.serif],
      },
      boxShadow: {
        glow: '0 20px 60px rgba(255, 190, 108, 0.24)',
        soft: '0 24px 65px rgba(0, 0, 0, 0.28)',
      },
      colors: {
        surface: '#090607',
        panel: 'rgba(15, 12, 10, 0.84)',
        brand: '#f1c77d',
      },
      backgroundImage: {
        'premium-glow': 'radial-gradient(circle at 20% 20%, rgba(255, 200, 120, 0.18), transparent 25%), radial-gradient(circle at 80% 10%, rgba(255, 255, 255, 0.08), transparent 18%), linear-gradient(180deg, #070504 0%, #0b0907 100%)',
      },
    },
  },
  plugins: [],
};
