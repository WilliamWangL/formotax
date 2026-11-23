import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './features/**/*.{ts,tsx}',
    './configs/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7f3',
          100: '#d6ece2',
          200: '#aed9c7',
          300: '#7dbfa6',
          400: '#4ba082',
          500: '#2f8468',
          600: '#226a54',
          700: '#1c5544',
          800: '#184436',
          900: '#14382d',
        },
        ink: '#14201b',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 40, 32, 0.06), 0 8px 24px -12px rgba(16, 40, 32, 0.18)',
      },
    },
  },
  plugins: [],
};

export default config;
