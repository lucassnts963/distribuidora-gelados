import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff8ed", 100: "#ffefd4", 200: "#ffdaa8",
          300: "#ffbf71", 400: "#ff9838", 500: "#ff7a11",
          600: "#f05d06", 700: "#c74507", 800: "#9e370e",
          900: "#7f300f",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
