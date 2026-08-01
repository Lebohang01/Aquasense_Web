/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg0:    '#0a0e1a',
        bg1:    '#0f1525',
        bg2:    '#151c30',
        bg3:    '#1c2540',
        border: '#1e2d47',
        blue:   '#3b82f6',
        blight: '#60a5fa',
        green:  '#22c55e',
        red:    '#ef4444',
        amber:  '#f59e0b',
        purple: '#8b5cf6',
        cyan:   '#06b6d4',
        t0:     '#f1f5f9',
        t1:     '#94a3b8',
        t2:     '#475569',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'fade-in':    'fadeIn 0.3s ease-in',
      },
      keyframes: {
        fadeIn: { '0%':{ opacity:0, transform:'translateY(4px)' }, '100%':{ opacity:1, transform:'translateY(0)' } },
      },
    },
  },
  plugins: [],
};
