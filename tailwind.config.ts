import type { Config } from "tailwindcss";

// Two accents with two jobs: saffron = "do something" (buttons, discounts),
// leaf = "your money" (profit, balances). Never swap them.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ek: {
          forest: "#134024",
          dark: "#0c2817",
          green: "#169443",
          bright: "#1ba34e",
          whatsapp: "#25D366",
          red: "#E53935",
          gold: "#FFA000",
          soft: "#F4F7F5",
        },
        saffron: { 50: "#FFF4EC", 100: "#FFE4D0", 400: "#FF8A3D", 500: "#F26A1B", 600: "#D4540C", 700: "#A83F08" },
        leaf: { 50: "#E9F7F0", 100: "#CDEEDD", 500: "#16A06B", 600: "#0F8A5A", 700: "#0B6B46" },
        ink: { DEFAULT: "#1C2127", soft: "#4A535C", faint: "#6B747D" },
        canvas: "#F3F5F7",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
