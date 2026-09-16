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
        // segundo elo da marca Giro — ver brand/giro-identity.html
        giroteal: {
          50: "#eafaf7", 100: "#cdf1ea", 200: "#9ce3d5",
          300: "#65cebb", 400: "#35ac9c", 500: "#1a8c7f",
          600: "#0f6e66", 700: "#0e5852", 800: "#0f4643",
          900: "#0f3a38",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
