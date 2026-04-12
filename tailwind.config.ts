import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Tailwind compat ─────────────────────────────────────
        background: "var(--background)",
        foreground: "var(--foreground)",
        // ─── Houspire brand ──────────────────────────────────────
        brand: {
          DEFAULT: "var(--brand)",
          light:   "var(--brand-light)",
          mid:     "var(--brand-mid)",
          dark:    "var(--brand-dark)",
          glow:    "var(--brand-glow)",
        },
        // ─── Surfaces ────────────────────────────────────────────
        surface: {
          DEFAULT: "var(--surface)",
          2:       "var(--surface-2)",
          3:       "var(--surface-3)",
        },
        // ─── Borders ─────────────────────────────────────────────
        edge: {
          DEFAULT: "var(--border)",
          strong:  "var(--border-strong)",
          focus:   "var(--border-focus)",
        },
        // ─── Text ────────────────────────────────────────────────
        ink: {
          DEFAULT: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          muted:   "var(--text-muted)",
          inverse: "var(--text-inverse)",
        },
        // ─── Sidebar ─────────────────────────────────────────────
        sidebar: {
          bg:     "var(--sidebar-bg)",
          text:   "var(--sidebar-text)",
          active: "var(--sidebar-active)",
        },
      },
      boxShadow: {
        xs:  "var(--shadow-xs)",
        card: "var(--shadow-sm)",
        md:  "var(--shadow-md)",
        lg:  "var(--shadow-lg)",
        xl:  "var(--shadow-xl)",
      },
      borderRadius: {
        sm:  "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md:  "var(--radius-md)",
        lg:  "var(--radius-lg)",
        xl:  "var(--radius-xl)",
      },
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }],
        "3xs": ["0.625rem",  { lineHeight: "0.875rem" }],
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34,1.56,0.64,1)",
        ease:   "cubic-bezier(0.2,0,0,1)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.97)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in":  "fade-in  0.2s cubic-bezier(0.2,0,0,1) both",
        "scale-in": "scale-in 0.15s cubic-bezier(0.2,0,0,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
