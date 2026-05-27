import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Storybook palette
        cream: {
          DEFAULT: '#FBF6E9', // page bg
          card: '#FFFCF3', // raised paper
          deep: '#F2EAD3', // muted cream
        },
        bark: {
          DEFAULT: '#4A3528', // primary text (warm brown)
          soft: '#7A6354', // secondary text
          faded: '#B5A493', // tertiary / borders
        },
        terracotta: {
          DEFAULT: '#D67D5C', // brand / primary action
          dark: '#B96342',
          soft: '#F1C8B7',
        },
        sage: {
          DEFAULT: '#9CAF88', // unlocked / success
          dark: '#7A8E69',
          soft: '#D4E1C5',
        },
        mustard: {
          DEFAULT: '#E0AC4C', // progress / trying
          dark: '#B98724',
          soft: '#F6E3B7',
        },
        blush: {
          DEFAULT: '#E8A89A', // allergic
          dark: '#C77866',
          soft: '#F7D9D2',
        },

        // Allergy risk uses storybook earth tones
        allergy: {
          low: '#9CAF88', // sage
          medium: '#E0AC4C', // mustard
          high: '#C77866', // blush dark
        },
        // Trial status chips
        status: {
          untried: '#E8DDC9', // warm gray paper
          trying: '#F6E3B7', // butter
          unlocked: '#D4E1C5', // sage soft
          allergic: '#F7D9D2', // blush soft
        },

        // Legacy aliases kept to avoid touching every file in one go.
        brand: {
          DEFAULT: '#D67D5C',
          dark: '#B96342',
        },
        accent: {
          game: '#E0AC4C',
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
        fab: '0 8px 22px -6px rgba(214, 125, 92, 0.55)',
        paper: '0 1px 0 rgba(74, 53, 40, 0.06), 0 8px 20px -12px rgba(74, 53, 40, 0.18)',
        ribbon: '2px 2px 0 rgba(74, 53, 40, 0.12)',
      },
      borderRadius: {
        '4xl': '2.25rem',
      },
      backgroundImage: {
        // Subtle dotted paper texture
        paper: 'radial-gradient(circle at 1px 1px, rgba(74, 53, 40, 0.06) 1px, transparent 0)',
      },
      backgroundSize: {
        paper: '14px 14px',
      },
    },
  },
  plugins: [],
};

export default config;
