import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // RAME core design tokens (default demo: "Jelajah Kota Tua" — heritage night)
        // Event identity dapat menimpa token ini via CSS variables di data event
        ink: "rgb(var(--rame-ink) / <alpha-value>)",
        paper: "rgb(var(--rame-paper) / <alpha-value>)",
        brand: {
          DEFAULT: "rgb(var(--rame-brand) / <alpha-value>)",
          soft: "rgb(var(--rame-brand-soft) / <alpha-value>)",
          ink: "rgb(var(--rame-brand-ink) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--rame-accent) / <alpha-value>)",
          soft: "rgb(var(--rame-accent-soft) / <alpha-value>)",
        },
        gold: "rgb(var(--rame-gold) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        stamp: "1.25rem",
      },
      boxShadow: {
        lift: "0 10px 30px -12px rgb(0 0 0 / 0.25)",
        stamp: "0 6px 0 -2px rgb(0 0 0 / 0.12)",
      },
      keyframes: {
        "stamp-pop": {
          "0%": { transform: "scale(0.4) rotate(-14deg)", opacity: "0" },
          "60%": { transform: "scale(1.12) rotate(4deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        "fade-up": {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "shake-x": {
          "0%,100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-6px)" },
          "75%": { transform: "translateX(6px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "stamp-pop": "stamp-pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "fade-up": "fade-up 0.5s ease both",
        "shake-x": "shake-x 0.3s ease both",
        marquee: "marquee 30s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
