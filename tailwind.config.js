/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx,svg}",
    "./index.html",
    "./src/assets/**/*.{svg,png,jpg,jpeg,gif}", // Add this line to include image files
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}