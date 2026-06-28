/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Hyphenated names for class usage: status-success, status-success-bg, etc.
        "status-success": "hsl(var(--status-success))",
        "status-success-bg": "hsl(var(--status-success-bg))",
        "status-warning": "hsl(var(--status-warning))",
        "status-warning-bg": "hsl(var(--status-warning-bg))",
        "status-error": "hsl(var(--status-error))",
        "status-error-bg": "hsl(var(--status-error-bg))",
        // Also keep camelCase aliases for backward compat
        status: {
          success: "hsl(var(--status-success))",
          successBg: "hsl(var(--status-success-bg))",
          warning: "hsl(var(--status-warning))",
          warningBg: "hsl(var(--status-warning-bg))",
          error: "hsl(var(--status-error))",
          errorBg: "hsl(var(--status-error-bg))",
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};
