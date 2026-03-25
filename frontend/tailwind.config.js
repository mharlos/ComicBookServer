/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        yellow: {
          400: '#f5c518',
          500: '#e6b800',
          600: '#c9a100',
        },
        zinc: {
          950: '#09090b',
        },
      },
      fontFamily: {
        display: ['Bangers', 'Impact', 'Arial Black', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 24px rgba(245, 197, 24, 0.35)',
        'glow-sm': '0 0 12px rgba(245, 197, 24, 0.25)',
        comic: '4px 4px 0 #000',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
