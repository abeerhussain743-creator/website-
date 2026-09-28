/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#F4F7F7",
          100: "#E4EBEB",
          200: "#C5D3D3",
          300: "#9BB3B3",
          400: "#6F8F8F",
          500: "#4F7272",
          600: "#3C5A5A",
          700: "#2F4646",
          800: "#1F2F2F",
          900: "#14201F",
          950: "#0B1313",
        },
        ember: {
          400: "#F0A04B",
          500: "#E08A2E",
          600: "#C56E1A",
        },
        foam: {
          50: "#F7FBFA",
          100: "#EEF6F4",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-mesh":
          "radial-gradient(1200px 600px at 10% -10%, rgba(224,138,46,0.22), transparent 55%), radial-gradient(900px 500px at 90% 0%, rgba(79,114,114,0.35), transparent 50%), linear-gradient(165deg, #0B1313 0%, #14201F 45%, #1F2F2F 100%)",
        "app-grain":
          "radial-gradient(800px 400px at 0% 0%, rgba(224,138,46,0.06), transparent 50%), radial-gradient(700px 360px at 100% 0%, rgba(79,114,114,0.08), transparent 45%)",
      },
      boxShadow: {
        soft: "0 10px 40px rgba(11, 19, 19, 0.12)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};
