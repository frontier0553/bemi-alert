import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          base:     '#08080f',
          card:     '#0f0f1e',
          elevated: '#16162a',
          hover:    '#1c1c35',
        },
        edge: {
          subtle: '#222240',
          medium: '#2d2d55',
        },
        ink: {
          primary:   '#e0e0f0',
          secondary: '#7878a0',
          ghost:     '#4a4a70',
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
