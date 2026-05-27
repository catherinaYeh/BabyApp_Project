import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        allergy: {
          low: '#4ADE80',
          medium: '#FACC15',
          high: '#F87171',
        },
        status: {
          untried: '#E5E7EB',
          trying: '#FDE68A',
          unlocked: '#86EFAC',
          allergic: '#FCA5A5',
        },
        brand: {
          DEFAULT: '#FF7AA2',
          dark: '#E45D87',
        },
        accent: {
          game: '#FFD580',
        },
      },
      fontFamily: {
        sans: ['Noto Sans TC', 'system-ui', 'sans-serif'],
        num: ['Manrope', 'Noto Sans TC', 'sans-serif'],
      },
      maxWidth: {
        mobile: '480px',
      },
      boxShadow: {
        fab: '0 8px 20px -4px rgba(255, 122, 162, 0.5)',
      },
    },
  },
  plugins: [],
};

export default config;
