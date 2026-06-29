import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#f8f4ec',
        ink: '#40362d',
        mist: '#dce8e2',
        clay: '#d8a48f',
        sage: '#9bb8a7',
        lake: '#8fb7c7',
        rose: '#e8b7bd',
      },
      boxShadow: {
        soft: '0 18px 45px rgba(85, 69, 51, 0.12)',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
