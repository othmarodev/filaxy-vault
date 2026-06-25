/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          violet: "#7c3aed",
          sky: "#0ea5e9",
        },
      },
      backgroundImage: {
        "brand-grad": "linear-gradient(135deg, #7c3aed 0%, #0ea5e9 100%)",
      },
    },
  },
  plugins: [],
};
