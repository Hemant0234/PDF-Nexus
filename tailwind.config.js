/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        white: 'var(--color-white)',
        gray: {
          900: 'var(--color-gray-900)',
          800: 'var(--color-gray-800)',
          700: 'var(--color-gray-700)',
          600: 'var(--color-gray-600)',
          500: 'var(--color-gray-500)',
          400: 'var(--color-gray-400)',
        },
        brand: {
          50: '#f5f3ff',
          100: '#ede9fe',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          900: '#4c1d95',
        }
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'progress-stripes': 'progress-stripes 1s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'progress-stripes': {
          from: { backgroundPosition: '1rem 0' },
          to: { backgroundPosition: '0 0' },
        }
      }
    },
  },
  plugins: [],
}
