import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem"
      },
      colors: {
        border: "hsl(214.3 31.8% 91.4%)",
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
