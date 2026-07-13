import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          light: '#dbeafe',
          dark: '#1d4ed8',
        },
        muted: '#6b7280',
        border: '#e5e7eb',
        error: '#ef4444',
        success: '#22c55e',
        warning: '#eab308',
      },
    },
  },
  plugins: [],
};

export default config;
