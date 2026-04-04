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
        background: "var(--background)",
        foreground: "var(--foreground)",
        "bg-primary": "var(--bg-primary)",
        "bg-surface": "var(--bg-surface)",
        "bg-elevated": "var(--bg-elevated)",
        border: "var(--border)",
        "border-active": "var(--border-active)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "focus-active": "var(--focus-active)",
        "focus-paused": "var(--focus-paused)",
        "focus-complete": "var(--focus-complete)",
        danger: "var(--danger)",
        success: "var(--success)",
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
        timer: ["var(--font-share-tech)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "timer-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.92" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
