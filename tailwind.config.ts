import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Mobile-first, high-contrast palette tuned for one-handed use.
        brand: {
          DEFAULT: "#16a34a", // green-600 — "money in control"
          dark: "#15803d",
        },
      },
    },
  },
  plugins: [],
};

export default config;
