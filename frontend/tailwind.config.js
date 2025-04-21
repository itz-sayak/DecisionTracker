/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ios-blue': '#007AFF',
        'ios-gray': '#F2F2F7',
        'ios-dark': '#1C1C1E',
      },
    },
  },
  plugins: [],
} 