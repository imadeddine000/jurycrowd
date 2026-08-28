/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // shadcn semantic (theme-aware via CSS vars)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          active: 'hsl(var(--primary-active))',
          disabled: 'hsl(var(--primary-disabled))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // DESIGN.md surfaces (theme-aware)
        canvas: 'hsl(var(--canvas))',
        'surface-soft': 'hsl(var(--surface-soft))',
        'surface-card': 'hsl(var(--surface-card))',
        'surface-cream-strong': 'hsl(var(--surface-cream-strong))',
        'surface-dark': 'hsl(var(--surface-dark))',
        'surface-dark-elevated': 'hsl(var(--surface-dark-elevated))',
        'surface-dark-soft': 'hsl(var(--surface-dark-soft))',
        hairline: 'hsl(var(--hairline))',
        'hairline-soft': 'hsl(var(--hairline-soft))',
        // DESIGN.md text (theme-aware)
        ink: 'hsl(var(--ink))',
        'body-strong': 'hsl(var(--body-strong))',
        body: 'hsl(var(--body))',
        'muted-ink': 'hsl(var(--muted-ink))',
        'muted-soft-ink': 'hsl(var(--muted-soft-ink))',
        'on-dark': 'hsl(var(--on-dark))',
        'on-dark-soft': 'hsl(var(--on-dark-soft))',
        // DESIGN.md brand / accent (constant)
        coral: 'hsl(var(--coral))',
        'coral-active': 'hsl(var(--coral-active))',
        'coral-disabled': 'hsl(var(--coral-disabled))',
        teal: 'hsl(var(--teal))',
        amber: 'hsl(var(--amber))',
        // DESIGN.md semantic (constant)
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        error: 'hsl(var(--error))',
      },
      borderRadius: {
        xs: '4px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        pill: '9999px',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['Fraunces', 'Tiempos Headline', 'Garamond', 'Times New Roman', 'serif'],
        mono: ['JetBrains Mono', 'Berkeley Mono', 'monospace'],
      },
      fontSize: {
        'display-xl': ['3.5rem', { lineHeight: '1.05', letterSpacing: '-0.0938rem', fontWeight: '400' }],
        'display-lg': ['3rem', { lineHeight: '1.1', letterSpacing: '-0.0625rem', fontWeight: '400' }],
        'display-md': ['2.25rem', { lineHeight: '1.15', letterSpacing: '-0.0313rem', fontWeight: '400' }],
        'display-sm': ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.0188rem', fontWeight: '400' }],
        'title-lg': ['1.375rem', { lineHeight: '1.3', fontWeight: '500' }],
        'title-md': ['1.125rem', { lineHeight: '1.4', fontWeight: '500' }],
        'title-sm': ['1rem', { lineHeight: '1.4', fontWeight: '500' }],
        'body-md': ['1rem', { lineHeight: '1.55', fontWeight: '400' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'caption': ['0.8125rem', { lineHeight: '1.4', fontWeight: '500' }],
        'caption-uppercase': ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.0938rem', fontWeight: '500' }],
        'nav-link': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],
        'button': ['0.875rem', { lineHeight: '1.4', fontWeight: '500' }],
        'code': ['0.8125rem', { lineHeight: '1.5', fontWeight: '400' }],
      },
      spacing: {
        section: '6rem', // 96px
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(20,20,19,0.08)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
