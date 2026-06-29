import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#fff7f8',
        ink: '#252236',
        mist: '#fff0f3',
        clay: '#f08aa6',
        sage: '#5db98b',
        lake: '#5f8ee8',
        rose: '#ef7193',
        violet: '#f08aa6',
        violetMist: '#ffe8ee',
      },
      boxShadow: {
        soft: '0 16px 36px rgba(218, 116, 139, 0.12)',
        lift: '0 22px 55px rgba(218, 116, 139, 0.15)',
        avatar: '0 10px 24px rgba(239, 113, 147, 0.18)',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
