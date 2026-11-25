/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Chakra Petch"', '"Be Vietnam Pro"', 'sans-serif'],
        body: ['"Be Vietnam Pro"', 'sans-serif'],
        bebas: ['"Barlow Condensed"', '"Be Vietnam Pro"', 'sans-serif'],
      },
      colors: {
        // Liên Quân: xanh dương – vàng kim
        lq: {
          primary: '#1a56db',
          gold: '#d4a84b',
          dark: '#0a0e1a',
        },
        // Valorant: đỏ – đen – trắng
        val: {
          red: '#ff4655',
          dark: '#0f1923',
          cream: '#ece8e1',
        }
      },
      animation: {
        'pulse-glow': 'pulseGlow 1.5s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'zoom-in': 'zoomIn 0.3s ease-out',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255,255,255,0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,255,255,0.4)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        zoomIn: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
