/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0a1628',
          50: '#0d1d35',
          100: '#0f2240',
          200: '#122a50',
          300: '#163360',
          400: '#1a3d74',
        },
        amber: {
          DEFAULT: '#f5a623',
          light: '#fbbe56',
          dark: '#d48c0e',
        },
        surface: {
          DEFAULT: '#111f38',
          muted: '#0e1a30',
          border: '#1e3358',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [],
}
