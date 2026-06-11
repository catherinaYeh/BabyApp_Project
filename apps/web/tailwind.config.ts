import type { Config } from 'tailwindcss';

/** 色票一律指向 themes.css 的 CSS 變數，data-theme 切換整組換色。 */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: { DEFAULT: v('--c-cream'), card: v('--c-cream-card'), deep: v('--c-cream-deep') },
        bark: { DEFAULT: v('--c-bark'), soft: v('--c-bark-soft'), faded: v('--c-bark-faded') },
        terracotta: {
          DEFAULT: v('--c-terracotta'),
          dark: v('--c-terracotta-dark'),
          soft: v('--c-terracotta-soft'),
        },
        sage: { DEFAULT: v('--c-sage'), dark: v('--c-sage-dark'), soft: v('--c-sage-soft') },
        mustard: {
          DEFAULT: v('--c-mustard'),
          dark: v('--c-mustard-dark'),
          soft: v('--c-mustard-soft'),
        },
        blush: { DEFAULT: v('--c-blush'), dark: v('--c-blush-dark'), soft: v('--c-blush-soft') },
        status: {
          untried: v('--c-status-untried'),
          trying: v('--c-mustard-soft'),
          unlocked: v('--c-sage-soft'),
          allergic: v('--c-blush-soft'),
        },
      },
      fontFamily: {
        // Serif headlines: Fraunces (Latin) + Noto Serif TC (Chinese)
        serif: ['Fraunces', 'Noto Serif TC', 'Georgia', 'serif'],
        // Rounded body sans: Quicksand (Latin) + Noto Sans TC (Chinese)
        sans: ['Quicksand', 'Noto Sans TC', 'system-ui', 'sans-serif'],
        // Numerals
        num: ['Fraunces', 'Manrope', 'Noto Sans TC', 'sans-serif'],
      },
      maxWidth: {
        mobile: '480px',
      },
      boxShadow: {
        fab: 'var(--shadow-fab)',
        paper: 'var(--shadow-card)',
        ribbon: 'var(--shadow-ribbon)',
      },
      borderRadius: {
        '4xl': '2.25rem',
      },
    },
  },
  plugins: [],
};

export default config;
