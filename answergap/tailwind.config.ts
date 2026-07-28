import type { Config } from 'tailwindcss'

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 950: '#07090d', 900: '#0b0e14', 850: '#10141c', 800: '#161b26', 700: '#222836', 600: '#333b4d' },
        pulse: { 300: '#7ee3c0', 400: '#3ed3a3', 500: '#16b886', 600: '#0e9670' },
        flare: { 300: '#ffb4a2', 400: '#ff8a6b', 500: '#f2653f' },
        amberish: { 400: '#f5c451', 500: '#e0a92e' },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      boxShadow: {
        lift: '0 1px 0 0 rgba(255,255,255,.04) inset, 0 20px 50px -20px rgba(0,0,0,.75)',
      },
    },
  },
  plugins: [],
} satisfies Config
