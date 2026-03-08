/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        netflixRed: '#E50914',
        netflixDark: '#141414',
        netflixGray: '#2F2F2F',
        netflixLightGray: '#e5e5e5',
      },
      fontFamily: {
        heading: ['Bebas Neue', 'cursive'],
        body: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-to-b': 'linear-gradient(to bottom, rgba(20,20,20,0) 0%, rgba(20,20,20,1) 100%)',
      }
    },
  },
  plugins: [],
}