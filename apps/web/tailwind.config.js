/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        'ink-3': 'var(--ink-3)',
        accent: 'var(--accent)',
        'accent-soft': 'var(--accent-soft)',
        success: 'var(--success)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        info: 'var(--info)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
        pill: '999px',
      },
      boxShadow: {
        pop: 'var(--shadow-pop)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
        serif: ['var(--font-serif)'],
      },
      fontSize: {
        meta: ['12px', { lineHeight: '16px' }],
        small: ['13px', { lineHeight: '20px' }],
        body: ['14px', { lineHeight: '22px' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        h3: ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        h2: ['28px', { lineHeight: '34px', letterSpacing: '-0.01em' }],
        h1: ['44px', { lineHeight: '48px', letterSpacing: '-0.01em' }],
        display: ['56px', { lineHeight: '60px', letterSpacing: '-0.02em' }],
        label: ['11px', { lineHeight: '16px', letterSpacing: '0.04em' }],
      },
    },
  },
  plugins: [],
};
