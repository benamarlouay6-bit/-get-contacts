/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08111f",
        mist: "#eef4ff",
        glow: "#d9f99d",
        ocean: "#38bdf8",
        coral: "#fb7185",
      },
      boxShadow: {
        panel: "0 20px 60px rgba(8, 17, 31, 0.18)",
      },
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
