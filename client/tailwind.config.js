/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gray: {
          100: '#ffffff',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#7a8796',
          600: '#6b7a8b',
          700: '#5c6d7e',
          800: '#ffffff',
          900: '#2F3F50',
        },
      },
      borderWidth: {
        DEFAULT: '1.5px',
      }
    }
  }
}
