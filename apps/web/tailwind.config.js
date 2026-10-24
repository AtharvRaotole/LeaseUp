/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
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
        'ink-4': 'var(--ink-4)',
        accent: 'var(--accent)',
        'accent-muted': 'var(--accent-muted)',
        'accent-soft': 'var(--accent-soft)',
        'on-accent': 'var(--on-accent)',
        success: 'var(--success)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        royal: 'var(--royal-line)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
        control: 'var(--radius-control)',
        pill: '999px',
      },
      boxShadow: {
        pop: 'var(--shadow-pop)',
        card: 'var(--shadow-card)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
      },
      maxWidth: {
        content: '1040px',
      },
      fontSize: {
        caption: ['11px', { lineHeight: '16px', letterSpacing: '0.06em' }],
        label: ['11px', { lineHeight: '16px', letterSpacing: '0.08em' }],
        meta: ['12px', { lineHeight: '18px', letterSpacing: '0.01em' }],
        small: ['13px', { lineHeight: '20px', letterSpacing: '0' }],
        body: ['14px', { lineHeight: '22px', letterSpacing: '0' }],
        'body-lg': ['15px', { lineHeight: '24px', letterSpacing: '-0.005em' }],
        h3: ['22px', { lineHeight: '28px', letterSpacing: '-0.02em' }],
        h2: ['30px', { lineHeight: '36px', letterSpacing: '-0.025em' }],
        title: ['32px', { lineHeight: '38px', letterSpacing: '-0.025em' }],
        h1: ['40px', { lineHeight: '44px', letterSpacing: '-0.03em' }],
        display: ['48px', { lineHeight: '52px', letterSpacing: '-0.03em' }],
      },
    },
  },
  plugins: [],
};
