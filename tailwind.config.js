/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#1b2a22',
          800: '#23372c',
          700: '#324a3d',
          600: '#466253',
          500: '#627e6f',
          400: '#869e91',
          300: '#b0c2b7',
          200: '#d7e2da',
          100: '#edf3ef',
          50: '#f6f9f7',
        },
        sage: {
          deep: '#1c4232',
          primary: '#245a44',
          light: '#e9f3ec',
          subtle: '#f4f8f5',
        },
        amberMode: {
          bg: '#fffaf0',
          border: '#f6d89b',
          text: '#97611a',
          badge: '#faecd0',
        },
        violetMode: {
          bg: '#f8f5fd',
          border: '#d3c5ee',
          text: '#684a9e',
          badge: '#ede6fb',
        },
        roseMode: {
          bg: '#fdf6f5',
          border: '#f2cac4',
          text: '#a04d45',
          badge: '#fae3df',
        }
      },
      fontFamily: {
        serif: ['"Nanum Myeongjo"', 'Georgia', 'serif'],
        sans: ['"Pretendard"', '"Noto Sans KR"', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
