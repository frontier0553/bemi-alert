import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base:     '#06080d',
          card:     '#0d0f14',
          elevated: '#13161c',
          hover:    '#191d25',
        },
        edge: {
          subtle: '#1e2128',
          medium: '#272c36',
        },
        ink: {
          primary:   '#e4e4e7',
          secondary: '#71717a',
          ghost:     '#52525b',
        },
        pump:   '#00e676',
        dump:   '#ff4757',
        mix:    '#f59e0b',
        signal: '#6c63ff',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1',   transform: 'scale(1)'   },
          '50%':      { opacity: '0.4', transform: 'scale(0.8)' },
        },
      },
      animation: {
        blink: 'blink 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
