/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'void-base': '#0e0918',
        'elevated-surface': '#1a1624',
        'deep-panel': '#1b1728',
        'muted-shell': '#2c2834',
        'border-smoke': '#3e3a46',
        'ash-text': '#d1cece',
        'fog-text': '#9d9797',
        'silver-rail': '#e5e7eb',
        'cloud-white': '#ffffff',
        'steel-muted': '#48556a',
        'electric-cyan': '#17baed',
        'electric-cyan-hover': '#1ad2ff',
        'dark-teal': '#081a26',
        'teal-slate': '#16222b',
        'teal-slate-border': 'rgba(23, 186, 237, 0.35)',
        'ember-cta': '#fd8925',
        'ember-scorch': '#ff492c',
        'crimson-glow': '#56312d',
      },
      backgroundImage: {
        'electric-gradient': 'linear-gradient(141deg, rgb(7, 122, 199), rgb(107, 33, 239))',
        'atmospheric-glow': 'radial-gradient(126.99% 234.27% at 10.15% 142.35%, rgba(217,126,75,0.133) 0%, rgba(255,255,255,0) 37%)',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'cards': '16px',
        'cards-lg': '24px',
        'nodes': '12px',
        'pills': '9999px',
        'badges': '24px',
        'inputs': '8px',
        'buttons': '8px',
      },
      boxShadow: {
        'subtle-glow': 'rgba(255, 255, 255, 0.08) 0px 0px 0px 1px inset, rgba(23, 186, 237, 0.25) 0px 1px 0px 0px inset',
        'cyan-glow': '0 0 20px rgba(23, 186, 237, 0.4)',
        'frosted': 'rgba(0, 0, 0, 0.35) 0px 4px 12px 0px',
      }
    },
  },
  plugins: [],
}
