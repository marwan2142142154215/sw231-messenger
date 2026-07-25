/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        nyx: {
          50: '#f0f0ff',
          100: '#e0e0ff',
          200: '#c4b5fd',
          300: '#a78bfa',
          400: '#8b5cf6',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#2e1065',
          950: '#1a0536'
        },
        neon: {
          cyan: '#06d6a0',
          pink: '#ef476f',
          blue: '#118ab2',
          yellow: '#ffd166',
          purple: '#9b5de5'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif']
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'aurora': 'aurora 15s ease infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'confetti': 'confetti 1s ease-out forwards',
        'pop': 'pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'pulse-dot': 'pulseDot 1.4s ease-in-out infinite',
        'slide-right': 'slideRight 0.2s ease-out'
      },
      keyframes: {
        glow: { '0%': { boxShadow: '0 0 20px rgba(124,58,237,0.3)' }, '100%': { boxShadow: '0 0 40px rgba(124,58,237,0.6)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-20px)' } },
        aurora: { '0%, 100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        slideUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
        shake: { '0%, 100%': { transform: 'translateX(0)' }, '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' }, '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' } },
        confetti: { '0%': { opacity: 1, transform: 'translateY(0) rotate(0)' }, '100%': { opacity: 0, transform: 'translateY(-100px) rotate(720deg)' } },
        pop: { '0%': { transform: 'scale(0)' }, '50%': { transform: 'scale(1.2)' }, '100%': { transform: 'scale(1)' } },
        pulseDot: { '0%, 80%, 100%': { transform: 'scale(0.6)', opacity: '0.4' }, '40%': { transform: 'scale(1)', opacity: '1' } },
        slideRight: { from: { opacity: 0, transform: 'translateX(-10px)' }, to: { opacity: 1, transform: 'translateX(0)' } }
      },
      backgroundImage: {
        'aurora-gradient': 'linear-gradient(-45deg, #1a0536, #0f0c29, #302b63, #24243e)',
      }
    }
  },
  plugins: []
}