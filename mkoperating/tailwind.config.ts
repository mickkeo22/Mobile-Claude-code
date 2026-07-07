import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand system captured from the live mkoperating.com
        ink: {
          DEFAULT: '#13212E', // dark navy — headings, dark panels
          700: '#1D3040',
          600: '#274056',
        },
        paper: {
          DEFAULT: '#F6F5F2', // warm off-white page background
          200: '#EDEBE5', // slightly darker panel
        },
        signal: {
          DEFAULT: '#E5A100', // amber CTA
          600: '#C78C00',
          700: '#A87600', // accessible on light backgrounds
        },
        slatey: '#576169',
        // Audit bucket colors (from live app)
        bucket: {
          ghl: '#1F6F4F',
          ghlTint: '#E7F2EC',
          plugin: '#2563EB',
          pluginTint: '#E8EEFB',
          build: '#7C3AED',
          buildTint: '#F0E9FB',
        },
      },
      fontFamily: {
        display: ['var(--font-archivo)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'bar-sweep': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'bar-sweep': 'bar-sweep 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
