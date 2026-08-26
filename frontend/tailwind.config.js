/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: '#0a0f1d',
          card: '#111827',
          border: '#1f293d',
          accent: '#06b6d4',
          danger: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981'
        }
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { filter: 'drop-shadow(0 0 2px rgba(6, 182, 212, 0.4))' },
          '100%': { filter: 'drop-shadow(0 0 10px rgba(6, 182, 212, 0.9))' },
        }
      }
    },
  },
  plugins: [],
}
