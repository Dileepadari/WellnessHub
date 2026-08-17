/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Every colour resolves to a CSS variable defined in index.css, so light
      // and dark are one palette with two value sets rather than two designs.
      colors: {
        bg: {
          DEFAULT: 'hsl(var(--bg))',
          sunken: 'hsl(var(--bg-sunken))',
          raised: 'hsl(var(--bg-raised))',
          hover: 'hsl(var(--bg-hover))',
          active: 'hsl(var(--bg-active))'
        },
        fg: {
          DEFAULT: 'hsl(var(--fg))',
          muted: 'hsl(var(--fg-muted))',
          subtle: 'hsl(var(--fg-subtle))'
        },
        line: {
          DEFAULT: 'hsl(var(--line))',
          strong: 'hsl(var(--line-strong))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          fg: 'hsl(var(--accent-fg))',
          subtle: 'hsl(var(--accent-subtle))'
        },
        good: 'hsl(var(--good))',
        warn: 'hsl(var(--warn))',
        bad: 'hsl(var(--bad))'
      },
      fontFamily: {
        mono: 'var(--font-mono)'
      },
      borderRadius: {
        DEFAULT: '3px'
      }
    }
  },
  plugins: []
};
