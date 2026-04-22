/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Consolas', 'monospace'],
      },
      colors: {
        primary: {
          DEFAULT: '#1B3A6B',
          foreground: '#FFFFFF',
        },
        surface: {
          DEFAULT: '#FFFFFF',
        },
        'surface-muted': '#F9FAFB',
        border: {
          DEFAULT: '#E5E7EB',
        },
        body: '#111827',
        muted: '#6B7280',
        tier: {
          green: '#16A34A',
          yellow: '#D97706',
          red: '#DC2626',
        },
        navactive: '#EFF6FF',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 24, 39, 0.04)',
      },
    },
  },
  plugins: [],
};
