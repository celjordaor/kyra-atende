import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* ── Cores mapeadas nos tokens CSS ── */
      colors: {
        brand:        'var(--brand)',
        'brand-hover': 'var(--brand-hover)',
        'brand-active':'var(--brand-active)',
        'brand-dim':  'var(--brand-dim)',
        'brand-faint':'var(--brand-faint)',

        green:        'var(--green)',
        'green-hover':'var(--green-hover)',
        orange:       'var(--orange)',
        'orange-hover':'var(--orange-hover)',
        red:          'var(--red)',
        'red-hover':  'var(--red-hover)',

        ink:          'var(--ink)',
        'ink-body':   'var(--ink-body)',
        'ink-soft':   'var(--ink-soft)',
        muted:        'var(--muted)',
        subtle:       'var(--subtle)',

        border:       'var(--border)',
        'border-mid': 'var(--border-mid)',

        surface:      'var(--surface)',
        'surface-2':  'var(--surface-2)',
        'surface-3':  'var(--surface-3)',
      },

      /* ── Fontes ── */
      fontFamily: {
        ui:         ['Inter', 'system-ui', 'sans-serif'],
        'mono-warm':['DM Mono', 'Courier New', 'monospace'],
        'mono-data':['Roboto Mono', 'Courier New', 'monospace'],
      },

      /* ── Border radius mapeados nos tokens ── */
      borderRadius: {
        DEFAULT: 'var(--r)',
        md:      'var(--r-md)',
        lg:      'var(--r-lg)',
        full:    '9999px',
      },

      /* ── Escala de espaçamento (múltiplos de 4px) ── */
      spacing: {
        xs:  'var(--space-xs)',
        sm:  'var(--space-sm)',
        md:  'var(--space-md)',
        lg:  'var(--space-lg)',
        xl:  'var(--space-xl)',
        '2xl':'var(--space-2xl)',
        '3xl':'var(--space-3xl)',
        '4xl':'var(--space-4xl)',
      },

      /* ── Escala tipográfica ── */
      fontSize: {
        'body-lg':  ['16px', { lineHeight: '1.5',  fontWeight: '400' }],
        'body':     ['14px', { lineHeight: '1.5',  fontWeight: '400' }],
        'body-sm':  ['12px', { lineHeight: '1.4',  fontWeight: '400' }],
        'label':    ['14px', { lineHeight: '1.4',  fontWeight: '500', letterSpacing: '0.5px' }],
        'label-sm': ['12px', { lineHeight: '1.3',  fontWeight: '500', letterSpacing: '0.4px' }],
        'caption':  ['11px', { lineHeight: '1.4',  fontWeight: '400' }],
        'h1':       ['32px', { lineHeight: '1.2',  fontWeight: '600', letterSpacing: '-0.5px' }],
        'h2':       ['28px', { lineHeight: '1.3',  fontWeight: '600', letterSpacing: '-0.3px' }],
        'h3':       ['24px', { lineHeight: '1.35', fontWeight: '600' }],
        'h4':       ['20px', { lineHeight: '1.4',  fontWeight: '600' }],
        'h5':       ['18px', { lineHeight: '1.45', fontWeight: '600' }],
        'h6':       ['16px', { lineHeight: '1.5',  fontWeight: '600' }],
      },

      /* ── Box shadow ── */
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        md:   '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
        lg:   '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}

export default config
