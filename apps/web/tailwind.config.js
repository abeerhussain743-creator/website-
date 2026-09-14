/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0c1222",
          900: "#121a2f",
          800: "#1a2540",
          700: "#243152",
          500: "#5b6b8c",
          300: "#a8b3c7",
          100: "#e8edf5",
        },
        accent: {
          DEFAULT: "#0f766e",
          soft: "#14b8a6",
          muted: "#ccfbf1",
        },
        sand: {
          50: "#f7f5f1",
          100: "#efeae2",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px rgba(12, 18, 34, 0.08)",
      },
    },
  },
  plugins: [],
};
