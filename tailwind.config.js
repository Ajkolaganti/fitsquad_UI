/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        /** Pacer-inspired marketing / app shell (light, fresh green) */
        pacer: {
          cream: "#eef4ef",
          mist: "#f6faf7",
          ink: "#14221a",
          muted: "#5c6d63",
          border: "#d4e5dc",
          primary: "#0d9f6e",
          "primary-hover": "#0b8a5f",
          mint: "#d8f0e4",
          leaf: "#1a7f55",
          sky: "#e3f4f9",
        },
        ink: {
          950: "#0A0A0B",
          900: "#141416",
          800: "#1C1C1E",
          700: "#2C2C2E",
          600: "#3A3A3C",
        },
        mint: {
          400: "#34D399",
          500: "#30D158",
          600: "#22C55E",
        },
        space: {
          950: "#000000",
          900: "#0A0A0B",
          800: "#141416",
          700: "#1C1C1E",
          600: "#2C2C2E",
          500: "#3A3A3C",
        },
        ember: {
          400: "#FF9F0A",
          500: "#FF9500",
          600: "#E68600",
        },
        apple: {
          blue: "#0A84FF",
          "blue-hover": "#409CFF",
          green: "#30D158",
          orange: "#FF9F0A",
          pink: "#FF375F",
          purple: "#BF5AF2",
          yellow: "#FFD60A",
          red: "#FF453A",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "sans-serif"],
        display: [
          "var(--font-display)",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      boxShadow: {
        glass: "0 8px 32px rgba(20, 34, 26, 0.08)",
        "glass-sm": "0 4px 24px rgba(20, 34, 26, 0.06)",
        nav: "0 -1px 0 rgba(20, 34, 26, 0.06), 0 -8px 32px rgba(20, 34, 26, 0.08)",
        ring: "0 0 0 1px rgba(20, 34, 26, 0.06) inset",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 4s ease-in-out infinite",
        shimmer: "shimmer 2.5s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { opacity: "0.5" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0.5" },
        },
      },
      borderRadius: {
        "4xl": "1.75rem",
        "5xl": "2rem",
      },
    },
  },
  plugins: [],
};
