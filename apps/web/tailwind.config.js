/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0E1B2C",
        ivory: "#F6F3EC",
        gold: "#C9A24A",
        "gold-dark": "#8A6A1F",
        danger: "#B42318",
        success: "#127A4B",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        urdu: ["Noto Nastaliq Urdu", "serif"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "16px",
      },
      boxShadow: {
        soft: "0 1px 2px rgba(14, 27, 44, 0.04), 0 8px 24px rgba(14, 27, 44, 0.06)",
      },
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [],
};
