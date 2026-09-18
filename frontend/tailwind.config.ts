import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm, student-friendly brand palette used across the app.
        brand: {
          50: "#f2f7ff",
          100: "#e0edff",
          200: "#b9d9ff",
          300: "#8cc0ff",
          400: "#5aa3ff",
          500: "#2f7dfb",
          600: "#1c5fdb",
          700: "#1849ac",
          800: "#163b85",
          900: "#152f66",
        },
        saffron: {
          400: "#ffb347",
          500: "#ff9f1c",
        },
      },
      fontSize: {
        // Ensure a comfortably readable base size on mobile.
        base: ["1rem", "1.6"],
      },
      spacing: {
        // Generous touch target helper (min 44px recommended tap size).
        touch: "2.75rem",
      },
    },
  },
  plugins: [],
};

export default config;
