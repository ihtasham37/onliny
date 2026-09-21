/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50: '#f0f9f9',
          100: '#dcf0f1',
          200: '#bce1e3',
          300: '#8dc6cb',
          400: '#5ba3ad',
          500: '#418791',
          600: '#386f7a',
          700: '#325b65',
          800: '#2f4c55',
          900: '#2a4149',
          950: '#182a31',
        },
      },
    },
  },
  plugins: [],
}
