/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        rappi: {
          50: '#fff4ed',
          100: '#ffe5d4',
          500: '#FF4F00',
          600: '#e54700',
          900: '#7a2800'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

