/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      colors: {
        navy: {
          900: '#001228',
          800: '#001F3F',
          700: '#002B56',
          600: '#003A75',
          500: '#0A4D8C',
        },
        'green-subsidy': {
          DEFAULT: '#2ECC71',
          dim: '#1A7A43',
          glow: 'rgba(46, 204, 113, 0.15)',
        },
        'yellow-standard': {
          DEFAULT: '#F1C40F',
          dim: '#9A7D0A',
          glow: 'rgba(241, 196, 15, 0.15)',
        },
        'red-luxury': {
          DEFAULT: '#E74C3C',
          dim: '#922B21',
          glow: 'rgba(231, 76, 60, 0.15)',
        },
        'cyan-accent': {
          DEFAULT: '#00D4FF',
          dim: 'rgba(0, 212, 255, 0.2)',
        },
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(46, 204, 113, 0.25)',
        'glow-red': '0 0 20px rgba(231, 76, 60, 0.25)',
        'glow-cyan': '0 0 20px rgba(0, 212, 255, 0.2)',
        'elevated': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-surface': 'rgba(0, 43, 86, 0.45)',
        'glass-surface-hover': 'rgba(0, 43, 86, 0.65)',
      },
      borderColor: {
        'glass': 'rgba(255, 255, 255, 0.08)',
        'glass-hover': 'rgba(255, 255, 255, 0.15)',
      }
    },
  },
  plugins: [],
}
