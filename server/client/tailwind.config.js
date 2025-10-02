/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f0ff',
          100: '#e4e4ff',
          200: '#cdcdff',
          300: '#a6a6ff',
          400: '#7a7aff',
          500: '#5D5CDE', // Main brand color
          600: '#4a49c7',
          700: '#3b3aa3',
          800: '#2f2e84',
          900: '#28276a',
        },
        secondary: {
          50: '#fff2f2',
          100: '#ffe6e6',
          200: '#ffd1d1',
          300: '#ffaaaa',
          400: '#ff7a7a',
          500: '#FF6B6B', // Secondary brand color
          600: '#f53b3b',
          700: '#e21b1b',
          800: '#c41a1a',
          900: '#a31c1c',
        },
        success: {
          50: '#f0fdfc',
          100: '#ccfbf5',
          200: '#99f7ed',
          300: '#5eeee3',
          400: '#2dd9d2',
          500: '#4ECDC4', // Success color
          600: '#14a8a1',
          700: '#0f7c75',
          800: '#115e5a',
          900: '#134e4a',
        },
        warning: {
          50: '#fffef0',
          100: '#fffadc',
          200: '#fff2b8',
          300: '#ffe585',
          400: '#ffd451',
          500: '#FFE66D', // Warning color
          600: '#f5c842',
          700: '#ca9a2d',
          800: '#a17828',
          900: '#856125',
        },
        dark: {
          DEFAULT: '#2C3E50',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        slideDown: {
          from: { transform: 'translateY(-20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' }
        },
        slideInRight: {
          from: { transform: 'translateX(20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' }
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' }
        },
        glow: {
          from: { boxShadow: '0 0 5px rgba(93, 92, 222, 0.5)' },
          to: { boxShadow: '0 0 20px rgba(93, 92, 222, 0.8), 0 0 30px rgba(93, 92, 222, 0.6)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        }
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'poppins': ['Poppins', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow': '0 0 20px rgba(93, 92, 222, 0.3)',
        'glow-lg': '0 0 40px rgba(93, 92, 222, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(93, 92, 222, 0.1)',
      }
    },
  },
  plugins: [
    function ({ addUtilities }) {
      const newUtilities = {
        '.glassmorphism': {
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        },
        '.glassmorphism-dark': {
          background: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        },
        '.gradient-text': {
          background: 'linear-gradient(45deg, #5D5CDE, #FF6B6B, #4ECDC4)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        },
        '.text-shadow': {
          textShadow: '0 2px 4px rgba(0,0,0,0.1)',
        },
        '.text-shadow-lg': {
          textShadow: '0 4px 8px rgba(0,0,0,0.2)',
        },
      }
      addUtilities(newUtilities)
    }
  ],
}